import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.leadsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.leadsService.create(body as never);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.leadsService.update(id, body as never);
  }

  @Post(':id/convert')
  convert(
    @Param('id') id: string,
    @Body() body: { accountId?: string; createDeal?: boolean },
  ) {
    return this.leadsService.convert(id, body);
  }
}