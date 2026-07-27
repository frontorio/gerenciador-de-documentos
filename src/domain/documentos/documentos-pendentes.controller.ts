import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentosService } from './documentos.service';
import { ListPendentesQueryDto } from './dto/list-pendentes-query.dto';

@ApiTags('documentos')
@Controller('documentos')
export class DocumentosPendentesController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Get('pendentes')
  listarPendentes(@Query() query: ListPendentesQueryDto) {
    return this.documentosService.listarPendentes(query);
  }
}
