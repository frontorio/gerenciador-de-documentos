import { Module } from '@nestjs/common';
import { TiposDocumentoController } from './tipos-documento.controller';
import { TiposDocumentoService } from './tipos-documento.service';

@Module({
  controllers: [TiposDocumentoController],
  providers: [TiposDocumentoService],
  exports: [TiposDocumentoService],
})
export class TiposDocumentoModule {}
