import { Module } from '@nestjs/common';
import { FieldHistoryController } from './field-history.controller';
import { FieldHistoryService } from './field-history.service';

@Module({
  controllers: [FieldHistoryController],
  providers: [FieldHistoryService],
  exports: [FieldHistoryService],
})
export class FieldHistoryModule {}