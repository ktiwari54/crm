import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { FulfillmentService } from './fulfillment.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [IntegrationModule],
  controllers: [OrdersController],
  providers: [OrdersService, FulfillmentService],
  exports: [OrdersService, FulfillmentService],
})
export class OrdersModule {}