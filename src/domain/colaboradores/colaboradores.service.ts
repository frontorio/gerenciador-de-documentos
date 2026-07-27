import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ColaboradorStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateColaboradorDto } from './dto/create-colaborador.dto';
import { UpdateColaboradorDto } from './dto/update-colaborador.dto';

@Injectable()
export class ColaboradoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateColaboradorDto) {
    try {
      return await this.prisma.colaborador.create({ data: dto });
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ConflictException(
          `Já existe um colaborador com o email "${dto.email}".`,
        );
      }
      throw error;
    }
  }

  async findAll({ page, limit }: PaginationQueryDto) {
    const where: Prisma.ColaboradorWhereInput = {
      status: ColaboradorStatus.ATIVO,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.colaborador.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.colaborador.count({ where }),
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
    const colaborador = await this.prisma.colaborador.findFirst({
      where: { id, status: ColaboradorStatus.ATIVO },
    });

    if (!colaborador) {
      throw new NotFoundException(`Colaborador ${id} não encontrado.`);
    }

    return colaborador;
  }

  async update(id: number, dto: UpdateColaboradorDto) {
    await this.findOne(id);

    try {
      return await this.prisma.colaborador.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (this.isUniqueEmailViolation(error)) {
        throw new ConflictException(
          `Já existe um colaborador com o email "${dto.email}".`,
        );
      }
      throw error;
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.colaborador.update({
      where: { id },
      data: { status: ColaboradorStatus.REMOVIDO },
    });
  }

  private isUniqueEmailViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
