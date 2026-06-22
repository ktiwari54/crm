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

  /**
   * Bulk import products from CSV rows (Zoho-style headers supported).
   * Maps Record Id -> erpExternalId (idempotent upsert), Product Name -> name,
   * Part Number -> sku/MPN, Condition -> condition, Product Category -> category.
   */
  async importRows(rows: Record<string, string>[], _userId?: string) {
    let imported = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];
    const catCache = new Map<string, string>();

    const pick = (r: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) if (r[k]?.trim()) return r[k].trim();
      return undefined;
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = pick(r, 'Product Name', 'name', 'productName');
      if (!name) {
        errors.push({ row: i + 1, message: 'missing Product Name' });
        continue;
      }
      const recordId = pick(r, 'Record Id', 'recordId', 'erpExternalId');
      const partNumber = pick(r, 'Part Number', 'partNumber', 'manufacturerPartNumber', 'sku');
      const condition = pick(r, 'Condition', 'condition');
      const categoryName = pick(r, 'Product Category', 'category', 'Category');
      const createdTime = pick(r, 'Created Time', 'createdTime');

      // Resolve/create category (skip blank or date-like junk from shifted columns)
      let categoryId: string | undefined;
      if (categoryName && !/^\d{4}-\d{2}-\d{2}/.test(categoryName)) {
        if (catCache.has(categoryName)) categoryId = catCache.get(categoryName);
        else {
          const cat =
            (await this.prisma.productCategory.findFirst({ where: { name: categoryName } })) ??
            (await this.prisma.productCategory.create({ data: { name: categoryName } }));
          categoryId = cat.id;
          catCache.set(categoryName, cat.id);
        }
      }

      const attributes = { source: 'import', zohoRecordId: recordId, zohoCreatedTime: createdTime };

      try {
        // Idempotent on Record Id
        const existing = recordId
          ? await this.prisma.product.findUnique({ where: { erpExternalId: recordId } })
          : null;

        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: { name, manufacturerPartNumber: partNumber, condition, categoryId, attributes },
          });
          updated++;
        } else {
          await this.createWithUniqueSku({
            erpExternalId: recordId,
            name,
            manufacturerPartNumber: partNumber,
            condition,
            categoryId,
            attributes,
            baseSku: partNumber || recordId || `SKU-${i + 1}`,
            fallback: recordId || String(i + 1),
          });
          imported++;
        }
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'failed' });
      }
    }

    return { imported, updated, failed: errors.length, errors };
  }

  /** Create a product, appending a suffix if the SKU collides (SKU is unique). */
  private async createWithUniqueSku(input: {
    erpExternalId?: string;
    name: string;
    manufacturerPartNumber?: string;
    condition?: string;
    categoryId?: string;
    attributes: object;
    baseSku: string;
    fallback: string;
  }) {
    const data = {
      erpExternalId: input.erpExternalId,
      name: input.name,
      manufacturerPartNumber: input.manufacturerPartNumber,
      condition: input.condition,
      categoryId: input.categoryId,
      attributes: input.attributes as never,
    };
    const candidates = [input.baseSku, `${input.baseSku}-${input.fallback.slice(-6)}`, `${input.baseSku}-${Date.now()}`];
    for (const sku of candidates) {
      try {
        return await this.prisma.product.create({ data: { ...data, sku } });
      } catch (e) {
        // P2002 = unique constraint; try the next candidate sku
        if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') continue;
        throw e;
      }
    }
    throw new Error(`Could not assign a unique SKU for "${input.name}"`);
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