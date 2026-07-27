import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  ColaboradorStatus,
  DocumentoStatus,
  Prisma,
  TipoDocumentoStatus,
  VinculoStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { DocumentosService } from './documentos.service';

/** Cria o erro de violação de unicidade do Prisma (P2002). */
function p2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: '5.x',
  });
}

describe('DocumentosService', () => {
  let service: DocumentosService;
  let prisma: {
    colaboradorHasDocuments: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    documento: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let colaboradoresService: { findOne: jest.Mock };

  const vinculoAtivo = {
    id: 10,
    colaboradorId: 1,
    tipoDocumentoId: 2,
    status: VinculoStatus.ATIVO,
    versaoAtualId: null as number | null,
  };

  beforeEach(async () => {
    prisma = {
      colaboradorHasDocuments: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      documento: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    colaboradoresService = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosService,
        { provide: PrismaService, useValue: prisma },
        { provide: ColaboradoresService, useValue: colaboradoresService },
      ],
    }).compile();

    service = module.get(DocumentosService);
  });

  describe('enviar', () => {
    it('cria a versão 1 e move o ponteiro do vínculo, de forma atômica', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(vinculoAtivo);
      prisma.$transaction.mockImplementation((cb) => cb(prisma));
      prisma.documento.findFirst.mockResolvedValue(null); // sem versões
      const criado = { id: 100, vinculoId: 10, numeroVersao: 1 };
      prisma.documento.create.mockResolvedValue(criado);

      const result = await service.enviar(1, 2);

      expect(result).toEqual(criado);
      expect(prisma.documento.create).toHaveBeenCalledWith({
        data: { vinculoId: 10, numeroVersao: 1 },
      });
      expect(prisma.colaboradorHasDocuments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { versaoAtualId: 100 },
      });
    });

    it('incrementa o número da versão no reenvio', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(vinculoAtivo);
      prisma.$transaction.mockImplementation((cb) => cb(prisma));
      prisma.documento.findFirst.mockResolvedValue({ numeroVersao: 2 });
      prisma.documento.create.mockResolvedValue({
        id: 101,
        vinculoId: 10,
        numeroVersao: 3,
      });

      await service.enviar(1, 2);

      expect(prisma.documento.create).toHaveBeenCalledWith({
        data: { vinculoId: 10, numeroVersao: 3 },
      });
    });

    it('lança NotFoundException quando não há vínculo ativo', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(null);

      await expect(service.enviar(1, 2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('reprocessa em caso de corrida na numeração (P2002) e conclui', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(vinculoAtivo);
      prisma.documento.findFirst.mockResolvedValue({ numeroVersao: 1 });
      prisma.documento.create.mockResolvedValue({
        id: 102,
        vinculoId: 10,
        numeroVersao: 2,
      });
      // 1ª transação falha com P2002, 2ª conclui.
      prisma.$transaction
        .mockImplementationOnce(() => Promise.reject(p2002()))
        .mockImplementationOnce((cb) => cb(prisma));

      const result = await service.enviar(1, 2);

      expect(result).toEqual({ id: 102, vinculoId: 10, numeroVersao: 2 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('lança ConflictException se a corrida persistir em todas as tentativas', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(vinculoAtivo);
      prisma.$transaction.mockImplementation(() => Promise.reject(p2002()));

      await expect(service.enviar(1, 2)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('remover', () => {
    it('marca a versão atual como REMOVIDO e faz rollback para a anterior', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue({
        ...vinculoAtivo,
        versaoAtualId: 200,
      });
      prisma.$transaction.mockImplementation((cb) => cb(prisma));
      prisma.documento.findFirst.mockResolvedValue({ id: 199 }); // versão anterior ativa

      await service.remover(1, 2);

      expect(prisma.documento.update).toHaveBeenCalledWith({
        where: { id: 200 },
        data: { status: DocumentoStatus.REMOVIDO },
      });
      expect(prisma.colaboradorHasDocuments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { versaoAtualId: 199 },
      });
    });

    it('volta o vínculo a pendente quando não há versão anterior ativa', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue({
        ...vinculoAtivo,
        versaoAtualId: 200,
      });
      prisma.$transaction.mockImplementation((cb) => cb(prisma));
      prisma.documento.findFirst.mockResolvedValue(null);

      await service.remover(1, 2);

      expect(prisma.colaboradorHasDocuments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { versaoAtualId: null },
      });
    });

    it('lança NotFoundException quando não há documento enviado', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue({
        ...vinculoAtivo,
        versaoAtualId: null,
      });

      await expect(service.remover(1, 2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listarPendentes', () => {
    it('filtra por vínculo ativo sem versão, excluindo removidos (soft delete)', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listarPendentes({ page: 1, limit: 10 });

      expect(prisma.colaboradorHasDocuments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: VinculoStatus.ATIVO,
            versaoAtualId: null,
            colaborador: { status: ColaboradorStatus.ATIVO },
            tipoDocumento: { status: TipoDocumentoStatus.ATIVO },
          }),
        }),
      );
    });

    it('aplica os filtros opcionais de colaborador e tipo', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.listarPendentes({
        page: 1,
        limit: 10,
        colaboradorId: 5,
        tipoDocumentoId: 7,
      });

      expect(prisma.colaboradorHasDocuments.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            colaboradorId: 5,
            tipoDocumentoId: 7,
          }),
        }),
      );
    });
  });

  describe('historico', () => {
    it('lista as versões do vínculo em ordem decrescente', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue({
        ...vinculoAtivo,
        versaoAtualId: 300,
      });
      const versoes = [
        { id: 300, numeroVersao: 2 },
        { id: 299, numeroVersao: 1 },
      ];
      prisma.$transaction.mockResolvedValue([versoes, 2]);

      const result = await service.historico(1, 2, { page: 1, limit: 10 });

      expect(result.data).toEqual(versoes);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        versaoAtualId: 300,
      });
    });

    it('lança NotFoundException quando não existe vínculo', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(null);

      await expect(
        service.historico(1, 2, { page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
