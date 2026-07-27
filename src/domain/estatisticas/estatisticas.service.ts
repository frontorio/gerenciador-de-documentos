import { Injectable } from '@nestjs/common';
import {
  ColaboradorStatus,
  DocumentoStatus,
  Prisma,
  TipoDocumentoStatus,
  VinculoStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EstatisticasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Base comum a todas as métricas: apenas requisitos "vivos" — vínculo ativo
   * de colaborador ativo para tipo de documento ativo. É o que garante que o
   * soft delete se reflita em todas as estatísticas.
   */
  private get requisitoAtivo(): Prisma.ColaboradorHasDocumentsWhereInput {
    return {
      status: VinculoStatus.ATIVO,
      colaborador: { status: ColaboradorStatus.ATIVO },
      tipoDocumento: { status: TipoDocumentoStatus.ATIVO },
    };
  }

  /** Dashboard: agrega as três métricas numa única resposta. */
  async dashboard(limit: number) {
    const [completude, tiposMaisPendentes, ultimosEnvios] = await Promise.all([
      this.completude(),
      this.tiposMaisPendentes(limit),
      this.ultimosEnvios(limit),
    ]);

    return { completude, tiposMaisPendentes, ultimosEnvios };
  }

  /** Percentual global de requisitos com documento enviado (versão ativa). */
  async completude() {
    const [total, enviados] = await this.prisma.$transaction([
      this.prisma.colaboradorHasDocuments.count({
        where: this.requisitoAtivo,
      }),
      this.prisma.colaboradorHasDocuments.count({
        where: { ...this.requisitoAtivo, versaoAtualId: { not: null } },
      }),
    ]);

    const pendentes = total - enviados;
    const percentualCompletude =
      total === 0 ? 0 : Number(((enviados / total) * 100).toFixed(2));

    return { total, enviados, pendentes, percentualCompletude };
  }

  /** Ranking dos tipos de documento com mais requisitos pendentes. */
  async tiposMaisPendentes(limit: number) {
    const grupos = await this.prisma.colaboradorHasDocuments.groupBy({
      by: ['tipoDocumentoId'],
      where: { ...this.requisitoAtivo, versaoAtualId: null },
      _count: { tipoDocumentoId: true },
      orderBy: { _count: { tipoDocumentoId: 'desc' } },
      take: limit,
    });

    if (grupos.length === 0) {
      return [];
    }

    const tipos = await this.prisma.tipoDocumento.findMany({
      where: { id: { in: grupos.map((g) => g.tipoDocumentoId) } },
      select: { id: true, nome: true },
    });
    const nomePorId = new Map(tipos.map((t) => [t.id, t.nome]));

    return grupos.map((grupo) => ({
      tipoDocumentoId: grupo.tipoDocumentoId,
      nome: nomePorId.get(grupo.tipoDocumentoId) ?? null,
      pendentes: grupo._count.tipoDocumentoId,
    }));
  }

  /** Últimos envios realizados (versões ativas de requisitos vivos). */
  async ultimosEnvios(limit: number) {
    const envios = await this.prisma.documento.findMany({
      where: {
        status: DocumentoStatus.ATIVO,
        vinculo: {
          status: VinculoStatus.ATIVO,
          colaborador: { status: ColaboradorStatus.ATIVO },
          tipoDocumento: { status: TipoDocumentoStatus.ATIVO },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        vinculo: {
          include: {
            colaborador: {
              select: { id: true, nome: true, sobrenome: true },
            },
            tipoDocumento: { select: { id: true, nome: true } },
          },
        },
      },
    });

    return envios.map((envio) => ({
      documentoId: envio.id,
      numeroVersao: envio.numeroVersao,
      enviadoEm: envio.createdAt,
      colaborador: envio.vinculo.colaborador,
      tipoDocumento: envio.vinculo.tipoDocumento,
    }));
  }
}
