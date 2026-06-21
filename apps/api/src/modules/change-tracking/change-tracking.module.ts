import { Global, Module } from '@nestjs/common';
import { ChangeTrackingController } from './change-tracking.controller';
import { ChangeTrackingService } from './change-tracking.service';

@Global()
@Module({
  controllers: [ChangeTrackingController],
  providers: [ChangeTrackingService],
  exports: [ChangeTrackingService],
})
export class ChangeTrackingModule {}
