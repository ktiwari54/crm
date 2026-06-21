import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RoutingService } from './routing.service';

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Get('rules')
  findRules(@Query('entityType') entityType?: string) {
    return this.routingService.findRules(entityType);
  }

  @Post('rules')
  createRule(@Body() body: Record<string, unknown>) {
    return this.routingService.createRule(body as never);
  }

  @Post('assign')
  assign(@Body() body: Record<string, unknown>) {
    return this.routingService.assign(body as never);
  }
}