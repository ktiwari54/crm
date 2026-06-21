import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConstraintsService } from '../constraints/constraints.service';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly constraints: ConstraintsService,
  ) {}

  findAll(status?: string) {
    return this.prisma.quote.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        account: true,
        deal: true,
        owner: true,
        lineItems: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id, deletedAt: null },
      include: {
        account: true,
        deal: true,
        owner: true,
        priceBook: true,
        lineItems: {
          include: { product: true, warehouse: true },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  async create(data: Prisma.QuoteCreateInput) {
    const count = await this.prisma.quote.count();
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.quote.create({
      data: { ...data, quoteNumber },
      include: { account: true, lineItems: true },
    });
  }

  async addLineItem(
    quoteId: string,
    data: {
      productId: string;
      quantity: number;
      warehouseId?: string;
      discountPercent?: number;
    },
  ) {
    const quote = await this.findOne(quoteId);
    if (quote.isLocked) {
      throw new BadRequestException('Quote is locked pending approval');
    }
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existingIds = quote.lineItems.map((li) => li.productId);
    const validation = await this.constraints.validateQuoteLine(
      data.productId,
      existingIds,
    );
    if (!validation.valid) {
      throw new BadRequestException(validation.violations.join('; '));
    }

    let unitPrice = product.listPrice ?? new Prisma.Decimal(0);
    if (quote.priceBookId) {
      const entry = await this.prisma.priceBookEntry.findUnique({
        where: {
          priceBookId_productId: {
            priceBookId: quote.priceBookId,
            productId: data.productId,
          },
        },
      });
      if (entry) unitPrice = entry.unitPrice;
    }

    let atpAtQuoteTime: Prisma.Decimal | null = null;
    let atpWarning = false;
    if (data.warehouseId) {
      const inv = await this.prisma.inventoryLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: data.productId,
            warehouseId: data.warehouseId,
          },
        },
      });
      if (inv) {
        atpAtQuoteTime = inv.atp;
        atpWarning = new Prisma.Decimal(data.quantity).gt(inv.atp);
        if (atpWarning) {
          throw new BadRequestException(
            `Insufficient ATP: requested ${data.quantity}, available ${inv.atp}`,
          );
        }
      }
    }

    const discount = data.discountPercent ?? 0;
    const lineTotal = unitPrice
      .mul(data.quantity)
      .mul(1 - discount / 100);

    const lineNumber =
      (quote.lineItems?.length ?? 0) > 0
        ? Math.max(...quote.lineItems.map((l) => l.lineNumber)) + 1
        : 1;

    const lineItem = await this.prisma.quoteLineItem.create({
      data: {
        quote: { connect: { id: quoteId } },
        product: { connect: { id: data.productId } },
        lineNumber,
        quantity: data.quantity,
        unitPrice,
        unitCost: product.costPrice,
        discountPercent: discount,
        lineTotal,
        warehouse: data.warehouseId
          ? { connect: { id: data.warehouseId } }
          : undefined,
        atpAtQuoteTime,
        atpWarning,
      },
      include: { product: true },
    });

    await this.recalculateTotals(quoteId);
    return lineItem;
  }

  async accept(id: string) {
    const quote = await this.findOne(id);
    if (quote.status !== 'sent' && quote.status !== 'draft') {
      throw new BadRequestException('Quote cannot be accepted in current status');
    }
    const pending = await this.prisma.approvalRequest.count({
      where: {
        entityType: 'quote',
        entityId: id,
        status: 'pending',
      },
    });
    if (pending > 0) {
      throw new BadRequestException('Quote has pending approvals');
    }
    return this.prisma.quote.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date(), isLocked: false },
      include: { account: true, lineItems: { include: { product: true } } },
    });
  }

  private async recalculateTotals(quoteId: string) {
    const lineItems = await this.prisma.quoteLineItem.findMany({
      where: { quoteId },
    });
    const subtotal = lineItems.reduce(
      (sum, li) => sum.add(li.lineTotal),
      new Prisma.Decimal(0),
    );
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    const taxRate = quote?.taxRate ?? new Prisma.Decimal(0);
    const taxAmount = subtotal.mul(taxRate).div(100);
    const total = subtotal.add(taxAmount);
    const totalCost = lineItems.reduce(
      (sum, li) =>
        sum.add((li.unitCost ?? new Prisma.Decimal(0)).mul(li.quantity)),
      new Prisma.Decimal(0),
    );
    const marginPercent = total.gt(0)
      ? total.sub(totalCost).div(total).mul(100)
      : null;

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { subtotal, taxAmount, total, totalCost, marginPercent },
    });
  }
}