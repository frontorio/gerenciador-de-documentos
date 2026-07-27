import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VinculoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';
import { TiposDocumentoService } from '../tipos-documento/tipos-documento.service';
import { CreateVinculoDto } from './dto/create-vinculo.dto';

/**
 * Estado do requisito, derivado do ponteiro de versão ativa do vínculo.
 * Não é persistido: PENDENTE quando não há versão ativa, ENVIADO caso haja.
 */
export enum EstadoRequisito {
  PENDENTE = 'PENDENTE',
  ENVIADO = 'ENVIADO',
}

@Injectable()
export class VinculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly colaboradoresService: ColaboradoresService,
    private readonly tiposDocumentoService: TiposDocumentoService,
  ) {}

  async vincular(colaboradorId: number, dto: CreateVinculoDto) {
    // Ambos precisam existir e estar ativos.
    await this.colaboradoresService.findOne(colaboradorId);
    await this.tiposDocumentoService.findOne(dto.tipoDocumentoId);

    const existente = await this.prisma.colaboradorHasDocuments.findUnique({
      where: {
        colaboradorId_tipoDocumentoId: {
          colaboradorId,
          tipoDocumentoId: dto.tipoDocumentoId,
        },
      },
    });

    if (existente) {
      if (existente.status === VinculoStatus.ATIVO) {
        throw new ConflictException(
          `O colaborador ${colaboradorId} já está vinculado ao tipo de documento ${dto.tipoDocumentoId}.`,
        );
      }

      // Reativa um vínculo previamente desvinculado, preservando o histórico
      // de envios já existente (não recria o registro).
      return this.prisma.colaboradorHasDocuments.update({
        where: { id: existente.id },
        data: { status: VinculoStatus.ATIVO },
      });
    }

    return this.prisma.colaboradorHasDocuments.create({
      data: {
        colaboradorId,
        tipoDocumentoId: dto.tipoDocumentoId,
      },
    });
  }

  async desvincular(colaboradorId: number, tipoDocumentoId: number) {
    const vinculo = await this.prisma.colaboradorHasDocuments.findFirst({
      where: {
        colaboradorId,
        tipoDocumentoId,
        status: VinculoStatus.ATIVO,
      },
    });

    if (!vinculo) {
      throw new NotFoundException(
        `Vínculo ativo entre o colaborador ${colaboradorId} e o tipo de documento ${tipoDocumentoId} não encontrado.`,
      );
    }

    // Desvinculação lógica: o histórico de envios é preservado.
    await this.prisma.colaboradorHasDocuments.update({
      where: { id: vinculo.id },
      data: { status: VinculoStatus.DESVINCULADO },
    });
  }

  async findAllByColaborador(
    colaboradorId: number,
    { page, limit }: PaginationQueryDto,
  ) {
    await this.colaboradoresService.findOne(colaboradorId);

    const where = {
      colaboradorId,
      status: VinculoStatus.ATIVO,
    };

    const [vinculos, total] = await this.prisma.$transaction([
      this.prisma.colaboradorHasDocuments.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
        include: { tipoDocumento: true, versaoAtual: true },
      }),
      this.prisma.colaboradorHasDocuments.count({ where }),
    ]);

    const data = vinculos.map((vinculo) => ({
      ...vinculo,
      estado: vinculo.versaoAtualId
        ? EstadoRequisito.ENVIADO
        : EstadoRequisito.PENDENTE,
    }));

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
}
