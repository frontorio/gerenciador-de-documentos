import { IsInt, IsPositive } from 'class-validator';

export class CreateVinculoDto {
  @IsInt()
  @IsPositive()
  tipoDocumentoId: number;
}
