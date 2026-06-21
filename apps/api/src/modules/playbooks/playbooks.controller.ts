import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PlaybooksService } from './playbooks.service';

@Controller('playbooks')
@UseGuards(JwtAuthGuard)
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  findAll(@Query('stageName') stageName?: string) {
    return this.playbooksService.findAll(stageName);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playbooksService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.playbooksService.create(body as never);
  }
}