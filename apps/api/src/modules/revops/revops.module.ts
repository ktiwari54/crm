import { Module } from '@nestjs/common';
import { RevopsController } from './revops.controller';
import { RevopsService } from './revops.service';

@Module({
  controllers: [RevopsController],
  providers: [RevopsService],
})
export class RevopsModule {}