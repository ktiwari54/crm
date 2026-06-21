import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [AiModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}