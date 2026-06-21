import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DealRegistrationsService } from './deal-registrations.service';

@Controller('deal-registrations')
@UseGuards(JwtAuthGuard)
export class DealRegistrationsController {
  constructor(private readonly dealRegistrationsService: DealRegistrationsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.dealRegistrationsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealRegistrationsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.dealRegistrationsService.create(body as never);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: { status: 'approved' | 'rejected'; notes?: string },
  ) {
    return this.dealRegistrationsService.review(id, req.user.id, body.status, body.notes);
  }
}