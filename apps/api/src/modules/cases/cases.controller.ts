import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CasesService } from './cases.service';

@Controller('cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('accountId') accountId?: string) {
    return this.casesService.findAll(status, accountId);
  }

  @Get('suggest-articles')
  suggestArticles(@Query('subject') subject: string) {
    return this.casesService.suggestArticles(subject ?? '');
  }

  @Post('classify')
  classify(@Body() body: { subject: string; description?: string }) {
    return this.casesService.classifySubject(body.subject, body.description);
  }

  @Get(':id/similar')
  findSimilar(@Param('id') id: string) {
    return this.casesService.findSimilar(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.casesService.create(body as never);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.casesService.updateStatus(id, body.status);
  }
}