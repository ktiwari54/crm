import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { PrismaService } from '../../prisma/prisma.service';

const INDEX = 'crm_global';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  get isEnabled(): boolean {
    return !!this.client;
  }

  async onModuleInit() {
    const url = this.config.get<string>('ELASTICSEARCH_URL');
    if (!url) {
      this.logger.log('Elasticsearch disabled — using PostgreSQL search');
      return;
    }
    this.client = new Client({ node: url });
    try {
      await this.client.ping();
      await this.ensureIndex();
      await this.reindexAll();
      this.logger.log(`Elasticsearch connected: ${url}`);
    } catch (err) {
      this.logger.warn(`Elasticsearch unavailable, falling back to PostgreSQL: ${err}`);
      this.client = null;
    }
  }

  private async ensureIndex() {
    if (!this.client) return;
    const exists = await this.client.indices.exists({ index: INDEX });
    if (!exists) {
      await this.client.indices.create({
        index: INDEX,
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            entityType: { type: 'keyword' },
            entityId: { type: 'keyword' },
            title: { type: 'text' },
            subtitle: { type: 'text' },
            keywords: { type: 'text' },
          },
        },
      });
    }
  }

  async reindexAll() {
    if (!this.client) return;
    const [accounts, contacts, products, deals] = await Promise.all([
      this.prisma.account.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, accountType: true, industry: true },
      }),
      this.prisma.contact.findMany({
        where: { deletedAt: null },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      this.prisma.product.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, sku: true, manufacturerPartNumber: true },
      }),
      this.prisma.deal.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, amount: true },
      }),
    ]);

    const ops = [
      ...accounts.map((a) => ({
        entityType: 'account',
        entityId: a.id,
        title: a.name,
        subtitle: a.industry ?? a.accountType,
        keywords: `${a.name} ${a.accountType} ${a.industry ?? ''}`,
      })),
      ...contacts.map((c) => ({
        entityType: 'contact',
        entityId: c.id,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: c.email ?? '',
        keywords: `${c.firstName} ${c.lastName} ${c.email ?? ''}`,
      })),
      ...products.map((p) => ({
        entityType: 'product',
        entityId: p.id,
        title: p.name,
        subtitle: p.sku,
        keywords: `${p.name} ${p.sku} ${p.manufacturerPartNumber ?? ''}`,
      })),
      ...deals.map((d) => ({
        entityType: 'deal',
        entityId: d.id,
        title: d.name,
        subtitle: String(d.amount ?? ''),
        keywords: d.name,
      })),
    ];

    if (ops.length === 0) return;

    await this.client.deleteByQuery({
      index: INDEX,
      query: { match_all: {} },
      refresh: true,
    }).catch(() => undefined);

    const operations = ops.flatMap((doc) => [
      { index: { _index: INDEX } },
      doc,
    ]);

    await this.client.bulk({ refresh: true, operations });
    this.logger.log(`Indexed ${ops.length} documents in Elasticsearch`);
  }

  async search(q: string) {
    if (!this.client || !q.trim()) return null;

    const res = await this.client.search({
      index: INDEX,
      query: {
        multi_match: {
          query: q.trim(),
          fields: ['title^3', 'subtitle^2', 'keywords'],
          fuzziness: 'AUTO',
        },
      },
      size: 40,
    });

    const hits = res.hits.hits.map((h) => h._source as {
      entityType: string;
      entityId: string;
      title: string;
      subtitle: string;
    });

    const accounts = hits.filter((h) => h.entityType === 'account').slice(0, 10);
    const contacts = hits.filter((h) => h.entityType === 'contact').slice(0, 10);
    const products = hits.filter((h) => h.entityType === 'product').slice(0, 10);
    const deals = hits.filter((h) => h.entityType === 'deal').slice(0, 10);

    const [accountRows, contactRows, productRows, dealRows] = await Promise.all([
      accounts.length
        ? this.prisma.account.findMany({
            where: { id: { in: accounts.map((a) => a.entityId) } },
            select: { id: true, name: true, accountType: true },
          })
        : [],
      contacts.length
        ? this.prisma.contact.findMany({
            where: { id: { in: contacts.map((c) => c.entityId) } },
            include: { account: { select: { id: true, name: true } } },
          })
        : [],
      products.length
        ? this.prisma.product.findMany({
            where: { id: { in: products.map((p) => p.entityId) } },
            select: { id: true, name: true, sku: true, listPrice: true },
          })
        : [],
      deals.length
        ? this.prisma.deal.findMany({
            where: { id: { in: deals.map((d) => d.entityId) } },
            include: { account: { select: { id: true, name: true } } },
          })
        : [],
    ]);

    return {
      accounts: accountRows,
      contacts: contactRows,
      products: productRows,
      deals: dealRows,
      source: 'elasticsearch' as const,
    };
  }
}