import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class EstatisticasQueryDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Quantidade de itens nos rankings/listas (1 a 50).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 5;
}
