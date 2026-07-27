import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoDocumentoDto {
  @ApiProperty({ example: 'CPF', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;
}
