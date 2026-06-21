import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AttributionService } from './attribution.service';

@Controller('analytics/attribution')
@UseGuards(JwtAuthGuard)
export class AttributionController {
  constructor(private readonly attributionService: AttributionService) {}

  @Get()
  getAttribution() {
    return this.attributionService.getAttribution();
  }
}