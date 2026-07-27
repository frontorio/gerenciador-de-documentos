import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateColaboradorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sobrenome: string;

  @IsEmail()
  @MaxLength(255)
  email: string;
}
