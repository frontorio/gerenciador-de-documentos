import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TiposDocumentoService } from './tipos-documento.service';
import { CreateTipoDocumentoDto } from './dto/create-tipo-documento.dto';
import { UpdateTipoDocumentoDto } from './dto/update-tipo-documento.dto';

@Controller('tipos-documento')
export class TiposDocumentoController {
  constructor(private readonly tiposDocumentoService: TiposDocumentoService) {}

  @Post()
  create(@Body() dto: CreateTipoDocumentoDto) {
    return this.tiposDocumentoService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.tiposDocumentoService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tiposDocumentoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoDocumentoDto,
  ) {
    return this.tiposDocumentoService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tiposDocumentoService.remove(id);
  }
}
