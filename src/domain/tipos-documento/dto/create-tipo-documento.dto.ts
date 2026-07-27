import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoDocumentoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;
}
