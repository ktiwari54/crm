import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { EmailSyncService } from './email-sync.service';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';

@Module({
  imports: [AiModule],
  controllers: [EmailsController],
  providers: [EmailsService, EmailSyncService],
})
export class EmailsModule {}