import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
  ) {
    return this.knowledgeService.findAll(status, category, q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Post(':id/view')
  view(@Param('id') id: string) {
    return this.knowledgeService.view(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.knowledgeService.create(body as never);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.knowledgeService.publish(id);
  }
}