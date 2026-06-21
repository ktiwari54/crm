import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.vendorsService.create(body as never);
  }

  @Post(':id/products')
  linkProduct(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.vendorsService.linkProduct(id, body as never);
  }
}