import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ColaboradorStatus,
  DocumentoStatus,
  Prisma,
  TipoDocumentoStatus,
  VinculoStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { ListPendentesQueryDto } from './dto/list-pendentes-query.dto';

@Injectable()
export class DocumentosService {
  /** Máximo de tentativas em caso de corrida na numeração de versão. */
  private readonly MAX_TENTATIVAS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly colaboradoresService: ColaboradoresService,
  ) {}

  /**
   * Registra o envio de um documento como uma nova versão.
   *
   * Operação crítica: criar a versão e mover o ponteiro `versaoAtualId` do
   * vínculo precisam ser atômicos. O índice único (vinculo, numeroVersao)
   * garante consistência sob concorrência — se dois reenvios simultâneos
   * calcularem o mesmo número, um falha (P2002) e é reprocessado.
   */
  async enviar(colaboradorId: number, tipoDocumentoId: number) {
    await this.colaboradoresService.findOne(colaboradorId);

    const vinculo = await this.prisma.colaboradorHasDocuments.findFirst({
      where: {
        colaboradorId,
        tipoDocumentoId,
        status: VinculoStatus.ATIVO,
      },
    });

    if (!vinculo) {
      throw new NotFoundException(
        `O colaborador ${colaboradorId} não está vinculado ao tipo de documento ${tipoDocumentoId}.`,
      );
    }

    for (let tentativa = 1; tentativa <= this.MAX_TENTATIVAS; tentativa++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const ultima = await tx.documento.findFirst({
            where: { vinculoId: vinculo.id },
            orderBy: { numeroVersao: 'desc' },
            select: { numeroVersao: true },
          });

          const numeroVersao = (ultima?.numeroVersao ?? 0) + 1;

          const documento = await tx.documento.create({
            data: { vinculoId: vinculo.id, numeroVersao },
          });

          await tx.colaboradorHasDocuments.update({
            where: { id: vinculo.id },
            data: { versaoAtualId: documento.id },
          });

          return documento;
        });
      } catch (error) {
        if (this.isVersaoDuplicada(error)) {
          // Corrida: outro reenvio criou a mesma versão.
          if (tentativa < this.MAX_TENTATIVAS) {
            continue; // recalcula e tenta de novo
          }
          throw new ConflictException(
            'Não foi possível registrar o envio devido a concorrência. Tente novamente.',
          );
        }
        throw error;
      }
    }

    // Inatingível: o laço sempre retorna ou lança acima.
    throw new ConflictException(
      'Não foi possível registrar o envio devido a concorrência. Tente novamente.',
    );
  }

  async historico(
    colaboradorId: number,
    tipoDocumentoId: number,
    { page, limit }: PaginationQueryDto,
  ) {
    const vinculo = await this.prisma.colaboradorHasDocuments.findFirst({
      where: { colaboradorId, tipoDocumentoId },
    });

    if (!vinculo) {
      throw new NotFoundException(
        `Não há vínculo entre o colaborador ${colaboradorId} e o tipo de documento ${tipoDocumentoId}.`,
      );
    }

    const where = { vinculoId: vinculo.id };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.documento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { numeroVersao: 'desc' },
      }),
      this.prisma.documento.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        versaoAtualId: vinculo.versaoAtualId,
      },
    };
  }

  /**
   * Soft delete da versão ativa. Marca o documento como REMOVIDO e move o
   * ponteiro do vínculo para a versão ativa anterior (ou null, voltando a
   * pendente), tudo dentro de uma transação. O histórico é preservado.
   */
  async remover(colaboradorId: number, tipoDocumentoId: number) {
    await this.colaboradoresService.findOne(colaboradorId);

    const vinculo = await this.prisma.colaboradorHasDocuments.findFirst({
      where: {
        colaboradorId,
        tipoDocumentoId,
        status: VinculoStatus.ATIVO,
      },
    });

    if (!vinculo || !vinculo.versaoAtualId) {
      throw new NotFoundException(
        `Não há documento enviado para o colaborador ${colaboradorId} no tipo ${tipoDocumentoId}.`,
      );
    }

    const versaoAtualId = vinculo.versaoAtualId;

    await this.prisma.$transaction(async (tx) => {
      await tx.documento.update({
        where: { id: versaoAtualId },
        data: { status: DocumentoStatus.REMOVIDO },
      });

      const anterior = await tx.documento.findFirst({
        where: { vinculoId: vinculo.id, status: DocumentoStatus.ATIVO },
        orderBy: { numeroVersao: 'desc' },
        select: { id: true },
      });

      await tx.colaboradorHasDocuments.update({
        where: { id: vinculo.id },
        data: { versaoAtualId: anterior?.id ?? null },
      });
    });
  }

  /**
   * Lista requisitos pendentes (vínculo ativo sem versão ativa), refletindo
   * o soft delete: exclui colaboradores e tipos removidos.
   */
  async listarPendentes({
    page,
    limit,
    colaboradorId,
    tipoDocumentoId,
  }: ListPendentesQueryDto) {
    const where: Prisma.ColaboradorHasDocumentsWhereInput = {
      status: VinculoStatus.ATIVO,
      versaoAtualId: null,
      colaborador: { status: ColaboradorStatus.ATIVO },
      tipoDocumento: { status: TipoDocumentoStatus.ATIVO },
      ...(colaboradorId ? { colaboradorId } : {}),
      ...(tipoDocumentoId ? { tipoDocumentoId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.colaboradorHasDocuments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          colaborador: {
            select: { id: true, nome: true, sobrenome: true, email: true },
          },
          tipoDocumento: { select: { id: true, nome: true } },
        },
      }),
      this.prisma.colaboradorHasDocuments.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private isVersaoDuplicada(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
