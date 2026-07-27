import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, TipoDocumentoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TiposDocumentoService } from './tipos-documento.service';

describe('TiposDocumentoService', () => {
  let service: TiposDocumentoService;
  let prisma: {
    tipoDocumento: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const tipoDocumento = {
    id: 1,
    nome: 'CPF',
    status: TipoDocumentoStatus.ATIVO,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      tipoDocumento: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposDocumentoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TiposDocumentoService);
  });

  describe('create', () => {
    it('cria e retorna o tipo de documento', async () => {
      prisma.tipoDocumento.create.mockResolvedValue(tipoDocumento);

      const result = await service.create({ nome: 'CPF' });

      expect(result).toEqual(tipoDocumento);
      expect(prisma.tipoDocumento.create).toHaveBeenCalledWith({
        data: { nome: 'CPF' },
      });
    });

    it('lança ConflictException quando o nome já existe (P2002)', async () => {
      prisma.tipoDocumento.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '5.x',
        }),
      );

      await expect(service.create({ nome: 'CPF' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('retorna dados paginados apenas de tipos ativos', async () => {
      prisma.$transaction.mockResolvedValue([[tipoDocumento], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [tipoDocumento],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
      expect(prisma.tipoDocumento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: TipoDocumentoStatus.ATIVO },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retorna o tipo ativo', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(tipoDocumento);

      await expect(service.findOne(1)).resolves.toEqual(tipoDocumento);
    });

    it('lança NotFoundException quando não existe ou está removido', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('atualiza um tipo existente', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(tipoDocumento);
      prisma.tipoDocumento.update.mockResolvedValue({
        ...tipoDocumento,
        nome: 'ASO',
      });

      const result = await service.update(1, { nome: 'ASO' });

      expect(result.nome).toBe('ASO');
      expect(prisma.tipoDocumento.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nome: 'ASO' },
      });
    });

    it('lança NotFoundException ao atualizar tipo inexistente', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(null);

      await expect(service.update(99, { nome: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.tipoDocumento.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('aplica soft delete alterando o status para REMOVIDO', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(tipoDocumento);
      prisma.tipoDocumento.update.mockResolvedValue({
        ...tipoDocumento,
        status: TipoDocumentoStatus.REMOVIDO,
      });

      await service.remove(1);

      expect(prisma.tipoDocumento.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: TipoDocumentoStatus.REMOVIDO },
      });
    });

    it('lança NotFoundException ao remover tipo inexistente', async () => {
      prisma.tipoDocumento.findFirst.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.tipoDocumento.update).not.toHaveBeenCalled();
    });
  });
});
