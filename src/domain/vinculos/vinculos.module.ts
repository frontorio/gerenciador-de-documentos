import { Module } from '@nestjs/common';
import { ColaboradoresModule } from '../colaboradores/colaboradores.module';
import { TiposDocumentoModule } from '../tipos-documento/tipos-documento.module';
import { VinculosController } from './vinculos.controller';
import { VinculosService } from './vinculos.service';

@Module({
  imports: [ColaboradoresModule, TiposDocumentoModule],
  controllers: [VinculosController],
  providers: [VinculosService],
  exports: [VinculosService],
})
export class VinculosModule {}
