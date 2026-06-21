import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AssetsService } from './assets.service';

@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string, @Query('status') status?: string) {
    return this.assetsService.findAll(accountId, status);
  }

  @Get('expiring-warranties')
  expiringWarranties(@Query('days') days?: string) {
    return this.assetsService.expiringWarranties(days ? Number(days) : 90);
  }

  @Get('trace/:serial')
  trace(@Param('serial') serial: string) {
    return this.assetsService.traceSerial(serial);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.assetsService.create(body as never);
  }
}