import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Fields tracked per entity for the timeline + audit diff.
const TRACKED: Record<string, string[]> = {
  lead: ['companyName', 'firstName', 'lastName', 'email', 'phone', 'title', 'source', 'status', 'score', 'rating', 'ownerId', 'territoryId', 'description'],
  account: ['name', 'accountType', 'country', 'vatNumber', 'gstNumber', 'tradeLicenseNumber', 'registrationNumber', 'taxId', 'email', 'phone', 'website', 'industry', 'paymentTerms', 'creditLimit', 'ownerId', 'billingAddress', 'shippingAddress'],
  contact: ['firstName', 'lastName', 'email', 'phone', 'mobile', 'title', 'department', 'country', 'address', 'isPrimary'],
  deal: ['name', 'amount', 'probability', 'forecastCategory', 'expectedCloseDate', 'pipelineStageId', 'ownerId'],
};

// entityType -> prisma model delegate name
const MODEL: Record<string, 'lead' | 'account' | 'contact' | 'deal'> = {
  lead: 'lead',
  account: 'account',
  contact: 'contact',
  deal: 'deal',
};

type Row = Record<string, unknown>;

@Injectable()
export class ChangeTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record an update: per-field timeline rows + a reversible audit entry. */
  async recordUpdate(entityType: string, entityId: string, before: Row, after: Row, userId?: string) {
    const fields = TRACKED[entityType] ?? [];
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const history: Row[] = [];

    for (const f of fields) {
      const from = before[f] ?? null;
      const to = after[f] ?? null;
      if (this.serialize(from) === this.serialize(to)) continue;
      changes[f] = { from, to };
      history.push({
        entityType,
        entityId,
        fieldName: f,
        oldValue: this.serialize(from),
        newValue: this.serialize(to),
        changedById: userId,
      });
    }

    if (history.length === 0) return;
    await this.prisma.$transaction([
      this.prisma.fieldHistory.createMany({ data: history as never }),
      this.prisma.auditLog.create({
        data: { entityType, entityId, action: 'update', changes: changes as never, userId },
      }),
    ]);
  }

  /** Record a create (snapshot of initial tracked values). */
  async recordCreate(entityType: string, entityId: string, snapshot: Row, userId?: string) {
    const fields = TRACKED[entityType] ?? [];
    const changes: Record<string, { from: null; to: unknown }> = {};
    for (const f of fields) if (snapshot[f] != null) changes[f] = { from: null, to: snapshot[f] };
    await this.prisma.auditLog.create({
      data: { entityType, entityId, action: 'create', changes: changes as never, userId },
    });
  }

  /** Record a (soft) delete. */
  async recordDelete(entityType: string, entityId: string, userId?: string) {
    await this.prisma.auditLog.create({
      data: { entityType, entityId, action: 'delete', changes: {}, userId },
    });
  }

  /** Merged, time-ordered timeline (field history) for an entity. */
  timeline(entityType: string, entityId: string) {
    return this.prisma.fieldHistory.findMany({
      where: { entityType, entityId },
      include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { changedAt: 'desc' },
      take: 100,
    });
  }

  /** Audit log for an entity (the reversible actions). */
  auditLog(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        revertedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Reverse a previously recorded change (the "undo" button). */
  async revert(auditLogId: string, userId?: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id: auditLogId } });
    if (!log) throw new NotFoundException('Audit entry not found');
    if (log.reverted) throw new BadRequestException('This change was already reverted');

    const model = MODEL[log.entityType];
    if (!model) throw new BadRequestException(`Cannot revert ${log.entityType} changes`);

    const delegate = this.prisma[model] as unknown as {
      update: (args: { where: { id: string }; data: Row }) => Promise<unknown>;
    };

    let data: Row;
    if (log.action === 'update') {
      const changes = (log.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
      data = Object.fromEntries(Object.entries(changes).map(([f, c]) => [f, c.from]));
    } else if (log.action === 'delete') {
      data = { deletedAt: null }; // restore
    } else if (log.action === 'create') {
      data = { deletedAt: new Date() }; // undo a create = soft-delete
    } else {
      throw new BadRequestException(`Cannot revert action "${log.action}"`);
    }

    await delegate.update({ where: { id: log.entityId }, data });
    await this.prisma.auditLog.update({
      where: { id: auditLogId },
      data: { reverted: true, revertedAt: new Date(), revertedById: userId },
    });

    return { reverted: true, entityType: log.entityType, entityId: log.entityId, restored: data };
  }

  private serialize(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }
}
