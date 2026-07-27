import { Test, TestingModule } from '@nestjs/testing';
import {
  ColaboradorStatus,
  DocumentoStatus,
  TipoDocumentoStatus,
  VinculoStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EstatisticasService } from './estatisticas.service';

describe('EstatisticasService', () => {
  let service: EstatisticasService;
  let prisma: {
    colaboradorHasDocuments: { count: jest.Mock; groupBy: jest.Mock };
    tipoDocumento: { findMany: jest.Mock };
    documento: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      colaboradorHasDocuments: { count: jest.fn(), groupBy: jest.fn() },
      tipoDocumento: { findMany: jest.fn() },
      documento: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstatisticasService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(EstatisticasService);
  });

  describe('completude', () => {
    it('calcula o percentual global considerando apenas requisitos ativos', async () => {
      prisma.$transaction.mockResolvedValue([10, 7]); // total, enviados

      const result = await service.completude();

      expect(result).toEqual({
        total: 10,
        enviados: 7,
        pendentes: 3,
        percentualCompletude: 70,
      });
    });

    it('retorna 0% quando não há requisitos (evita divisão por zero)', async () => {
      prisma.$transaction.mockResolvedValue([0, 0]);

      const result = await service.completude();

      expect(result).toEqual({
        total: 0,
        enviados: 0,
        pendentes: 0,
        percentualCompletude: 0,
      });
    });
  });

  describe('tiposMaisPendentes', () => {
    it('monta o ranking com o nome do tipo e a contagem de pendentes', async () => {
      prisma.colaboradorHasDocuments.groupBy.mockResolvedValue([
        { tipoDocumentoId: 2, _count: { tipoDocumentoId: 5 } },
        { tipoDocumentoId: 3, _count: { tipoDocumentoId: 2 } },
      ]);
      prisma.tipoDocumento.findMany.mockResolvedValue([
        { id: 2, nome: 'CPF' },
        { id: 3, nome: 'ASO' },
      ]);

      const result = await service.tiposMaisPendentes(5);

      expect(result).toEqual([
        { tipoDocumentoId: 2, nome: 'CPF', pendentes: 5 },
        { tipoDocumentoId: 3, nome: 'ASO', pendentes: 2 },
      ]);
      expect(prisma.colaboradorHasDocuments.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['tipoDocumentoId'],
          where: expect.objectContaining({
            status: VinculoStatus.ATIVO,
            versaoAtualId: null,
            colaborador: { status: ColaboradorStatus.ATIVO },
            tipoDocumento: { status: TipoDocumentoStatus.ATIVO },
          }),
          take: 5,
        }),
      );
    });

    it('retorna lista vazia sem consultar nomes quando não há pendências', async () => {
      prisma.colaboradorHasDocuments.groupBy.mockResolvedValue([]);

      const result = await service.tiposMaisPendentes(5);

      expect(result).toEqual([]);
      expect(prisma.tipoDocumento.findMany).not.toHaveBeenCalled();
    });
  });

  describe('ultimosEnvios', () => {
    it('retorna os envios ativos mais recentes em formato achatado', async () => {
      const createdAt = new Date('2026-07-01T10:00:00Z');
      prisma.documento.findMany.mockResolvedValue([
        {
          id: 100,
          numeroVersao: 2,
          createdAt,
          vinculo: {
            colaborador: { id: 1, nome: 'Ana', sobrenome: 'Silva' },
            tipoDocumento: { id: 2, nome: 'CPF' },
          },
        },
      ]);

      const result = await service.ultimosEnvios(5);

      expect(result).toEqual([
        {
          documentoId: 100,
          numeroVersao: 2,
          enviadoEm: createdAt,
          colaborador: { id: 1, nome: 'Ana', sobrenome: 'Silva' },
          tipoDocumento: { id: 2, nome: 'CPF' },
        },
      ]);
      expect(prisma.documento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DocumentoStatus.ATIVO }),
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      );
    });
  });

  describe('dashboard', () => {
    it('agrega as três métricas', async () => {
      prisma.$transaction.mockResolvedValue([4, 4]);
      prisma.colaboradorHasDocuments.groupBy.mockResolvedValue([]);
      prisma.documento.findMany.mockResolvedValue([]);

      const result = await service.dashboard(5);

      expect(result).toEqual({
        completude: {
          total: 4,
          enviados: 4,
          pendentes: 0,
          percentualCompletude: 100,
        },
        tiposMaisPendentes: [],
        ultimosEnvios: [],
      });
    });
  });
});
