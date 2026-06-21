import { Module } from '@nestjs/common';
import { SalesProgramsController } from './sales-programs.controller';
import { SalesProgramsService } from './sales-programs.service';

@Module({
  controllers: [SalesProgramsController],
  providers: [SalesProgramsService],
})
export class SalesProgramsModule {}