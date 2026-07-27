import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EstatisticasService } from './estatisticas.service';
import { EstatisticasQueryDto } from './dto/estatisticas-query.dto';

@ApiTags('estatisticas')
@Controller('estatisticas')
export class EstatisticasController {
  constructor(private readonly estatisticasService: EstatisticasService) {}

  @Get()
  dashboard(@Query() { limit }: EstatisticasQueryDto) {
    return this.estatisticasService.dashboard(limit);
  }

  @Get('completude')
  completude() {
    return this.estatisticasService.completude();
  }

  @Get('tipos-mais-pendentes')
  tiposMaisPendentes(@Query() { limit }: EstatisticasQueryDto) {
    return this.estatisticasService.tiposMaisPendentes(limit);
  }

  @Get('ultimos-envios')
  ultimosEnvios(@Query() { limit }: EstatisticasQueryDto) {
    return this.estatisticasService.ultimosEnvios(limit);
  }
}
