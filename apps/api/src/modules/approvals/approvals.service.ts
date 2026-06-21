import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MARGIN_THRESHOLD = 25;
const DISCOUNT_THRESHOLD = 15;
const VALUE_THRESHOLD = 50000;

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.approvalRequest.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        requestedBy: true,
        reviewedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    id: string,
    reviewerId: string,
    body: { status: 'approved' | 'rejected'; reviewNotes?: string },
  ) {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Approval request not found');
    if (request.status !== 'pending') {
      throw new BadRequestException('Approval already reviewed');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: body.status,
        reviewedBy: { connect: { id: reviewerId } },
        reviewNotes: body.reviewNotes,
        reviewedAt: new Date(),
      },
      include: { requestedBy: true, reviewedBy: true },
    });

    if (request.entityType === 'quote') {
      await this.prisma.quote.update({
        where: { id: request.entityId },
        data: {
          isLocked: body.status === 'rejected',
          ...(body.status === 'approved' ? { status: 'sent', sentAt: new Date() } : {}),
        },
      });
    }

    return updated;
  }

  async submitQuoteApproval(quoteId: string, requestedById: string) {
    const quote = await this.prisma.quote.findFirst({
      where: { id: quoteId, deletedAt: null },
      include: { lineItems: true },
    });
    if (!quote) throw new NotFoundException('Quote not found');
    if (quote.isLocked) {
      throw new BadRequestException('Quote is locked pending approval');
    }

    const margin = Number(quote.marginPercent ?? 100);
    const maxDiscount = quote.lineItems.reduce(
      (max, li) => Math.max(max, Number(li.discountPercent)),
      0,
    );
    const total = Number(quote.total);

    const requests: Prisma.ApprovalRequestCreateInput[] = [];

    if (margin < MARGIN_THRESHOLD) {
      requests.push({
        entityType: 'quote',
        entityId: quoteId,
        approvalType: 'quote_margin',
        thresholdValue: MARGIN_THRESHOLD,
        actualValue: margin,
        reason: `Margin ${margin.toFixed(1)}% is below ${MARGIN_THRESHOLD}% threshold`,
        requestedBy: { connect: { id: requestedById } },
      });
    }
    if (maxDiscount > DISCOUNT_THRESHOLD) {
      requests.push({
        entityType: 'quote',
        entityId: quoteId,
        approvalType: 'quote_discount',
        thresholdValue: DISCOUNT_THRESHOLD,
        actualValue: maxDiscount,
        reason: `Discount ${maxDiscount}% exceeds ${DISCOUNT_THRESHOLD}% threshold`,
        requestedBy: { connect: { id: requestedById } },
      });
    }
    if (total > VALUE_THRESHOLD) {
      requests.push({
        entityType: 'quote',
        entityId: quoteId,
        approvalType: 'quote_value',
        thresholdValue: VALUE_THRESHOLD,
        actualValue: total,
        reason: `Quote value ${total} exceeds ${VALUE_THRESHOLD} threshold`,
        requestedBy: { connect: { id: requestedById } },
      });
    }

    if (requests.length === 0) {
      return this.prisma.quote.update({
        where: { id: quoteId },
        data: { status: 'sent', sentAt: new Date() },
        include: { account: true, lineItems: true },
      });
    }

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { isLocked: true },
    });

    const created = await Promise.all(
      requests.map((data) =>
        this.prisma.approvalRequest.create({
          data,
          include: { requestedBy: true },
        }),
      ),
    );

    return { quoteId, approvals: created, requiresApproval: true };
  }
}