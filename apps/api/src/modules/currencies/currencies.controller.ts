import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrenciesService } from './currencies.service';

@Controller('currencies')
@UseGuards(JwtAuthGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  getSupported() {
    return this.currenciesService.getSupported();
  }

  @Get('rates')
  findRates() {
    return this.currenciesService.findRates();
  }

  @Get('convert')
  convert(
    @Query('amount') amount: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.currenciesService.convert(Number(amount), from, to);
  }

  @Post('rates')
  upsertRate(@Body() body: { fromCurrency: string; toCurrency: string; rate: number }) {
    return this.currenciesService.upsertRate(body);
  }
}