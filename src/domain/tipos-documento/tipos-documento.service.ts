import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoDocumentoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

@Injectable()
export class TiposDocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTipoDocumentoDto) {
    try {
      return await this.prisma.tipoDocumento.create({ data: dto });
    } catch (error) {
      if (this.isUniqueNomeViolation(error)) {
        throw new ConflictException(
          `Já existe um tipo de documento com o nome "${dto.nome}".`,
        );
      }
      throw error;
    }
  }

  async findAll({ page, limit }: PaginationQueryDto) {
    const where: Prisma.TipoDocumentoWhereInput = {
      status: TipoDocumentoStatus.ATIVO,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tipoDocumento.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.tipoDocumento.count({ where }),
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

  async findOne(id: number) {
    const tipoDocumento = await this.prisma.tipoDocumento.findFirst({
      where: { id, status: TipoDocumentoStatus.ATIVO },
    });

    if (!tipoDocumento) {
      throw new NotFoundException(`Tipo de documento ${id} não encontrado.`);
    }

    return tipoDocumento;
  }

  async update(id: number, dto: UpdateTipoDocumentoDto) {
    await this.findOne(id);

    try {
      return await this.prisma.tipoDocumento.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (this.isUniqueNomeViolation(error)) {
        throw new ConflictException(
          `Já existe um tipo de documento com o nome "${dto.nome}".`,
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.tipoDocumento.update({
      where: { id },
      data: { status: TipoDocumentoStatus.REMOVIDO },
    });
  }

  private isUniqueNomeViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
