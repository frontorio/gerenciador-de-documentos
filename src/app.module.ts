import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ColaboradoresModule } from './domain/colaboradores/colaboradores.module';
import { TiposDocumentoModule } from './domain/tipos-documento/tipos-documento.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ColaboradoresModule,
    TiposDocumentoModule,
  ],
})
export class AppModule {}
