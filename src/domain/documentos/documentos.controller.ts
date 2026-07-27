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
import { DocumentosService } from './documentos.service';
import { EnviarDocumentoDto } from './dto/enviar-documento.dto';

@ApiTags('documentos')
@Controller('colaboradores/:colaboradorId/documentos')
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post()
  enviar(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Body() dto: EnviarDocumentoDto,
  ) {
    return this.documentosService.enviar(colaboradorId, dto.tipoDocumentoId);
  }

  @Get(':tipoDocumentoId/historico')
  historico(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Param('tipoDocumentoId', ParseIntPipe) tipoDocumentoId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.documentosService.historico(
      colaboradorId,
      tipoDocumentoId,
      query,
    );
  }

  @Delete(':tipoDocumentoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remover(
    @Param('colaboradorId', ParseIntPipe) colaboradorId: number,
    @Param('tipoDocumentoId', ParseIntPipe) tipoDocumentoId: number,
  ) {
    return this.documentosService.remover(colaboradorId, tipoDocumentoId);
  }
}
