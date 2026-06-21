import { Module } from '@nestjs/common';
import { ChatterController } from './chatter.controller';
import { ChatterService } from './chatter.service';

@Module({
  controllers: [ChatterController],
  providers: [ChatterService],
})
export class ChatterModule {}