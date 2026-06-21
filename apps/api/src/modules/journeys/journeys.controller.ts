import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { JourneysService } from './journeys.service';

@Controller('journeys')
@UseGuards(JwtAuthGuard)
export class JourneysController {
  constructor(private readonly journeysService: JourneysService) {}

  @Get()
  findAll() {
    return this.journeysService.findAll();
  }

  @Get('enrollments')
  listEnrollments(@Query('status') status?: string) {
    return this.journeysService.listEnrollments(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.journeysService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.journeysService.create(body as never);
  }

  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body() body: { accountIds: string[] }) {
    return this.journeysService.enroll(id, body.accountIds ?? []);
  }

  @Post('enrollments/:enrollmentId/advance')
  advance(@Param('enrollmentId') enrollmentId: string) {
    return this.journeysService.advanceEnrollment(enrollmentId);
  }
}