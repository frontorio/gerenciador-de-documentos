import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTipoDocumentoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome?: string;
}
