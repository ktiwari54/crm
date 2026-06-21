import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FieldServiceService } from './field-service.service';

@Controller('field-service')
@UseGuards(JwtAuthGuard)
export class FieldServiceController {
  constructor(private readonly fieldServiceService: FieldServiceService) {}

  @Get('work-orders')
  findAll(
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.fieldServiceService.findAll(status, from, to);
  }

  @Get('work-orders/:id')
  findOne(@Param('id') id: string) {
    return this.fieldServiceService.findOne(id);
  }

  @Post('work-orders')
  create(@Body() body: Record<string, unknown>) {
    return this.fieldServiceService.create(body as never);
  }

  @Patch('work-orders/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.fieldServiceService.updateStatus(id, body.status);
  }
}