import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiTrustService } from './ai-trust.service';
import { LlmService } from './llm.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiTrustService, LlmService],
  exports: [AiService, AiTrustService, LlmService],
})
export class AiModule {}