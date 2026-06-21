import { Module } from '@nestjs/common';
import { CtiController } from './cti.controller';
import { CtiService } from './cti.service';

@Module({
  controllers: [CtiController],
  providers: [CtiService],
})
export class CtiModule {}