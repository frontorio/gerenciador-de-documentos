import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { VinculosService } from './vinculos.service';
import { CreateVinculoDto } from './dto/create-vinculo.dto';

@ApiTags('vinculos')
@Controller('colaboradores/:colaboradorId/vinculos')
export class VinculosController {
  constructor(private readonly vinculosService: VinculosService) {}

  @Post()
  vincular(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Body() dto: CreateVinculoDto,
  ) {
    return this.vinculosService.vincular(colaboradorId, dto);
  }

  @Get()
  findAll(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.vinculosService.findAllByColaborador(colaboradorId, query);
  }

  @Delete(':tipoDocumentoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  desvincular(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Param('tipoDocumentoId', ParseIntPipe) tipoDocumentoId: number,
  ) {
    return this.vinculosService.desvincular(colaboradorId, tipoDocumentoId);
  }
}
