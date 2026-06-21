import { Module } from '@nestjs/common';
import { MdfController } from './mdf.controller';
import { MdfService } from './mdf.service';

@Module({
  controllers: [MdfController],
  providers: [MdfService],
})
export class MdfModule {}