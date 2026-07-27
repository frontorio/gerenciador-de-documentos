import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ColaboradorStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ColaboradoresService } from './colaboradores.service';

describe('ColaboradoresService', () => {
  let service: ColaboradoresService;
  let prisma: {
    colaborador: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const colaborador = {
    id: 1,
    nome: 'Ana',
    sobrenome: 'Silva',
    email: 'ana@example.com',
    status: ColaboradorStatus.ATIVO,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      colaborador: {
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
        ColaboradoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ColaboradoresService);
  });

  describe('create', () => {
    it('cria e retorna o colaborador', async () => {
      prisma.colaborador.create.mockResolvedValue(colaborador);

      const result = await service.create({
        nome: 'Ana',
        sobrenome: 'Silva',
        email: 'ana@example.com',
      });

      expect(result).toEqual(colaborador);
      expect(prisma.colaborador.create).toHaveBeenCalledWith({
        data: {
          nome: 'Ana',
          sobrenome: 'Silva',
          email: 'ana@example.com',
        },
      });
    });

    it('lança ConflictException quando o email já existe (P2002)', async () => {
      prisma.colaborador.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '5.x',
        }),
      );

      await expect(
        service.create({
          nome: 'Ana',
          sobrenome: 'Silva',
          email: 'ana@example.com',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna dados paginados apenas de colaboradores ativos', async () => {
      prisma.$transaction.mockResolvedValue([[colaborador], 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [colaborador],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
      expect(prisma.colaborador.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ColaboradorStatus.ATIVO },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retorna o colaborador ativo', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(colaborador);

      await expect(service.findOne(1)).resolves.toEqual(colaborador);
      expect(prisma.colaborador.findFirst).toHaveBeenCalledWith({
        where: { id: 1, status: ColaboradorStatus.ATIVO },
      });
    });

    it('lança NotFoundException quando não existe ou está removido', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('atualiza um colaborador existente', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(colaborador);
      prisma.colaborador.update.mockResolvedValue({
        ...colaborador,
        nome: 'Ana Paula',
      });

      const result = await service.update(1, { nome: 'Ana Paula' });

      expect(result.nome).toBe('Ana Paula');
      expect(prisma.colaborador.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { nome: 'Ana Paula' },
      });
    });

    it('lança NotFoundException ao atualizar colaborador inexistente', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(null);

      await expect(
        service.update(99, { nome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.colaborador.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('aplica soft delete alterando o status para REMOVIDO', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(colaborador);
      prisma.colaborador.update.mockResolvedValue({
        ...colaborador,
        status: ColaboradorStatus.REMOVIDO,
      });

      await service.remove(1);

      expect(prisma.colaborador.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: ColaboradorStatus.REMOVIDO },
      });
    });

    it('lança NotFoundException ao remover colaborador inexistente', async () => {
      prisma.colaborador.findFirst.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.colaborador.update).not.toHaveBeenCalled();
    });
  });
});
