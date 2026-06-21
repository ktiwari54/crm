import { Module } from '@nestjs/common';
import { DataGraphController } from './data-graph.controller';
import { DataGraphService } from './data-graph.service';

@Module({
  controllers: [DataGraphController],
  providers: [DataGraphService],
})
export class DataGraphModule {}