import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DataGraphService } from './data-graph.service';

@Controller('data-graph')
@UseGuards(JwtAuthGuard)
export class DataGraphController {
  constructor(private readonly dataGraphService: DataGraphService) {}

  @Get('account/:id')
  getAccountGraph(@Param('id') id: string) {
    return this.dataGraphService.getAccountGraph(id);
  }
}