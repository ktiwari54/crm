import { Module } from '@nestjs/common';
import { PrmController } from './prm.controller';
import { PrmService } from './prm.service';

@Module({
  controllers: [PrmController],
  providers: [PrmService],
  exports: [PrmService],
})
export class PrmModule {}