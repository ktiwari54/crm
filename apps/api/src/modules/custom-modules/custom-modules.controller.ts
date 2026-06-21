import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CustomModulesService } from './custom-modules.service';

@Controller('custom-modules')
@UseGuards(JwtAuthGuard)
export class CustomModulesController {
  constructor(private readonly customModulesService: CustomModulesService) {}

  @Get()
  findAll() {
    return this.customModulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customModulesService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.customModulesService.create(body as never);
  }

  @Post(':id/records')
  createRecord(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.customModulesService.createRecord(id, body);
  }
}