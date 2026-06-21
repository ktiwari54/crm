import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AccountPlansService } from './account-plans.service';

@Controller('account-plans')
@UseGuards(JwtAuthGuard)
export class AccountPlansController {
  constructor(private readonly accountPlansService: AccountPlansService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.accountPlansService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountPlansService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.accountPlansService.create(body as never);
  }

  @Post(':id/goals')
  addGoal(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.accountPlansService.addGoal(id, body as never);
  }

  @Post(':id/map')
  createMap(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.accountPlansService.createMap(id, body as never);
  }
}