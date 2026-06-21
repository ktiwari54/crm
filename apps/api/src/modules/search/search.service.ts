import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ElasticsearchService } from './elasticsearch.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  async globalSearch(q: string) {
    if (!q?.trim()) {
      return { accounts: [], contacts: [], products: [], deals: [], source: 'none' };
    }

    const esResult = await this.elasticsearch.search(q);
    if (esResult) return esResult;

    const term = q.trim();

    const [accounts, contacts, products, deals] = await Promise.all([
      this.prisma.account.findMany({
        where: {
          deletedAt: null,
          name: { contains: term, mode: 'insensitive' },
        },
        take: 10,
        select: { id: true, name: true, accountType: true },
      }),
      this.prisma.contact.findMany({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          account: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { sku: { contains: term, mode: 'insensitive' } },
            {
              manufacturerPartNumber: {
                contains: term,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 10,
        select: { id: true, name: true, sku: true, listPrice: true },
      }),
      this.prisma.deal.findMany({
        where: {
          deletedAt: null,
          name: { contains: term, mode: 'insensitive' },
        },
        take: 10,
        select: {
          id: true,
          name: true,
          amount: true,
          account: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { accounts, contacts, products, deals, source: 'postgresql' as const };
  }
}