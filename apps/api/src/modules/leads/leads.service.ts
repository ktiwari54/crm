import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadRating, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeTrackingService } from '../change-tracking/change-tracking.service';

type LeadInput = {
  companyName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  source?: string;
  status?: string;
  ownerId?: string;
  territoryId?: string;
  description?: string;
};

// Source quality weights for lead scoring (0-30).
const SOURCE_WEIGHT: Record<string, number> = {
  referral: 30,
  partner: 25,
  trade_show: 20,
  web: 15,
  cold_call: 5,
  other: 5,
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracking: ChangeTrackingService,
  ) {}

  findAll(status?: string) {
    return this.prisma.lead.findMany({
      where: { deletedAt: null, ...(status ? { status: status as never } : {}) },
      include: { owner: true, territory: true },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { owner: true, territory: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /** Compute a 0-100 fit score + cold/warm/hot rating from lead attributes. */
  computeScore(lead: {
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    companyName?: string | null;
    source?: string | null;
    status?: string | null;
  }): { score: number; rating: LeadRating } {
    let score = 0;
    if (lead.email) score += 20;
    if (lead.phone) score += 15;
    if (lead.title) score += 10;
    if (lead.companyName) score += 10;
    score += SOURCE_WEIGHT[lead.source ?? 'other'] ?? 5;
    if (lead.status === 'qualified') score += 20;
    else if (lead.status === 'working') score += 10;
    score = Math.min(100, score);
    const rating: LeadRating = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
    return { score, rating };
  }

  async create(input: LeadInput, userId?: string) {
    if (!input.companyName) throw new BadRequestException('companyName is required');
    const { score, rating } = this.computeScore(input);
    const lead = await this.prisma.lead.create({
      data: {
        companyName: input.companyName,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        title: input.title,
        source: (input.source as never) ?? 'other',
        status: (input.status as never) ?? 'new',
        score,
        rating,
        scoredAt: new Date(),
        ...(input.ownerId ? { owner: { connect: { id: input.ownerId } } } : {}),
        ...(input.territoryId ? { territory: { connect: { id: input.territoryId } } } : {}),
        description: input.description,
      },
      include: { owner: true, territory: true },
    });
    await this.tracking.recordCreate('lead', lead.id, lead as never, userId);
    return lead;
  }

  async update(id: string, input: Partial<LeadInput>, userId?: string) {
    const before = await this.findOne(id);
    const merged = { ...before, ...input };
    const { score, rating } = this.computeScore(merged as never);
    const after = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.source !== undefined ? { source: input.source as never } : {}),
        ...(input.status !== undefined ? { status: input.status as never } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        score,
        rating,
        scoredAt: new Date(),
      },
      include: { owner: true, territory: true },
    });
    await this.tracking.recordUpdate('lead', id, before as never, after as never, userId);
    return after;
  }

  /** Recompute and persist the score for an existing lead. */
  async rescore(id: string, userId?: string) {
    const before = await this.findOne(id);
    const { score, rating } = this.computeScore(before as never);
    const after = await this.prisma.lead.update({
      where: { id },
      data: { score, rating, scoredAt: new Date() },
      include: { owner: true, territory: true },
    });
    await this.tracking.recordUpdate('lead', id, before as never, after as never, userId);
    return after;
  }

  /** Bulk-create leads from parsed CSV rows. Returns counts + per-row errors. */
  async importRows(rows: Record<string, string>[], userId?: string) {
    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const companyName = r.companyName || r.company || r.Company || r['Company Name'];
      if (!companyName) {
        errors.push({ row: i + 1, message: 'missing companyName' });
        continue;
      }
      try {
        const lead = await this.create(
          {
            companyName,
            firstName: r.firstName || r['First Name'] || undefined,
            lastName: r.lastName || r['Last Name'] || undefined,
            email: r.email || r.Email || undefined,
            phone: r.phone || r.Phone || undefined,
            title: r.title || r.Title || undefined,
            source: r.source || undefined,
          },
          userId,
        );
        created.push(lead.id);
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'failed' });
      }
    }
    return { imported: created.length, failed: errors.length, errors };
  }

  /** Enroll a lead into a nurturing cadence (polymorphic CadenceEnrollment). */
  async enrollCadence(id: string, templateId: string, userId: string) {
    const lead = await this.findOne(id);
    const template = await this.prisma.cadenceTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('Cadence template not found');
    return this.prisma.cadenceEnrollment.create({
      data: {
        templateId,
        entityType: 'lead',
        entityId: lead.id,
        ownerId: lead.ownerId ?? userId,
        status: 'active',
      },
    });
  }

  /** Active nurturing enrollments for a lead. */
  cadenceEnrollments(id: string) {
    return this.prisma.cadenceEnrollment.findMany({
      where: { entityType: 'lead', entityId: id },
      include: { template: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async convert(
    id: string,
    body: {
      accountId?: string;
      createDeal?: boolean;
      account?: {
        country?: string;
        vatNumber?: string;
        gstNumber?: string;
        tradeLicenseNumber?: string;
        registrationNumber?: string;
        email?: string;
        billingAddress?: unknown;
      };
      contact?: { address?: unknown; country?: string; mobile?: string };
    },
    userId?: string,
  ) {
    const lead = await this.findOne(id);
    if (lead.status === 'converted') throw new BadRequestException('Lead already converted');

    const result = await this.prisma.$transaction(async (tx) => {
      let accountId = body.accountId;

      if (!accountId) {
        const account = await tx.account.create({
          data: {
            name: lead.companyName,
            accountType: 'prospect',
            email: body.account?.email ?? lead.email,
            phone: lead.phone,
            country: body.account?.country,
            vatNumber: body.account?.vatNumber,
            gstNumber: body.account?.gstNumber,
            tradeLicenseNumber: body.account?.tradeLicenseNumber,
            registrationNumber: body.account?.registrationNumber,
            billingAddress: (body.account?.billingAddress as never) ?? undefined,
            owner: lead.ownerId ? { connect: { id: lead.ownerId } } : undefined,
            territory: lead.territoryId ? { connect: { id: lead.territoryId } } : undefined,
          },
        });
        accountId = account.id;
        await this.tracking.recordCreate('account', account.id, account as never, userId);
      }

      const contact = await tx.contact.create({
        data: {
          account: { connect: { id: accountId } },
          firstName: lead.firstName ?? 'Unknown',
          lastName: lead.lastName ?? lead.companyName,
          email: lead.email,
          phone: lead.phone,
          mobile: body.contact?.mobile,
          title: lead.title,
          address: (body.contact?.address as never) ?? undefined,
          country: body.contact?.country ?? body.account?.country,
          isPrimary: true,
        },
      });
      await this.tracking.recordCreate('contact', contact.id, contact as never, userId);

      let dealId: string | undefined;
      if (body.createDeal) {
        const stage = await tx.pipelineStage.findFirst({ where: { name: 'RFQ Received' } });
        if (stage) {
          const deal = await tx.deal.create({
            data: {
              name: `${lead.companyName} - Opportunity`,
              account: { connect: { id: accountId } },
              owner: lead.ownerId ? { connect: { id: lead.ownerId } } : undefined,
              pipelineStage: { connect: { id: stage.id } },
              sourceLead: { connect: { id: lead.id } },
            },
          });
          dealId = deal.id;
          // Link the new contact to the deal
          await tx.dealContact.create({ data: { dealId: deal.id, contactId: contact.id } });
        }
      }

      return tx.lead.update({
        where: { id },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          convertedAccount: { connect: { id: accountId } },
          convertedContact: { connect: { id: contact.id } },
          ...(dealId ? { convertedDeal: { connect: { id: dealId } } } : {}),
        },
        include: { convertedAccount: true, convertedContact: true, convertedDeal: true },
      });
    });

    await this.tracking.recordUpdate(
      'lead',
      id,
      { status: lead.status },
      { status: 'converted' },
      userId,
    );
    return result;
  }
}
