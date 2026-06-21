import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SalesProgramsService } from './sales-programs.service';

@Controller('sales-programs')
@UseGuards(JwtAuthGuard)
export class SalesProgramsController {
  constructor(private readonly salesProgramsService: SalesProgramsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.salesProgramsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesProgramsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.salesProgramsService.create(body as never);
  }
}