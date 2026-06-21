import { Module } from '@nestjs/common';
import { WorkqueueController } from './workqueue.controller';
import { WorkqueueService } from './workqueue.service';

@Module({
  controllers: [WorkqueueController],
  providers: [WorkqueueService],
  exports: [WorkqueueService],
})
export class WorkqueueModule {}