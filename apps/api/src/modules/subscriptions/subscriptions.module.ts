import { Module } from '@nestjs/common';
import { BillingScheduler } from './billing.scheduler';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, BillingScheduler],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
