import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ForecastingService } from './forecasting.service';

@Controller('forecasting')
@UseGuards(JwtAuthGuard)
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Get('periods')
  getPeriods() {
    return this.forecastingService.getPeriods();
  }

  @Get('periods/:id/rollup')
  getRollup(@Param('id') id: string) {
    return this.forecastingService.getRollup(id);
  }

  @Post('entries')
  createEntry(@Body() body: Record<string, unknown>) {
    return this.forecastingService.createEntry(body as never);
  }

  @Post('periods/:id/sync')
  syncFromPipeline(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.forecastingService.syncFromPipeline(id, req.user.id);
  }

  @Post('simulate')
  simulate(@Body() body: { periodId: string; adjustments: Array<{ dealId: string; probability: number }> }) {
    return this.forecastingService.simulate(body.periodId, body.adjustments ?? []);
  }
}