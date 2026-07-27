import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateColaboradorDto {
  @ApiProperty({ example: 'Ana', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @ApiProperty({ example: 'Silva', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sobrenome: string;

  @ApiProperty({ example: 'ana.silva@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;
}
