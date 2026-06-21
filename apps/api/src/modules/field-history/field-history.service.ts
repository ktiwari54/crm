import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TRACKED_DEAL_FIELDS = [
  'name',
  'amount',
  'probability',
  'forecastCategory',
  'expectedCloseDate',
] as const;

@Injectable()
export class FieldHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  findForEntity(entityType: string, entityId: string) {
    return this.prisma.fieldHistory.findMany({
      where: { entityType, entityId },
      include: { changedBy: true },
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
  }

  async recordDealChanges(
    dealId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    changedById?: string,
  ) {
    const entries = TRACKED_DEAL_FIELDS.flatMap((field) => {
      const oldValue = this.serialize(before[field]);
      const newValue = this.serialize(after[field]);
      if (oldValue === newValue) return [];
      return [
        {
          entityType: 'deal',
          entityId: dealId,
          fieldName: field,
          oldValue,
          newValue,
          changedById,
        },
      ];
    });

    if (entries.length === 0) return;
    await this.prisma.fieldHistory.createMany({ data: entries });
  }

  private serialize(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object' && value !== null && 'toString' in value) {
      return String(value);
    }
    return String(value);
  }
}