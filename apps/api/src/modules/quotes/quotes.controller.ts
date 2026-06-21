import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.quotesService.findAll(status);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.quotesService.accept(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotesService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.quotesService.create(body as never);
  }

  @Post(':id/line-items')
  addLineItem(
    @Param('id') id: string,
    @Body()
    body: {
      productId: string;
      quantity: number;
      warehouseId?: string;
      discountPercent?: number;
    },
  ) {
    return this.quotesService.addLineItem(id, body);
  }
}