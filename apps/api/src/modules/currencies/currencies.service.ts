import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SUPPORTED = ['USD', 'EUR', 'GBP', 'CAD'];

@Injectable()
export class CurrenciesService {
  constructor(private readonly prisma: PrismaService) {}

  getSupported() {
    return SUPPORTED;
  }

  findRates() {
    return this.prisma.currencyRate.findMany({
      orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }],
    });
  }

  async convert(amount: number, from: string, to: string) {
    if (from === to) return { amount, from, to, rate: 1 };
    const direct = await this.prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
    });
    if (direct) {
      return {
        amount: amount * Number(direct.rate),
        from,
        to,
        rate: Number(direct.rate),
      };
    }
    const inverse = await this.prisma.currencyRate.findUnique({
      where: { fromCurrency_toCurrency: { fromCurrency: to, toCurrency: from } },
    });
    if (inverse && Number(inverse.rate) !== 0) {
      const rate = 1 / Number(inverse.rate);
      return { amount: amount * rate, from, to, rate };
    }
    return { amount, from, to, rate: 1 };
  }

  upsertRate(data: { fromCurrency: string; toCurrency: string; rate: number }) {
    return this.prisma.currencyRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: data.fromCurrency,
          toCurrency: data.toCurrency,
        },
      },
      create: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
      },
      update: { rate: data.rate, effectiveAt: new Date() },
    });
  }
}