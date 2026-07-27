import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class EnviarDocumentoDto {
  @ApiProperty({
    example: 1,
    description: 'ID do tipo de documento sendo enviado',
  })
  @IsInt()
  @IsPositive()
  tipoDocumentoId: number;
}
