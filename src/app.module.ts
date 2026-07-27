import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ColaboradoresModule } from './domain/colaboradores/colaboradores.module';
import { TiposDocumentoModule } from './domain/tipos-documento/tipos-documento.module';
import { VinculosModule } from './domain/vinculos/vinculos.module';
import { DocumentosModule } from './domain/documentos/documentos.module';
import { EstatisticasModule } from './domain/estatisticas/estatisticas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ColaboradoresModule,
    TiposDocumentoModule,
    VinculosModule,
    DocumentosModule,
    EstatisticasModule,
  ],
})
export class AppModule {}
