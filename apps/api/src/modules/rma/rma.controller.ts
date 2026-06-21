import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RmaService } from './rma.service';

@Controller('rma')
@UseGuards(JwtAuthGuard)
export class RmaController {
  constructor(private readonly rmaService: RmaService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.rmaService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rmaService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.rmaService.create(body as never);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.rmaService.updateStatus(id, body.status);
  }
}