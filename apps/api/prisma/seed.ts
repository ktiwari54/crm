import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PIPELINE_STAGES = [
  { name: 'RFQ Received', sortOrder: 1, defaultProbability: 10, isClosed: false, isWon: false },
  { name: 'Qualification', sortOrder: 2, defaultProbability: 25, isClosed: false, isWon: false },
  { name: 'Quote Sent', sortOrder: 3, defaultProbability: 50, isClosed: false, isWon: false },
  { name: 'Negotiation', sortOrder: 4, defaultProbability: 75, isClosed: false, isWon: false },
  { name: 'Closed Won', sortOrder: 5, defaultProbability: 100, isClosed: true, isWon: true },
  { name: 'Closed Lost', sortOrder: 6, defaultProbability: 0, isClosed: true, isWon: false },
];

const TELECOM_PIPELINE_STAGES = [
  { name: 'Inquiry', sortOrder: 1, defaultProbability: 15, isClosed: false, isWon: false },
  { name: 'Technical Review', sortOrder: 2, defaultProbability: 35, isClosed: false, isWon: false },
  { name: 'Sample Order', sortOrder: 3, defaultProbability: 55, isClosed: false, isWon: false },
  { name: 'Volume Quote', sortOrder: 4, defaultProbability: 80, isClosed: false, isWon: false },
  { name: 'Closed Won', sortOrder: 5, defaultProbability: 100, isClosed: true, isWon: true },
  { name: 'Closed Lost', sortOrder: 6, defaultProbability: 0, isClosed: true, isWon: false },
];

