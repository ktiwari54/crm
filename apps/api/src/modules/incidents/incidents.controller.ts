import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.incidentsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.incidentsService.create(body as never);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.incidentsService.updateStatus(id, body.status);
  }

  @Post(':id/accounts')
  linkAccounts(@Param('id') id: string, @Body() body: { accountIds: string[] }) {
    return this.incidentsService.linkAccounts(id, body.accountIds ?? []);
  }
}