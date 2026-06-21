import { Module } from '@nestjs/common';
import { CallScriptsController } from './call-scripts.controller';
import { CallScriptsService } from './call-scripts.service';

@Module({
  controllers: [CallScriptsController],
  providers: [CallScriptsService],
  exports: [CallScriptsService],
})
export class CallScriptsModule {}