async function main() {
  console.log('Seeding CRM database...');

  const territory = await prisma.territory.upsert({
    where: { name: 'North America' },
    update: {},
    create: {
      name: 'North America',
      description: 'Default territory for North American accounts',
      isActive: true,
    },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.local' },
    update: {},
    create: {
      email: 'admin@crm.local',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'admin',
      territoryId: territory.id,
      isActive: true,
    },
  });

  const salesRep = await prisma.user.upsert({
    where: { email: 'sarah.sales@crm.local' },
    update: {},
    create: {
      email: 'sarah.sales@crm.local',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'rep',
      territoryId: territory.id,
      isActive: true,
    },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Distribution Center',
      isPrimary: true,
      isActive: true,
    },
  });

  const priceBook = await prisma.priceBook.upsert({
    where: { erpExternalId: 'PB-DEFAULT' },
    update: {},
    create: {
      name: 'Standard Price Book',
      description: 'Default pricing for all accounts',
      currency: 'USD',
      isActive: true,
      isDefault: true,
      erpExternalId: 'PB-DEFAULT',
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    },
  });

  const pipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Default Sales Pipeline',
      isDefault: true,
    },
  });

  for (const stage of PIPELINE_STAGES) {
    await prisma.pipelineStage.upsert({
      where: {
        id: `00000000-0000-0000-0000-${String(stage.sortOrder).padStart(12, '0')}`,
      },
      update: stage,
      create: {
        id: `00000000-0000-0000-0000-${String(stage.sortOrder).padStart(12, '0')}`,
        pipelineId: pipeline.id,
        ...stage,
      },
    });
  }

  const telecomPipeline = await prisma.pipeline.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Components & Telecom',
      isDefault: false,
    },
  });

  for (const stage of TELECOM_PIPELINE_STAGES) {
    await prisma.pipelineStage.upsert({
      where: {
        id: `00000000-0000-0000-0002-${String(stage.sortOrder).padStart(12, '0')}`,
      },
      update: stage,
      create: {
        id: `00000000-0000-0000-0002-${String(stage.sortOrder).padStart(12, '0')}`,
        pipelineId: telecomPipeline.id,
        ...stage,
      },
    });
  }

  const stageRfq = await prisma.pipelineStage.findFirst({
    where: { name: 'RFQ Received', pipelineId: pipeline.id },
  });
  const stageQual = await prisma.pipelineStage.findFirst({
    where: { name: 'Qualification', pipelineId: pipeline.id },
  });
  const stageQuote = await prisma.pipelineStage.findFirst({
    where: { name: 'Quote Sent', pipelineId: pipeline.id },
  });
  const stageNeg = await prisma.pipelineStage.findFirst({
    where: { name: 'Negotiation', pipelineId: pipeline.id },
  });

  const stageTelecomReview = await prisma.pipelineStage.findFirst({
    where: { name: 'Technical Review', pipelineId: telecomPipeline.id },
  });

  const category = await prisma.productCategory.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      name: 'Networking',
      sortOrder: 1,
    },
  });

  const accounts = await Promise.all([
    prisma.account.upsert({
      where: { erpExternalId: 'ACC-1001' },
      update: {},
      create: {
        erpExternalId: 'ACC-1001',
        name: 'TechMart Wholesale',
        accountType: 'customer',
        ownerId: admin.id,
        territoryId: territory.id,
        priceBookId: priceBook.id,
        industry: 'Electronics Retail',
        healthScore: 'active',
        paymentTerms: 'Net 30',
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    }),
    prisma.account.upsert({
      where: { erpExternalId: 'ACC-1002' },
      update: {},
      create: {
        erpExternalId: 'ACC-1002',
        name: 'DataPro Integrators',
        accountType: 'customer',
        ownerId: admin.id,
        territoryId: territory.id,
        priceBookId: priceBook.id,
        industry: 'Systems Integration',
        healthScore: 'at_risk',
        paymentTerms: 'Net 45',
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    }),
    prisma.account.upsert({
      where: { erpExternalId: 'ACC-1003' },
      update: {},
      create: {
        erpExternalId: 'ACC-1003',
        name: 'BrightWave VAR',
        accountType: 'partner',
        ownerId: admin.id,
        territoryId: territory.id,
        priceBookId: priceBook.id,
        industry: 'Value-Added Reseller',
        healthScore: 'active',
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      },
    }),
  ]);

  const contacts = await Promise.all([
    prisma.contact.upsert({
      where: { erpExternalId: 'CON-2001' },
      update: {},
      create: {
        erpExternalId: 'CON-2001',
        accountId: accounts[0].id,
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@techmart.com',
        phone: '+1-555-0101',
        title: 'Procurement Director',
        isPrimary: true,
        syncStatus: 'synced',
      },
    }),
    prisma.contact.upsert({
      where: { erpExternalId: 'CON-2002' },
      update: {},
      create: {
        erpExternalId: 'CON-2002',
        accountId: accounts[1].id,
        firstName: 'Marcus',
        lastName: 'Rivera',
        email: 'm.rivera@datapro.io',
        phone: '+1-555-0102',
        title: 'VP Sales',
        isPrimary: true,
        syncStatus: 'synced',
      },
    }),
    prisma.contact.upsert({
      where: { erpExternalId: 'CON-2003' },
      update: {},
      create: {
        erpExternalId: 'CON-2003',
        accountId: accounts[2].id,
        firstName: 'Emily',
        lastName: 'Park',
        email: 'emily@brightwave.com',
        title: 'Account Manager',
        isPrimary: true,
        syncStatus: 'synced',
      },
    }),
  ]);

  const leads = await Promise.all([
    prisma.lead.upsert({
      where: { id: '00000000-0000-0000-0000-000000000201' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000201',
        companyName: 'Nova Systems LLC',
        firstName: 'James',
        lastName: 'Okonkwo',
        email: 'j.okonkwo@novasystems.com',
        phone: '+1-555-0201',
        source: 'web',
        status: 'new',
        ownerId: admin.id,
        territoryId: territory.id,
      },
    }),
    prisma.lead.upsert({
      where: { id: '00000000-0000-0000-0000-000000000202' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000202',
        companyName: 'Pacific AV Group',
        firstName: 'Lisa',
        lastName: 'Tanaka',
        email: 'lisa@pacificav.com',
        source: 'trade_show',
        status: 'working',
        ownerId: admin.id,
        territoryId: territory.id,
      },
    }),
  ]);

  const products = await Promise.all([
    ['SW-48P-POE', 'Cisco Catalyst 48-Port PoE Switch', 2899.0, 2100.0, 145],
    ['RT-AX6000', 'ASUS AX6000 WiFi 6 Router', 349.99, 220.0, 320],
    ['SSD-2TB-NVMe', 'Samsung 2TB NVMe Enterprise SSD', 189.0, 120.0, 8],
    ['CAM-4K-PTZ', 'Sony 4K PTZ Conference Camera', 1299.0, 890.0, 42],
    ['UPS-3KVA', 'APC 3kVA Smart UPS', 899.0, 620.0, 65],
    ['CBL-CAT6-305', 'Cat6 Bulk Cable 305m Box', 129.0, 75.0, 500],
  ].map(([sku, name, listPrice, costPrice, atp], i) =>
    prisma.product.upsert({
      where: { sku: sku as string },
      update: {},
      create: {
        erpExternalId: `PRD-${sku}`,
        sku: sku as string,
        name: name as string,
        manufacturer: (name as string).split(' ')[0],
        categoryId: category.id,
        listPrice,
        costPrice,
        unitOfMeasure: 'EA',
        isActive: true,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        inventoryLevels: {
          create: {
            warehouseId: warehouse.id,
            onHand: atp as number,
            allocated: 0,
            onOrder: 0,
            atp: atp as number,
            backorderQty: 0,
            lastSyncedAt: new Date(),
          },
        },
        priceBookEntries: {
          create: {
            priceBookId: priceBook.id,
            unitPrice: listPrice as number,
            syncStatus: 'synced',
          },
        },
      },
    }),
  ));

  const deals = await Promise.all([
    prisma.deal.upsert({
      where: { id: '00000000-0000-0000-0000-000000000301' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000301',
        name: 'TechMart Q2 Network Refresh',
        accountId: accounts[0].id,
        ownerId: admin.id,
        pipelineStageId: stageQuote!.id,
        amount: 125000,
        probability: 50,
        expectedCloseDate: new Date('2026-07-15'),
      },
    }),
    prisma.deal.upsert({
      where: { id: '00000000-0000-0000-0000-000000000302' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000302',
        name: 'DataPro SSD Bulk Order',
        accountId: accounts[1].id,
        ownerId: admin.id,
        pipelineStageId: stageNeg!.id,
        amount: 48000,
        probability: 75,
        expectedCloseDate: new Date('2026-06-30'),
      },
    }),
    prisma.deal.upsert({
      where: { id: '00000000-0000-0000-0000-000000000303' },
      update: { pipelineStageId: stageTelecomReview!.id, probability: 35 },
      create: {
        id: '00000000-0000-0000-0000-000000000303',
        name: 'BrightWave AV Bundle',
        accountId: accounts[2].id,
        ownerId: admin.id,
        pipelineStageId: stageTelecomReview!.id,
        amount: 32000,
        probability: 35,
        expectedCloseDate: new Date('2026-08-01'),
      },
    }),
    prisma.deal.upsert({
      where: { id: '00000000-0000-0000-0000-000000000304' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000304',
        name: 'TechMart UPS Expansion',
        accountId: accounts[0].id,
        ownerId: admin.id,
        pipelineStageId: stageRfq!.id,
        amount: 18500,
        probability: 10,
        expectedCloseDate: new Date('2026-07-30'),
      },
    }),
  ]);

  await prisma.dealContact.createMany({
    data: [
      {
        dealId: deals[0].id,
        contactId: contacts[0].id,
        role: 'decision_maker',
        isPrimary: true,
      },
      {
        dealId: deals[1].id,
        contactId: contacts[1].id,
        role: 'influencer',
        isPrimary: true,
      },
    ],
    skipDuplicates: true,
  });

  const quote = await prisma.quote.upsert({
    where: { quoteNumber: 'Q-2026-00001' },
    update: {},
    create: {
      quoteNumber: 'Q-2026-00001',
      accountId: accounts[0].id,
      dealId: deals[0].id,
      ownerId: admin.id,
      priceBookId: priceBook.id,
      status: 'sent',
      taxRate: 8.25,
      validUntil: new Date('2026-07-01'),
      sentAt: new Date(),
      subtotal: 8697,
      taxAmount: 717.5,
      total: 9414.5,
      totalCost: 6300,
      marginPercent: 33.1,
      lineItems: {
        create: [
          {
            productId: products[0].id,
            lineNumber: 1,
            quantity: 3,
            unitPrice: 2899,
            unitCost: 2100,
            discountPercent: 0,
            lineTotal: 8697,
            warehouseId: warehouse.id,
            atpAtQuoteTime: 145,
            atpWarning: false,
          },
        ],
      },
    },
  });

  const quoteExport = await prisma.quote.upsert({
    where: { quoteNumber: 'Q-2026-00002' },
    update: {},
    create: {
      quoteNumber: 'Q-2026-00002',
      accountId: accounts[1].id,
      dealId: deals[1].id,
      ownerId: admin.id,
      priceBookId: priceBook.id,
      status: 'draft',
      taxRate: 8.25,
      subtotal: 3780,
      taxAmount: 311.85,
      total: 4091.85,
      totalCost: 2400,
      marginPercent: 41.3,
      lineItems: {
        create: [
          {
            productId: products[2].id,
            lineNumber: 1,
            quantity: 20,
            unitPrice: 189,
            unitCost: 120,
            discountPercent: 0,
            lineTotal: 3780,
            warehouseId: warehouse.id,
            atpAtQuoteTime: 8,
            atpWarning: true,
          },
        ],
      },
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);

  await prisma.activity.createMany({
    data: [
      {
        activityType: 'call',
        subject: 'Follow up on network refresh quote',
        status: 'open',
        priority: 'high',
        dueAt: new Date(),
        ownerId: admin.id,
        relatedType: 'deal',
        relatedId: deals[0].id,
      },
      {
        activityType: 'task',
        subject: 'Send revised SSD pricing to DataPro',
        status: 'open',
        priority: 'normal',
        dueAt: tomorrow,
        ownerId: admin.id,
        relatedType: 'deal',
        relatedId: deals[1].id,
      },
      {
        activityType: 'meeting',
        subject: 'Discovery call with Nova Systems',
        status: 'open',
        priority: 'normal',
        dueAt: yesterday,
        ownerId: admin.id,
        relatedType: 'lead',
        relatedId: leads[0].id,
      },
      {
        activityType: 'call',
        subject: 'Quarterly review with TechMart',
        status: 'completed',
        priority: 'normal',
        dueAt: new Date('2026-06-10'),
        completedAt: new Date('2026-06-10'),
        ownerId: admin.id,
        relatedType: 'account',
        relatedId: accounts[0].id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.deal.update({
    where: { id: deals[0].id },
    data: { forecastCategory: 'commit' },
  });
  await prisma.deal.update({
    where: { id: deals[1].id },
    data: { forecastCategory: 'best_case' },
  });

  const forecastPeriod = await prisma.forecastPeriod.upsert({
    where: { id: '00000000-0000-0000-0000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000401',
      name: 'Q3 2026',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      isActive: true,
    },
  });

  await prisma.forecastEntry.createMany({
    data: [
      {
        periodId: forecastPeriod.id,
        userId: admin.id,
        dealId: deals[0].id,
        category: 'commit',
        amount: 125000,
      },
      {
        periodId: forecastPeriod.id,
        userId: admin.id,
        dealId: deals[1].id,
        category: 'best_case',
        amount: 48000,
      },
    ],
    skipDuplicates: true,
  });

  const cadenceTemplate = await prisma.cadenceTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000501' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000501',
      name: 'Quote Follow-Up',
      description: '3-step sequence after quote is sent',
      steps: {
        create: [
          { stepNumber: 1, stepType: 'email', subject: 'Quote follow-up email', delayDays: 0 },
          { stepNumber: 2, stepType: 'call', subject: 'Check in call', delayDays: 2 },
          { stepNumber: 3, stepType: 'task', subject: 'Send revised pricing if needed', delayDays: 5 },
        ],
      },
    },
  });

  await prisma.cadenceEnrollment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000502' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000502',
      templateId: cadenceTemplate.id,
      entityType: 'deal',
      entityId: deals[0].id,
      ownerId: admin.id,
      currentStep: 2,
    },
  });

  const contract = await prisma.contract.upsert({
    where: { contractNumber: 'CTR-2026-00001' },
    update: {},
    create: {
      contractNumber: 'CTR-2026-00001',
      accountId: accounts[0].id,
      dealId: deals[0].id,
      ownerId: admin.id,
      title: 'TechMart Annual Supply Agreement',
      status: 'active',
      value: 500000,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      signedAt: new Date('2025-12-15'),
    },
  });

  await prisma.approvalRequest.upsert({
    where: { id: '00000000-0000-0000-0000-000000000601' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000601',
      entityType: 'quote',
      entityId: quote.id,
      approvalType: 'quote_value',
      status: 'approved',
      requestedById: admin.id,
      reviewedById: admin.id,
      thresholdValue: 50000,
      actualValue: 9414.5,
      reason: 'High-value quote review',
      reviewedAt: new Date(),
    },
  });

  await prisma.productConstraint.upsert({
    where: { id: '00000000-0000-0000-0000-000000000701' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000701',
      name: 'PoE Switch requires Cat6 Cable',
      constraintType: 'requires',
      productId: products[0].id,
      relatedProductId: products[5].id,
      message: '48-port PoE switches require bulk Cat6 cable for installation',
    },
  });

  await prisma.dealTeamMember.upsert({
    where: {
      dealId_userId: { dealId: deals[0].id, userId: salesRep.id },
    },
    update: {},
    create: {
      dealId: deals[0].id,
      userId: salesRep.id,
      role: 'sales_engineer',
      revenueSplitPercent: 25,
    },
  });

  await prisma.dealTeamMember.upsert({
    where: {
      dealId_userId: { dealId: deals[1].id, userId: salesRep.id },
    },
    update: {},
    create: {
      dealId: deals[1].id,
      userId: salesRep.id,
      role: 'sales_rep',
      revenueSplitPercent: 50,
    },
  });

  await prisma.dealStageHistory.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000801',
        dealId: deals[0].id,
        fromStageId: stageRfq!.id,
        toStageId: stageQual!.id,
        changedById: admin.id,
        amount: 125000,
        probability: 25,
        changedAt: new Date('2026-05-10T10:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000802',
        dealId: deals[0].id,
        fromStageId: stageQual!.id,
        toStageId: stageQuote!.id,
        changedById: salesRep.id,
        amount: 125000,
        probability: 50,
        changedAt: new Date('2026-05-28T14:30:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000803',
        dealId: deals[1].id,
        fromStageId: stageQuote!.id,
        toStageId: stageNeg!.id,
        changedById: admin.id,
        amount: 48000,
        probability: 75,
        changedAt: new Date('2026-06-05T09:15:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.fieldHistory.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000a01',
        entityType: 'deal',
        entityId: deals[0].id,
        fieldName: 'forecastCategory',
        oldValue: 'pipeline',
        newValue: 'commit',
        changedById: admin.id,
        changedAt: new Date('2026-06-01T11:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000a02',
        entityType: 'deal',
        entityId: deals[0].id,
        fieldName: 'amount',
        oldValue: '115000',
        newValue: '125000',
        changedById: salesRep.id,
        changedAt: new Date('2026-05-20T16:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000a03',
        entityType: 'deal',
        entityId: deals[1].id,
        fieldName: 'forecastCategory',
        oldValue: 'pipeline',
        newValue: 'best_case',
        changedById: admin.id,
        changedAt: new Date('2026-06-08T09:30:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.feedPost.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000b01',
        body: 'TechMart confirmed budget approval for Q2 network refresh. @Sarah please schedule technical review call.',
        entityType: 'deal',
        entityId: deals[0].id,
        authorId: admin.id,
        createdAt: new Date('2026-06-18T10:00:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000b02',
        body: 'Spoke with DataPro — they need revised SSD pricing by Friday. Margin is tight on this one.',
        entityType: 'deal',
        entityId: deals[1].id,
        authorId: salesRep.id,
        createdAt: new Date('2026-06-17T14:30:00Z'),
      },
      {
        id: '00000000-0000-0000-0000-000000000b03',
        body: 'Q3 forecast sync complete. Commit bucket looking strong for North America territory.',
        authorId: admin.id,
        createdAt: new Date('2026-06-19T08:00:00Z'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.currencyRate.createMany({
    data: [
      { id: '00000000-0000-0000-0000-000000000c01', fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.92 },
      { id: '00000000-0000-0000-0000-000000000c02', fromCurrency: 'USD', toCurrency: 'GBP', rate: 0.79 },
      { id: '00000000-0000-0000-0000-000000000c03', fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.087 },
      { id: '00000000-0000-0000-0000-000000000c04', fromCurrency: 'GBP', toCurrency: 'USD', rate: 1.265 },
    ],
    skipDuplicates: true,
  });

  const eurPriceBook = await prisma.priceBook.upsert({
    where: { erpExternalId: 'PB-EUR' },
    update: {},
    create: {
      name: 'EU Price Book',
      description: 'Euro pricing for European accounts',
      currency: 'EUR',
      isActive: true,
      isDefault: false,
      erpExternalId: 'PB-EUR',
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    },
  });

  await prisma.account.update({
    where: { id: accounts[2].id },
    data: { currency: 'EUR', priceBookId: eurPriceBook.id },
  });

  await prisma.quote.update({
    where: { id: quote.id },
    data: { currency: 'USD' },
  });

  await prisma.sellingPlaybook.upsert({
    where: { id: '00000000-0000-0000-0000-000000000d01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000d01',
      name: 'Network Refresh — Quote Sent',
      description: 'Guided flow for enterprise network refresh deals at quote stage',
      stageName: 'Quote Sent',
      steps: {
        create: [
          {
            stepNumber: 1,
            title: 'Confirm technical requirements',
            question: 'Does the customer need PoE on all 48 ports?',
            action: 'Review product constraints and bundle Cat6 cable',
            productHint: 'SW-48P-POE, CBL-CAT6-305',
          },
          {
            stepNumber: 2,
            title: 'Validate ATP and lead time',
            question: 'Is warehouse ATP sufficient for full order quantity?',
            action: 'Check inventory levels in Products module',
          },
          {
            stepNumber: 3,
            title: 'Margin check',
            question: 'Is margin above 25% after discounts?',
            action: 'Submit for approval if below threshold',
          },
        ],
      },
    },
  });

  await prisma.sellingPlaybook.upsert({
    where: { id: '00000000-0000-0000-0000-000000000d02' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000d02',
      name: 'Qualification Discovery',
      stageName: 'Qualification',
      steps: {
        create: [
          { stepNumber: 1, title: 'Identify stakeholders', question: 'Who is the decision maker vs technical evaluator?', action: 'Add contacts to deal' },
          { stepNumber: 2, title: 'Budget confirmation', question: 'Is budget approved for this fiscal year?', action: 'Update deal amount and forecast category' },
        ],
      },
    },
  });

  const callScript = await prisma.callScript.upsert({
    where: { id: '00000000-0000-0000-0000-000000000e01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000e01',
      name: 'Quote Follow-Up',
      category: 'quote_followup',
      description: 'Standard follow-up after sending a quote',
      scriptBody: `Hi [Contact Name], this is [Rep Name] from [Company].

I'm following up on quote [Quote Number] we sent for [Deal Name].

Do you have any questions on the pricing or product specs? I'd be happy to walk through the ATP and lead times.

If everything looks good, we can lock in pricing before [Valid Until Date].

Thank you!`,
    },
  });

  await prisma.callScript.upsert({
    where: { id: '00000000-0000-0000-0000-000000000e02' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000e02',
      name: 'Discovery Call — New Account',
      category: 'discovery',
      scriptBody: `Opening: Thanks for taking the time today.

1. What product categories are you sourcing this quarter?
2. Who are your top manufacturers / lines?
3. What are typical order volumes and frequency?
4. Any upcoming projects or refresh cycles?

Close: I'll send a tailored quote within 48 hours.`,
    },
  });

  await prisma.blueprintRule.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000f01',
        name: 'Quote required for Quote Sent stage',
        entityType: 'deal',
        pipelineStageId: stageQuote!.id,
        requirement: 'quote_sent',
        message: 'Send a quote before moving the deal to Quote Sent',
      },
      {
        id: '00000000-0000-0000-0000-000000000f02',
        name: 'Approval required for Negotiation',
        entityType: 'deal',
        pipelineStageId: stageNeg!.id,
        requirement: 'quote_approved',
        message: 'Quote must be approved before entering Negotiation',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.activity.updateMany({
    where: { subject: 'Follow up on network refresh quote' },
    data: { callScriptId: callScript.id },
  });

  await prisma.document.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000901',
        name: 'TechMart Network Refresh RFP.pdf',
        fileUrl: '/files/demo/techmart-rfp.pdf',
        mimeType: 'application/pdf',
        fileSize: 2457600,
        accountId: accounts[0].id,
        dealId: deals[0].id,
        uploadedById: admin.id,
      },
      {
        id: '00000000-0000-0000-0000-000000000902',
        name: 'Catalyst 48P PoE Datasheet.pdf',
        fileUrl: '/files/demo/catalyst-48p-datasheet.pdf',
        mimeType: 'application/pdf',
        fileSize: 524288,
        dealId: deals[0].id,
        quoteId: quote.id,
        uploadedById: salesRep.id,
      },
      {
        id: '00000000-0000-0000-0000-000000000903',
        name: 'TechMart Annual Supply Agreement.pdf',
        fileUrl: '/files/demo/techmart-contract.pdf',
        mimeType: 'application/pdf',
        fileSize: 1048576,
        accountId: accounts[0].id,
        contractId: contract.id,
        uploadedById: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Phase 3–5: Batches 6–9 ───────────────────────────────────────────────

  const vendorCisco = await prisma.vendor.upsert({
    where: { code: 'CISCO-DIST' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b601',
      name: 'Cisco Authorized Distributor',
      code: 'CISCO-DIST',
      contactEmail: 'orders@cisco-dist.com',
      leadTimeDays: 7,
      erpExternalId: 'VND-CISCO',
    },
  });

  const vendorSamsung = await prisma.vendor.upsert({
    where: { code: 'SAMSUNG-OEM' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b602',
      name: 'Samsung Storage OEM',
      code: 'SAMSUNG-OEM',
      contactEmail: 'supply@samsung-oem.com',
      leadTimeDays: 21,
      erpExternalId: 'VND-SAMSUNG',
    },
  });

  await prisma.vendorProduct.createMany({
    data: [
      { id: '00000000-0000-0000-0000-00000000b611', vendorId: vendorCisco.id, productId: products[0].id, moq: 1, leadTimeDays: 7, unitCost: 2050, isPrimary: true },
      { id: '00000000-0000-0000-0000-00000000b612', vendorId: vendorSamsung.id, productId: products[2].id, moq: 10, leadTimeDays: 21, unitCost: 115, isPrimary: true },
      { id: '00000000-0000-0000-0000-00000000b613', vendorId: vendorCisco.id, productId: products[5].id, moq: 5, leadTimeDays: 5, unitCost: 70, isPrimary: false },
    ],
    skipDuplicates: true,
  });

  const campaign = await prisma.marketingCampaign.upsert({
    where: { id: '00000000-0000-0000-0000-00000000b701' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b701',
      name: 'Q3 Dealer Reorder Nurture',
      campaignType: 'nurture',
      status: 'active',
      targetSegment: 'Active customers — networking',
      budget: 15000,
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      ownerId: admin.id,
      description: 'Account-based nurture for networking SKU replenishment',
    },
  });

  await prisma.campaignMember.createMany({
    data: [
      { id: '00000000-0000-0000-0000-00000000b711', campaignId: campaign.id, accountId: accounts[0].id, status: 'enrolled' },
      { id: '00000000-0000-0000-0000-00000000b712', campaignId: campaign.id, accountId: accounts[1].id, status: 'sent' },
    ],
    skipDuplicates: true,
  });

  const kbArticle = await prisma.knowledgeArticle.upsert({
    where: { id: '00000000-0000-0000-0000-00000000b801' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b801',
      title: 'Catalyst 48P PoE — Power Budget Troubleshooting',
      body: 'If PoE ports fail to power devices:\n1. Verify total power budget (740W max)\n2. Check PD class per port\n3. Ensure firmware 17.6+\n4. Run show power inline for diagnostics',
      category: 'troubleshooting',
      status: 'published',
      productId: products[0].id,
      viewCount: 42,
      authorId: admin.id,
      publishedAt: new Date('2026-03-01'),
    },
  });

  await prisma.knowledgeArticle.upsert({
    where: { id: '00000000-0000-0000-0000-00000000b802' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b802',
      title: 'Enterprise SSD Warranty Policy',
      body: 'Samsung enterprise SSDs carry 5-year limited warranty. RMA requires serial number, proof of purchase, and SMART log export.',
      category: 'warranty',
      status: 'published',
      productId: products[2].id,
      viewCount: 18,
      authorId: salesRep.id,
      publishedAt: new Date('2026-01-15'),
    },
  });

  await prisma.dealRegistration.upsert({
    where: { registrationNumber: 'DR-2026-00001' },
    update: {},
    create: {
      registrationNumber: 'DR-2026-00001',
      partnerAccountId: accounts[2].id,
      dealName: 'Metro School District AV Upgrade',
      amount: 85000,
      expectedCloseDate: new Date('2026-09-15'),
      status: 'pending',
      registeredById: salesRep.id,
      notes: 'Partner-led opportunity — protect for 90 days',
    },
  });

  await prisma.portalAccess.upsert({
    where: {
      accountId_contactEmail: {
        accountId: accounts[2].id,
        contactEmail: 'emily@brightwave.com',
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000b901',
      accountId: accounts[2].id,
      contactEmail: 'emily@brightwave.com',
      accessToken: 'demo-portal-token-brightwave',
      lastLoginAt: new Date('2026-06-15'),
    },
  });

  const accountPlan = await prisma.accountPlan.upsert({
    where: { id: '00000000-0000-0000-0000-00000000ba01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000ba01',
      accountId: accounts[0].id,
      title: 'TechMart FY2026 Growth Plan',
      fiscalYear: 2026,
      status: 'active',
      swotStrengths: 'Long-term relationship, high order frequency, strong payment history',
      swotWeaknesses: 'Margin pressure on networking SKUs, limited upsell to services',
      swotOpportunities: 'Q3 network refresh, UPS expansion, WiFi 6 upgrade cycle',
      swotThreats: 'Competitor direct-ship programs, Cisco allocation constraints',
      ownerId: admin.id,
      goals: {
        create: [
          { id: '00000000-0000-0000-0000-00000000ba11', title: 'Close Q2 network refresh ($125K)', status: 'in_progress', dueDate: new Date('2026-07-15'), ownerId: admin.id },
          { id: '00000000-0000-0000-0000-00000000ba12', title: 'Expand UPS line by 40%', status: 'not_started', dueDate: new Date('2026-09-30'), ownerId: salesRep.id },
        ],
      },
    },
  });

  await prisma.mutualActionPlan.upsert({
    where: { id: '00000000-0000-0000-0000-00000000bb01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bb01',
      accountPlanId: accountPlan.id,
      title: 'TechMart Q2 Network Refresh — Joint Plan',
      customerContact: 'Sarah Chen (sarah.chen@techmart.com)',
      status: 'active',
      milestones: {
        create: [
          { id: '00000000-0000-0000-0000-00000000bb11', title: 'Technical discovery workshop', sortOrder: 1, ownerParty: 'vendor', status: 'completed', dueDate: new Date('2026-05-15') },
          { id: '00000000-0000-0000-0000-00000000bb12', title: 'Site survey & BOM validation', sortOrder: 2, ownerParty: 'customer', status: 'in_progress', dueDate: new Date('2026-06-30') },
          { id: '00000000-0000-0000-0000-00000000bb13', title: 'Executive pricing approval', sortOrder: 3, ownerParty: 'vendor', status: 'pending', dueDate: new Date('2026-07-10') },
          { id: '00000000-0000-0000-0000-00000000bb14', title: 'PO issuance & deployment kickoff', sortOrder: 4, ownerParty: 'customer', status: 'pending', dueDate: new Date('2026-07-25') },
        ],
      },
    },
  });

  const enablementPath = await prisma.enablementPath.upsert({
    where: { id: '00000000-0000-0000-0000-00000000bc01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bc01',
      name: 'BrightWave Gold Partner Certification',
      tier: 'gold',
      description: 'Required training for Gold-tier VAR partners — product, sales, and support modules',
      partnerAccountId: accounts[2].id,
      modules: {
        create: [
          { id: '00000000-0000-0000-0000-00000000bc11', title: 'Product Portfolio Overview', description: 'Networking, AV, and power SKU catalog', sortOrder: 1, durationMinutes: 45 },
          { id: '00000000-0000-0000-0000-00000000bc12', title: 'Deal Registration & MDF Process', description: 'PRM workflows and co-marketing funds', sortOrder: 2, durationMinutes: 30 },
          { id: '00000000-0000-0000-0000-00000000bc13', title: 'Technical Support Escalation', description: 'RMA, cases, and installed base management', sortOrder: 3, durationMinutes: 40 },
        ],
      },
    },
  });

  await prisma.enablementEnrollment.upsert({
    where: {
      pathId_partnerAccountId: {
        pathId: enablementPath.id,
        partnerAccountId: accounts[2].id,
      },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bc21',
      pathId: enablementPath.id,
      partnerAccountId: accounts[2].id,
      status: 'in_progress',
      completedModules: 1,
      startedAt: new Date('2026-06-01'),
    },
  });

  const oldOrderDate = new Date();
  oldOrderDate.setDate(oldOrderDate.getDate() - 75);

  const demoOrder = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2026-00001' },
    update: {},
    create: {
      orderNumber: 'ORD-2026-00001',
      accountId: accounts[0].id,
      quoteId: quote.id,
      dealId: deals[0].id,
      ownerId: admin.id,
      status: 'delivered',
      subtotal: 8697,
      taxAmount: 717.5,
      total: 9414.5,
      shippedAt: oldOrderDate,
      deliveredAt: oldOrderDate,
      createdAt: oldOrderDate,
      lineItems: {
        create: [
          { productId: products[0].id, lineNumber: 1, quantity: 3, unitPrice: 2899, lineTotal: 8697, warehouseId: warehouse.id },
        ],
      },
    },
  });

  // Batch 11: fulfillment plan with fallout on pick task
  const overdue = new Date();
  overdue.setHours(overdue.getHours() - 12);
  await prisma.fulfillmentTask.createMany({
    data: [
      { id: '00000000-0000-0000-0000-00000000d101', orderId: demoOrder.id, taskType: 'allocate', status: 'completed', sortOrder: 1, completedAt: oldOrderDate },
      { id: '00000000-0000-0000-0000-00000000d102', orderId: demoOrder.id, taskType: 'pick', status: 'failed', sortOrder: 2, dueAt: overdue, errorMessage: 'SKU allocation mismatch — warehouse pick rejected' },
      { id: '00000000-0000-0000-0000-00000000d103', orderId: demoOrder.id, taskType: 'pack', status: 'pending', sortOrder: 3 },
      { id: '00000000-0000-0000-0000-00000000d104', orderId: demoOrder.id, taskType: 'ship', status: 'pending', sortOrder: 4 },
      { id: '00000000-0000-0000-0000-00000000d105', orderId: demoOrder.id, taskType: 'deliver', status: 'pending', sortOrder: 5 },
    ],
    skipDuplicates: true,
  });

  const clausePayment = await prisma.contractClause.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d201',
      name: 'Payment Terms — Net 30',
      category: 'payment',
      body: 'Buyer shall remit payment within thirty (30) days of invoice date. Late payments accrue interest at 1.5% per month.',
    },
  });

  const clauseWarranty = await prisma.contractClause.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d202' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d202',
      name: 'Limited Warranty',
      category: 'warranty',
      body: 'Manufacturer standard warranty applies. Distributor passes through OEM warranty terms. RMA subject to approval.',
    },
  });

  await prisma.contractTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d301',
      name: 'Annual Supply Agreement',
      description: 'Standard B2B distribution supply agreement template',
      body: 'This Agreement governs the supply of electronic products between Distributor and Customer for the term specified.',
      clauseIds: [clausePayment.id, clauseWarranty.id],
    },
  });

  const asset = await prisma.installedAsset.upsert({
    where: { serialNumber: 'CAT48P-2024-00142' },
    update: {
      lotNumber: 'LOT-2024-CAT48-001',
      imei: null,
      macAddress: '00:1A:2B:3C:4D:5E',
    },
    create: {
      id: '00000000-0000-0000-0000-00000000bb01',
      serialNumber: 'CAT48P-2024-00142',
      lotNumber: 'LOT-2024-CAT48-001',
      macAddress: '00:1A:2B:3C:4D:5E',
      productId: products[0].id,
      accountId: accounts[0].id,
      orderId: demoOrder.id,
      installDate: new Date('2024-06-15'),
      warrantyEndDate: new Date('2027-06-15'),
      status: 'active',
      notes: 'Installed at TechMart DC-East',
    },
  });

  await prisma.installedAsset.upsert({
    where: { serialNumber: 'SSD-NVME-2025-00891' },
    update: {
      lotNumber: 'LOT-2025-NVME-042',
      imei: '356938035643809',
    },
    create: {
      id: '00000000-0000-0000-0000-00000000bb02',
      serialNumber: 'SSD-NVME-2025-00891',
      lotNumber: 'LOT-2025-NVME-042',
      imei: '356938035643809',
      productId: products[2].id,
      accountId: accounts[1].id,
      installDate: new Date('2025-11-01'),
      warrantyEndDate: new Date('2026-08-15'),
      status: 'active',
    },
  });

  await prisma.serviceCase.upsert({
    where: { caseNumber: 'CASE-2026-00001' },
    update: {
      category: 'Networking',
      routingQueue: 'networking',
    },
    create: {
      caseNumber: 'CASE-2026-00001',
      accountId: accounts[0].id,
      contactId: contacts[0].id,
      subject: 'PoE ports not powering APs on Catalyst switch',
      description: '3 of 48 ports showing power fault after firmware update',
      status: 'working',
      priority: 'high',
      category: 'Networking',
      routingQueue: 'networking',
      ownerId: salesRep.id,
      assetId: asset.id,
      knowledgeArticleId: kbArticle.id,
      slaDueAt: new Date(Date.now() + 86400000),
    },
  });

  await prisma.serviceCase.upsert({
    where: { caseNumber: 'CASE-2025-00142' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bf01',
      caseNumber: 'CASE-2025-00142',
      accountId: accounts[0].id,
      subject: 'Catalyst switch PoE power fault after firmware',
      description: 'Resolved by rolling back firmware and resetting PoE budget',
      status: 'resolved',
      priority: 'high',
      category: 'Networking',
      routingQueue: 'networking',
      ownerId: salesRep.id,
      resolvedAt: new Date('2025-11-20'),
    },
  });

  await prisma.serviceCase.upsert({
    where: { caseNumber: 'CASE-2025-00089' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bf02',
      caseNumber: 'CASE-2025-00089',
      accountId: accounts[1].id,
      subject: 'Network switch connectivity intermittent',
      description: 'Resolved — replaced faulty SFP module',
      status: 'resolved',
      priority: 'medium',
      category: 'Networking',
      routingQueue: 'networking',
      ownerId: admin.id,
      resolvedAt: new Date('2025-09-10'),
    },
  });

  await prisma.rmaRequest.upsert({
    where: { rmaNumber: 'RMA-2026-00001' },
    update: {},
    create: {
      rmaNumber: 'RMA-2026-00001',
      assetId: asset.id,
      accountId: accounts[0].id,
      reason: 'Intermittent port failures — suspected hardware defect',
      status: 'requested',
    },
  });

  await prisma.aiInsight.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-00000000bc01',
        entityType: 'account',
        entityId: accounts[1].id,
        insightType: 'churn_risk',
        title: 'Churn risk: DataPro Integrators',
        content: 'Health score at_risk. No orders in 90+ days. Last deal stalled in Negotiation.',
        score: 0.72,
      },
      {
        id: '00000000-0000-0000-0000-00000000bc02',
        entityType: 'deal',
        entityId: deals[0].id,
        insightType: 'deal_score',
        title: 'Deal score: TechMart Q2 Network Refresh',
        content: 'High engagement (4 activities), quote sent, forecast commit. Win probability ~65%.',
        score: 0.65,
      },
      {
        id: '00000000-0000-0000-0000-00000000bc03',
        entityType: 'account',
        entityId: accounts[0].id,
        insightType: 'next_best_action',
        title: 'Reorder: TechMart Wholesale',
        content: 'Last order 75 days ago (SW-48P-POE). Suggest replenishment quote.',
        score: 0.82,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Batch 10: MDF, Incidents, Journeys, Email Hub ───────────────────────

  await prisma.mdfRequest.upsert({
    where: { requestNumber: 'MDF-2026-00001' },
    update: {},
    create: {
      requestNumber: 'MDF-2026-00001',
      partnerAccountId: accounts[2].id,
      title: 'BrightWave Q3 Trade Show Booth',
      amount: 12000,
      status: 'submitted',
      purpose: 'Co-branded booth at Channel Partners Expo — lead gen for AV bundle',
      eventDate: new Date('2026-09-10'),
      requestedById: salesRep.id,
    },
  });

  const incident = await prisma.incident.upsert({
    where: { incidentNumber: 'INC-2026-00001' },
    update: {},
    create: {
      incidentNumber: 'INC-2026-00001',
      title: 'Cisco switch firmware — PoE power fault',
      description: 'Multiple customers reporting PoE port failures after FW 17.9.3 push. Vendor investigating.',
      status: 'monitoring',
      severity: 'high',
      ownerId: admin.id,
      accounts: {
        create: [
          { accountId: accounts[0].id },
          { accountId: accounts[1].id },
        ],
      },
    },
  });

  const onboardingJourney = await prisma.customerJourney.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c701' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c701',
      name: 'New Dealer Onboarding',
      description: 'Welcome → credit setup → first order → 30-day check-in',
      triggerEvent: 'account_created',
      ownerId: admin.id,
      steps: {
        create: [
          { stepNumber: 1, stepType: 'email', title: 'Welcome email with portal access', delayDays: 0 },
          { stepNumber: 2, stepType: 'task', title: 'Credit application review', delayDays: 2 },
          { stepNumber: 3, stepType: 'email', title: 'First order incentive offer', delayDays: 7 },
          { stepNumber: 4, stepType: 'task', title: '30-day check-in call', delayDays: 30, actionConfig: { scriptCategory: 'discovery' } },
        ],
      },
    },
  });

  await prisma.journeyEnrollment.upsert({
    where: {
      journeyId_accountId: {
        journeyId: onboardingJourney.id,
        accountId: accounts[2].id,
      },
    },
    update: {},
    create: {
      journeyId: onboardingJourney.id,
      accountId: accounts[2].id,
      status: 'active',
      currentStep: 2,
    },
  });

  const quoteFollowUp = await prisma.emailTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c801' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c801',
      name: 'Quote Follow-Up',
      subject: 'Following up on your quote',
      body: 'Hi {{contact_name}},\n\nI wanted to follow up on quote {{quote_number}} we sent for {{deal_name}}.\n\nPlease let me know if you have any questions on pricing, ATP, or lead times.\n\nBest regards,\n{{rep_name}}',
      category: 'quote',
    },
  });

  await prisma.emailTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c802' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c802',
      name: 'Reorder Nurture',
      subject: 'Time to replenish?',
      body: 'Hi {{contact_name}},\n\nBased on your ordering pattern, you may be due for a replenishment on {{product_sku}}.\n\nI can prepare an updated quote with current ATP and pricing.\n\n{{rep_name}}',
      category: 'nurture',
    },
  });

  await prisma.email.create({
    data: {
      userId: admin.id,
      subject: quoteFollowUp.subject,
      bodyPreview: 'Following up on Q-2026-00001 for TechMart Q2 Network Refresh...',
      fromAddress: 'admin@crm.local',
      toAddresses: ['sarah.chen@techmart.com'],
      relatedType: 'quote',
      relatedId: quote.id,
      isLogged: true,
      sentAt: new Date('2026-06-18'),
    },
  });

  // Batch 13: Electronics Industry Layer
  await prisma.product.update({
    where: { id: products[3].id },
    data: {
      isEol: true,
      eolDate: new Date('2026-03-01'),
      eccn: '5A002',
      exportRestrictedCountries: ['CN', 'RU', 'IR'],
      successorProductId: products[1].id,
    },
  });
  await prisma.product.update({
    where: { id: products[5].id },
    data: {
      isEol: true,
      eolDate: new Date('2026-01-15'),
      successorProductId: products[0].id,
    },
  });

  await prisma.quoteLineItem.upsert({
    where: { id: '00000000-0000-0000-0000-00000000be01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be01',
      quoteId: quoteExport.id,
      productId: products[3].id,
      lineNumber: 2,
      quantity: 2,
      unitPrice: 1299,
      unitCost: 890,
      discountPercent: 0,
      lineTotal: 2598,
      warehouseId: warehouse.id,
      atpAtQuoteTime: 42,
      atpWarning: false,
    },
  });
  await prisma.quote.update({
    where: { id: quoteExport.id },
    data: {
      subtotal: 6378,
      taxAmount: 526.19,
      total: 6904.19,
      totalCost: 4180,
      marginPercent: 34.5,
    },
  });

  await prisma.exportScreening.upsert({
    where: { id: '00000000-0000-0000-0000-00000000be11' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be11',
      quoteId: quoteExport.id,
      destinationCountry: 'CN',
      status: 'blocked',
      results: {
        lines: [
          { sku: 'CAM-4K-PTZ', blocked: true, reason: 'SKU CAM-4K-PTZ (ECCN 5A002) restricted for CN' },
          { sku: 'SSD-2TB-NVMe', blocked: false, reason: null },
        ],
        blockedCount: 1,
      },
    },
  });

  const fieldWorkOrder = await prisma.fieldWorkOrder.upsert({
    where: { workOrderNumber: 'WO-2026-00001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be21',
      workOrderNumber: 'WO-2026-00001',
      accountId: accounts[0].id,
      assetId: asset.id,
      technicianId: salesRep.id,
      title: 'Switch firmware upgrade — TechMart DC-East',
      description: 'On-site firmware update and port diagnostics for CAT48P-2024-00142',
      status: 'scheduled',
      scheduledAt: new Date('2026-06-25T09:00:00'),
      serviceAddress: 'TechMart DC-East, 1200 Industrial Blvd',
    },
  });

  const demoInvoice = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-00001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be31',
      invoiceNumber: 'INV-2026-00001',
      accountId: accounts[0].id,
      orderId: demoOrder.id,
      status: 'sent',
      subtotal: 8697,
      taxAmount: 717.5,
      total: 9414.5,
      dueDate: new Date('2026-07-20'),
      lineItems: {
        create: [
          {
            description: 'SW-48P-POE — Cisco Catalyst 48-Port PoE Switch',
            quantity: 3,
            unitPrice: 2899,
            lineTotal: 8697,
          },
        ],
      },
    },
  });

  const billingSchedule = await prisma.billingSchedule.upsert({
    where: { id: '00000000-0000-0000-0000-00000000be41' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be41',
      invoiceId: demoInvoice.id,
      name: 'TechMart 3-Installment Plan',
      status: 'active',
      totalAmount: 9414.5,
      erpSyncStatus: 'synced',
      erpSyncedAt: new Date('2026-06-10'),
      installments: {
        create: [
          { id: '00000000-0000-0000-0000-00000000be51', installmentNumber: 1, dueDate: new Date('2026-07-01'), amount: 3138.17, status: 'pending' },
          { id: '00000000-0000-0000-0000-00000000be52', installmentNumber: 2, dueDate: new Date('2026-08-01'), amount: 3138.17, status: 'pending' },
          { id: '00000000-0000-0000-0000-00000000be53', installmentNumber: 3, dueDate: new Date('2026-09-01'), amount: 3138.16, status: 'pending' },
        ],
      },
    },
  });

  // Inventory depth: reorder policy + ledger movements (draw products[2] low)
  const lowStockProduct = products[2];
  const lowLevel = await prisma.inventoryLevel.findUnique({
    where: { productId_warehouseId: { productId: lowStockProduct.id, warehouseId: warehouse.id } },
  });
  if (lowLevel) {
    await prisma.inventoryLevel.update({
      where: { id: lowLevel.id },
      data: { reorderPoint: Number(lowLevel.onHand) + 25, reorderQuantity: 100, safetyStock: 20 },
    });
    await prisma.stockMovement.createMany({
      data: [
        {
          productId: lowStockProduct.id,
          warehouseId: warehouse.id,
          type: 'receipt',
          quantity: 50,
          balanceAfter: Number(lowLevel.onHand) + 50,
          reason: 'Initial stocking receipt',
          reference: 'PO-2026-0042',
          userId: admin.id,
        },
        {
          productId: lowStockProduct.id,
          warehouseId: warehouse.id,
          type: 'shipment',
          quantity: 50,
          balanceAfter: Number(lowLevel.onHand),
          reason: 'Order fulfillment',
          reference: demoOrder.orderNumber,
          userId: admin.id,
        },
      ],
    });
  }

  // Payments: a partial payment recorded against the demo invoice
  await prisma.payment.upsert({
    where: { id: '00000000-0000-0000-0000-00000000be61' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be61',
      invoiceId: demoInvoice.id,
      amount: 3138.17,
      method: 'wire',
      status: 'succeeded',
      reference: 'WIRE-TECHMART-0701',
      gateway: 'manual',
      notes: 'First installment received',
      receivedAt: new Date('2026-07-01'),
      userId: admin.id,
    },
  });
  await prisma.invoice.update({
    where: { id: demoInvoice.id },
    data: { amountPaid: 3138.17, status: 'partial' },
  });

  // Subscriptions & recurring billing: one active monthly sub, due for billing
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - 1); // due yesterday → picked up by run-billing
  await prisma.subscription.upsert({
    where: { subscriptionNumber: 'SUB-2026-00001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000be71',
      subscriptionNumber: 'SUB-2026-00001',
      accountId: accounts[0].id,
      ownerId: admin.id,
      name: 'TechMart Managed Support — Monthly',
      status: 'active',
      interval: 'monthly',
      intervalCount: 1,
      startDate: new Date('2026-01-01'),
      nextBillingDate: dueDate,
      currentPeriodEnd: new Date('2026-07-01'),
      autoRenew: true,
      notes: 'Includes 24/7 NOC monitoring and quarterly on-site review.',
      items: {
        create: [
          { productId: products[0].id, description: 'Managed switch support (per device)', quantity: 3, unitPrice: 49 },
          { description: 'Priority SLA add-on', quantity: 1, unitPrice: 250 },
        ],
      },
    },
  });

  // Batch 14: Platform & Compliance
  const rebateModule = await prisma.customModule.upsert({
    where: { apiName: 'rebate_claims' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c101',
      name: 'Rebate Claims',
      apiName: 'rebate_claims',
      description: 'Partner rebate claim submissions and approvals',
      schema: {
        fields: [
          { name: 'partnerName', type: 'text', required: true },
          { name: 'claimAmount', type: 'number', required: true },
          { name: 'quarter', type: 'text', required: true },
          { name: 'status', type: 'text', required: false },
        ],
      },
    },
  });

  await prisma.customModuleRecord.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c111' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c111',
      moduleId: rebateModule.id,
      data: {
        partnerName: 'BrightWave Solutions',
        claimAmount: 12500,
        quarter: 'Q2 2026',
        status: 'submitted',
      },
    },
  });

  const salesProgram = await prisma.salesProgram.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c201',
      name: 'Q3 Networking Push',
      description: 'Drive Catalyst switch and PoE AP attach across enterprise accounts',
      productFocus: 'Networking — Catalyst & Meraki',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-09-30'),
      targetRevenue: 2500000,
      targetUnits: 450,
      status: 'active',
      ownerId: salesRep.id,
    },
  });

  const caseRoutingRule = await prisma.routingRule.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c301',
      name: 'Networking Case Queue',
      entityType: 'case',
      queue: 'networking',
      skills: ['networking', 'switching'],
      priority: 10,
    },
  });

  await prisma.routingRuleMember.upsert({
    where: {
      ruleId_userId: { ruleId: caseRoutingRule.id, userId: admin.id },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c311',
      ruleId: caseRoutingRule.id,
      userId: admin.id,
      currentLoad: 1,
    },
  });

  await prisma.routingRuleMember.upsert({
    where: {
      ruleId_userId: { ruleId: caseRoutingRule.id, userId: salesRep.id },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c312',
      ruleId: caseRoutingRule.id,
      userId: salesRep.id,
      currentLoad: 2,
    },
  });

  const leadRoutingRule = await prisma.routingRule.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c302' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c302',
      name: 'Inbound Lead Pool',
      entityType: 'lead',
      queue: 'sales',
      skills: ['enterprise'],
      priority: 20,
    },
  });

  await prisma.routingRuleMember.upsert({
    where: {
      ruleId_userId: { ruleId: leadRoutingRule.id, userId: salesRep.id },
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c321',
      ruleId: leadRoutingRule.id,
      userId: salesRep.id,
      currentLoad: 0,
    },
  });

  await prisma.gdprRequest.upsert({
    where: { id: '00000000-0000-0000-0000-00000000c401' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000c401',
      requestType: 'consent_update',
      email: 'sarah.chen@techmart.com',
      contactId: contacts[0].id,
      status: 'pending',
      notes: 'Customer requested marketing opt-out via portal',
      requestedById: admin.id,
    },
  });

  // Batch 16: Agents & Data Platform
  const quotePrepAgent = await prisma.agent.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d001',
      name: 'Quote Prep Agent',
      agentType: 'quote_prep',
      description: 'Validates ATP, pricing, and compliance before quote send',
      config: { quoteId: quote.id },
      ownerId: admin.id,
    },
  });

  const approvalAgent = await prisma.agent.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d002',
      name: 'Approval Router',
      agentType: 'approval_route',
      description: 'Routes pending discount and margin approvals to the right reviewer',
      config: {},
      ownerId: admin.id,
    },
  });

  const emailAgent = await prisma.agent.upsert({
    where: { id: '00000000-0000-0000-0000-00000000d003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000d003',
      name: 'Follow-up Email Agent',
      agentType: 'email_send',
      description: 'Drafts contextual follow-up emails for open deals',
      config: { dealId: deals[0].id },
      ownerId: salesRep.id,
    },
  });

  await prisma.erpEvent.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-00000000d011',
        accountId: accounts[0].id,
        eventType: 'order_synced',
        externalId: 'ERP-ORD-88421',
        title: 'Order synced from SAP',
        description: 'SO-2026-88421 — 3× Catalyst 48-Port PoE',
        amount: 8697,
        occurredAt: new Date('2026-06-05'),
      },
      {
        id: '00000000-0000-0000-0000-00000000d012',
        accountId: accounts[0].id,
        eventType: 'invoice_posted',
        externalId: 'ERP-INV-44102',
        title: 'Invoice posted to AR',
        description: 'INV-2026-00001 sent to TechMart AP',
        amount: 9414.5,
        occurredAt: new Date('2026-06-10'),
      },
      {
        id: '00000000-0000-0000-0000-00000000d013',
        accountId: accounts[0].id,
        eventType: 'payment_received',
        externalId: 'ERP-PAY-22901',
        title: 'Payment received',
        description: 'Wire transfer — installment 1 of 3',
        amount: 3138.17,
        occurredAt: new Date('2026-06-15'),
      },
      {
        id: '00000000-0000-0000-0000-00000000d014',
        accountId: accounts[0].id,
        eventType: 'shipment_delivered',
        externalId: 'ERP-SHP-77201',
        title: 'Shipment delivered',
        description: 'DC-East receiving confirmed — partial delivery',
        occurredAt: new Date('2026-06-18'),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.aiAuditLog.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-00000000d021',
        action: 'deal_score',
        entityType: 'deal',
        entityId: deals[0].id,
        userId: admin.id,
        model: 'rule-based',
        piiMasked: false,
        promptPreview: 'Score deal TechMart Q2 Network Refresh using stage history and engagement',
      },
      {
        id: '00000000-0000-0000-0000-00000000d022',
        action: 'email_draft',
        entityType: 'quote',
        entityId: quote.id,
        userId: admin.id,
        model: 'rule-based',
        piiMasked: true,
        promptPreview: 'Draft follow-up for [NAME_REDACTED] at [EMAIL_REDACTED] re: Q-2026-00001',
      },
      {
        id: '00000000-0000-0000-0000-00000000d023',
        action: 'agent_run',
        entityType: 'agent',
        entityId: quotePrepAgent.id,
        userId: admin.id,
        model: 'rule-based',
        piiMasked: false,
        promptPreview: 'Agent Quote Prep Agent (quote_prep)',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.gamificationScore.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-00000000d031',
        userId: salesRep.id,
        period: 'Q2-2026',
        metric: 'composite',
        points: 1240,
        rank: 1,
      },
      {
        id: '00000000-0000-0000-0000-00000000d032',
        userId: admin.id,
        period: 'Q2-2026',
        metric: 'composite',
        points: 890,
        rank: 2,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete:');
  console.log(`  Admin user: admin@crm.local / Admin123!`);
  console.log(`  Territory: ${territory.name}`);
  console.log(`  Warehouse: ${warehouse.name} (${warehouse.code})`);
  console.log(`  Price Book: ${priceBook.name}`);
  console.log(`  Pipeline: ${pipeline.name} with ${PIPELINE_STAGES.length} stages`);
  console.log(`  Demo data: ${accounts.length} accounts, ${products.length} products, ${deals.length} deals, 2 quotes`);
  console.log(`  Phase 2 batch 4: playbooks, call scripts, currencies, blueprint rules`);
  console.log(`  Phase 2 batch 3: 2 pipelines, chatter posts, field history`);
  console.log(`  Phase 2: forecast, cadence, contract, approval, constraints, documents, team, stage history`);
  console.log(`  Phase 3–5 batches 6–9: vendors, marketing, knowledge, PRM, portals, account plans, cases, assets, RMA, AI`);
  console.log(`  Batch 10: MDF, incidents (${incident.incidentNumber}), journeys, email templates, RevOps`);
  console.log(`  Batch 11: fulfillment tasks (1 fallout), contract clauses + template`);
  console.log(`  Batch 12: enablement path (${enablementPath.name}), MAP with 4 milestones`);
  console.log(`  Batch 13: 2 EOL products, export-blocked quote line (Q-2026-00002), ${fieldWorkOrder.workOrderNumber}, billing schedule`);
  console.log(`  Batch 14: ${rebateModule.name} module, ${salesProgram.name}, routing rules (case + lead), GDPR consent request`);
  console.log(`  Batch 15: AI deal scores, churn risk, NLP case routing, similar cases, email drafts`);
  console.log(`  Batch 16: 3 agents (${quotePrepAgent.name}, ${approvalAgent.name}, ${emailAgent.name}), ERP events, AI audit log, gamification leaderboard`);
  console.log(`  Account plan: ${accountPlan.title}`);
  console.log(`  Portal token: demo-portal-token-brightwave → http://localhost:3000/portal?token=demo-portal-token-brightwave`);
  console.log(`  Sales rep: sarah.sales@crm.local / Admin123!`);
  console.log(`  Admin ID: ${admin.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });