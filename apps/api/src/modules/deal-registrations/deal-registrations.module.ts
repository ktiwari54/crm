import { Module } from '@nestjs/common';
import { DealRegistrationsController } from './deal-registrations.controller';
import { DealRegistrationsService } from './deal-registrations.service';

@Module({
  controllers: [DealRegistrationsController],
  providers: [DealRegistrationsService],
})
export class DealRegistrationsModule {}