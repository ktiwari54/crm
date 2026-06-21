import { Module } from '@nestjs/common';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';
import { PricingAnalyticsController } from './pricing-analytics.controller';
import { PricingAnalyticsService } from './pricing-analytics.service';

@Module({
  controllers: [PricingAnalyticsController, AttributionController],
  providers: [PricingAnalyticsService, AttributionService],
})
export class AnalyticsModule {}