import { Module } from '@nestjs/common';
import { AccountPlansController } from './account-plans.controller';
import { AccountPlansService } from './account-plans.service';

@Module({
  controllers: [AccountPlansController],
  providers: [AccountPlansService],
})
export class AccountPlansModule {}