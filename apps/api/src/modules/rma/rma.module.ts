import { Module } from '@nestjs/common';
import { RmaController } from './rma.controller';
import { RmaService } from './rma.service';

@Module({
  controllers: [RmaController],
  providers: [RmaService],
})
export class RmaModule {}