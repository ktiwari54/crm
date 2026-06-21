import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MdfService } from './mdf.service';

@Controller('mdf')
@UseGuards(JwtAuthGuard)
export class MdfController {
  constructor(private readonly mdfService: MdfService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.mdfService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mdfService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.mdfService.create(body as never);
  }

  @Post(':id/review')
  review(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: { status: 'approved' | 'rejected'; reviewNotes?: string },
  ) {
    return this.mdfService.review(id, req.user.id, body.status, body.reviewNotes);
  }
}