import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PricingAnalyticsService } from './pricing-analytics.service';

@Controller('analytics/pricing')
@UseGuards(JwtAuthGuard)
export class PricingAnalyticsController {
  constructor(private readonly pricingAnalyticsService: PricingAnalyticsService) {}

  @Get()
  getDashboard() {
    return this.pricingAnalyticsService.getDashboard();
  }
}