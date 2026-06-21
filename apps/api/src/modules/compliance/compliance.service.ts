import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type ScreeningLine = {
  lineItemId: string;
  productId: string;
  sku: string;
  productName: string;
  eccn: string | null;
  blocked: boolean;
  reason: string | null;
};

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async screenQuote(quoteId: string, destinationCountry: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: {
        lineItems: { include: { product: true } },
        account: { select: { name: true } },
      },
    });
    if (!quote) throw new NotFoundException('Quote not found');

    const country = destinationCountry.toUpperCase();
    const lines: ScreeningLine[] = quote.lineItems.map((li) => {
      const restricted = (li.product.exportRestrictedCountries as string[] | null) ?? [];
      const blocked = restricted.includes(country);
      return {
        lineItemId: li.id,
        productId: li.product.id,
        sku: li.product.sku,
        productName: li.product.name,
        eccn: li.product.eccn,
        blocked,
        reason: blocked
          ? `SKU ${li.product.sku} (ECCN ${li.product.eccn ?? 'N/A'}) restricted for ${country}`
          : null,
      };
    });

    const blockedLines = lines.filter((l) => l.blocked);
    const status =
      blockedLines.length > 0
        ? 'blocked'
        : lines.some((l) => l.eccn)
          ? 'warning'
          : 'clear';

    const screening = await this.prisma.exportScreening.create({
      data: {
        quote: { connect: { id: quoteId } },
        destinationCountry: country,
        status: status as never,
        results: { lines, blockedCount: blockedLines.length },
      },
    });

    return {
      screeningId: screening.id,
      quoteId,
      quoteNumber: quote.quoteNumber,
      account: quote.account.name,
      destinationCountry: country,
      status,
      blocked: blockedLines.length > 0,
      blockedLines,
      lines,
      message:
        blockedLines.length > 0
          ? `${blockedLines.length} line(s) blocked for export to ${country}`
          : 'Export screening clear',
    };
  }

  findScreenings(quoteId?: string) {
    return this.prisma.exportScreening.findMany({
      where: quoteId ? { quoteId } : undefined,
      include: {
        quote: { select: { quoteNumber: true, account: { select: { name: true } } } },
      },
      orderBy: { screenedAt: 'desc' },
      take: 50,
    });
  }
}