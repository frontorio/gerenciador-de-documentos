import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPendentesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filtra pendências de um colaborador específico',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  colaboradorId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Filtra pendências de um tipo de documento específico',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  tipoDocumentoId?: number;
}
