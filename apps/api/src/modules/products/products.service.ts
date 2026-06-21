import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              {
                manufacturerPartNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        inventoryLevels: { include: { warehouse: true } },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        inventoryLevels: { include: { warehouse: true } },
        relationsFrom: { include: { relatedProduct: true } },
        priceBookEntries: { include: { priceBook: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  getInventory(id: string) {
    return this.prisma.inventoryLevel.findMany({
      where: { productId: id },
      include: { warehouse: true },
    });
  }

  async getEolImpact() {
    const eolProducts = await this.prisma.product.findMany({
      where: { isEol: true, deletedAt: null },
      include: {
        successorProduct: { select: { id: true, sku: true, name: true, listPrice: true } },
        installedAssets: {
          where: { status: 'active' },
          include: {
            account: { select: { id: true, name: true, healthScore: true } },
          },
        },
        quoteLineItems: {
          where: { quote: { deletedAt: null, status: { in: ['draft', 'sent', 'accepted'] } } },
          include: {
            quote: { select: { id: true, quoteNumber: true, status: true, account: { select: { name: true } } } },
          },
        },
      },
      orderBy: { eolDate: 'asc' },
    });

    const totalAffectedAssets = eolProducts.reduce((sum, p) => sum + p.installedAssets.length, 0);
    const affectedAccounts = new Set(
      eolProducts.flatMap((p) => p.installedAssets.map((a) => a.accountId)),
    );

    return {
      summary: {
        eolProductCount: eolProducts.length,
        affectedAssetCount: totalAffectedAssets,
        affectedAccountCount: affectedAccounts.size,
        openQuoteLines: eolProducts.reduce((sum, p) => sum + p.quoteLineItems.length, 0),
      },
      products: eolProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        eolDate: p.eolDate,
        successor: p.successorProduct,
        installedCount: p.installedAssets.length,
        accounts: [...new Map(p.installedAssets.map((a) => [a.account.id, a.account])).values()],
        openQuotes: p.quoteLineItems.map((li) => ({
          quoteId: li.quote.id,
          quoteNumber: li.quote.quoteNumber,
          account: li.quote.account.name,
          status: li.quote.status,
          quantity: li.quantity,
        })),
      })),
    };
  }
}