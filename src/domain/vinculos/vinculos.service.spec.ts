import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { VinculoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { TiposDocumentoService } from '../tipos-documento/tipos-documento.service';
import { EstadoRequisito, VinculosService } from './vinculos.service';

describe('VinculosService', () => {
  let service: VinculosService;
  let prisma: {
    colaboradorHasDocuments: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let colaboradoresService: { findOne: jest.Mock };
  let tiposDocumentoService: { findOne: jest.Mock };

  const vinculoAtivo = {
    id: 10,
    colaboradorId: 1,
    tipoDocumentoId: 2,
    status: VinculoStatus.ATIVO,
    versaoAtualId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      colaboradorHasDocuments: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    colaboradoresService = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    tiposDocumentoService = { findOne: jest.fn().mockResolvedValue({ id: 2 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VinculosService,
        { provide: PrismaService, useValue: prisma },
        { provide: ColaboradoresService, useValue: colaboradoresService },
        { provide: TiposDocumentoService, useValue: tiposDocumentoService },
      ],
    }).compile();

    service = module.get(VinculosService);
  });

  describe('vincular', () => {
    it('cria um novo vínculo quando não existe', async () => {
      prisma.colaboradorHasDocuments.findUnique.mockResolvedValue(null);
      prisma.colaboradorHasDocuments.create.mockResolvedValue(vinculoAtivo);

      const result = await service.vincular(1, { tipoDocumentoId: 2 });

      expect(result).toEqual(vinculoAtivo);
      expect(colaboradoresService.findOne).toHaveBeenCalledWith(1);
      expect(tiposDocumentoService.findOne).toHaveBeenCalledWith(2);
      expect(prisma.colaboradorHasDocuments.create).toHaveBeenCalledWith({
        data: { colaboradorId: 1, tipoDocumentoId: 2 },
      });
    });

    it('lança ConflictException quando já existe vínculo ATIVO', async () => {
      prisma.colaboradorHasDocuments.findUnique.mockResolvedValue(vinculoAtivo);

      await expect(
        service.vincular(1, { tipoDocumentoId: 2 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.colaboradorHasDocuments.create).not.toHaveBeenCalled();
      expect(prisma.colaboradorHasDocuments.update).not.toHaveBeenCalled();
    });

    it('reativa um vínculo DESVINCULADO preservando o registro', async () => {
      prisma.colaboradorHasDocuments.findUnique.mockResolvedValue({
        ...vinculoAtivo,
        status: VinculoStatus.DESVINCULADO,
      });
      prisma.colaboradorHasDocuments.update.mockResolvedValue(vinculoAtivo);

      const result = await service.vincular(1, { tipoDocumentoId: 2 });

      expect(result).toEqual(vinculoAtivo);
      expect(prisma.colaboradorHasDocuments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: VinculoStatus.ATIVO },
      });
      expect(prisma.colaboradorHasDocuments.create).not.toHaveBeenCalled();
    });
  });

  describe('desvincular', () => {
    it('aplica desvinculação lógica (status DESVINCULADO)', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(vinculoAtivo);
      prisma.colaboradorHasDocuments.update.mockResolvedValue({
        ...vinculoAtivo,
        status: VinculoStatus.DESVINCULADO,
      });

      await service.desvincular(1, 2);

      expect(prisma.colaboradorHasDocuments.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: VinculoStatus.DESVINCULADO },
      });
    });

    it('lança NotFoundException quando não há vínculo ativo', async () => {
      prisma.colaboradorHasDocuments.findFirst.mockResolvedValue(null);

      await expect(service.desvincular(1, 2)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.colaboradorHasDocuments.update).not.toHaveBeenCalled();
    });
  });

  describe('findAllByColaborador', () => {
    it('deriva o estado PENDENTE/ENVIADO a partir da versão ativa', async () => {
      const pendente = { ...vinculoAtivo, id: 10, versaoAtualId: null };
      const enviado = {
        ...vinculoAtivo,
        id: 11,
        tipoDocumentoId: 3,
        versaoAtualId: 99,
      };
      prisma.$transaction.mockResolvedValue([[pendente, enviado], 2]);

      const result = await service.findAllByColaborador(1, {
        page: 1,
        limit: 10,
      });

      expect(colaboradoresService.findOne).toHaveBeenCalledWith(1);
      expect(result.data[0].estado).toBe(EstadoRequisito.PENDENTE);
      expect(result.data[1].estado).toBe(EstadoRequisito.ENVIADO);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });
});
