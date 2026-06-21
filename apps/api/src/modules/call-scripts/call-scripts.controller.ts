import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CallScriptsService } from './call-scripts.service';

@Controller('call-scripts')
@UseGuards(JwtAuthGuard)
export class CallScriptsController {
  constructor(private readonly callScriptsService: CallScriptsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.callScriptsService.findAll(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.callScriptsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.callScriptsService.create(body as never);
  }
}