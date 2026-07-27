import { Module } from '@nestjs/common';
import { ColaboradoresModule } from '../colaboradores/colaboradores.module';
import { DocumentosController } from './documentos.controller';
import { DocumentosPendentesController } from './documentos-pendentes.controller';
import { DocumentosService } from './documentos.service';

@Module({
  imports: [ColaboradoresModule],
  controllers: [DocumentosController, DocumentosPendentesController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
