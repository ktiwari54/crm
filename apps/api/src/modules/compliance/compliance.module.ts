import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { GdprService } from './gdpr.service';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, GdprService],
  exports: [ComplianceService, GdprService],
})
export class ComplianceModule {}