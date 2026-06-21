import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../../prisma/prisma.service';

type MailboxStatus = {
  provider: 'imap' | 'graph' | 'demo';
  configured: boolean;
  lastSyncAt: string | null;
  message: string;
};

@Injectable()
export class EmailSyncService {
  private readonly logger = new Logger(EmailSyncService.name);
  private lastSyncAt: Date | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getStatus(): MailboxStatus {
    if (this.config.get('IMAP_HOST')) {
      return {
        provider: 'imap',
        configured: true,
        lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
        message: `IMAP ${this.config.get('IMAP_HOST')}:${this.config.get('IMAP_PORT') ?? 993}`,
      };
    }
    if (this.config.get('MS_GRAPH_TENANT_ID') && this.config.get('MS_GRAPH_CLIENT_ID')) {
      return {
        provider: 'graph',
        configured: true,
        lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
        message: 'Microsoft Graph API (client credentials)',
      };
    }
    return {
      provider: 'demo',
      configured: false,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      message: 'Demo mode — set IMAP_HOST or MS_GRAPH_* env vars for live sync',
    };
  }

  async syncInbox(userId: string) {
    const status = this.getStatus();
    let messages: Array<{
      subject: string;
      from: string;
      preview: string;
      messageId: string;
      receivedAt: Date;
    }> = [];

    if (status.provider === 'imap') {
      messages = await this.syncImap();
    } else if (status.provider === 'graph') {
      messages = await this.syncGraph();
    } else {
      messages = this.demoMessages();
    }

    const created = [];
    for (const msg of messages) {
      const existing = await this.prisma.email.findFirst({
        where: { messageId: msg.messageId, userId },
      });
      if (existing) continue;
      const row = await this.prisma.email.create({
        data: {
          userId,
          messageId: msg.messageId,
          subject: msg.subject,
          bodyPreview: msg.preview,
          fromAddress: msg.from,
          toAddresses: [],
          isLogged: false,
          sentAt: msg.receivedAt,
        },
      });
      created.push(row);
    }

    this.lastSyncAt = new Date();
    return {
      provider: status.provider,
      synced: created.length,
      totalFetched: messages.length,
      lastSyncAt: this.lastSyncAt.toISOString(),
    };
  }

  findInbox(userId: string) {
    return this.prisma.email.findMany({
      where: { userId, isLogged: false },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  private demoMessages() {
    return [
      {
        subject: 'RE: Q-2026-00001 pricing approval',
        from: 'sarah.chen@techmart.com',
        preview: 'Thanks for the updated quote. We need Net 45 terms confirmed before PO.',
        messageId: 'demo-inbox-001',
        receivedAt: new Date(Date.now() - 3600000),
      },
      {
        subject: 'Catalyst switch RMA status',
        from: 'support@brightwave.com',
        preview: 'RMA-2026-00003 has been approved. Return label attached.',
        messageId: 'demo-inbox-002',
        receivedAt: new Date(Date.now() - 7200000),
      },
    ];
  }

  private async syncImap(): Promise<
    Array<{ subject: string; from: string; preview: string; messageId: string; receivedAt: Date }>
  > {
    const host = this.config.get<string>('IMAP_HOST')!;
    const port = Number(this.config.get('IMAP_PORT') ?? 993);
    const user = this.config.get<string>('IMAP_USER')!;
    const pass = this.config.get<string>('IMAP_PASSWORD')!;

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user, pass },
      logger: false,
    });

    const results: Array<{
      subject: string;
      from: string;
      preview: string;
      messageId: string;
      receivedAt: Date;
    }> = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const messages = await client.fetch('1:20', {
          envelope: true,
          source: { start: 0, maxLength: 500 },
        });
        for await (const msg of messages) {
          const from = msg.envelope?.from?.[0];
          results.push({
            subject: msg.envelope?.subject ?? '(no subject)',
            from: from ? `${from.name ?? ''} <${from.address}>`.trim() : 'unknown',
            preview: msg.source?.toString().slice(0, 200) ?? '',
            messageId: msg.envelope?.messageId ?? `imap-${msg.uid}`,
            receivedAt: msg.envelope?.date ?? new Date(),
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }

    return results;
  }

  private async syncGraph(): Promise<
    Array<{ subject: string; from: string; preview: string; messageId: string; receivedAt: Date }>
  > {
    const token = await this.getGraphToken();
    const mailbox = this.config.get<string>('MS_GRAPH_MAILBOX') ?? 'admin@crm.local';
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages?$top=20&$select=id,subject,from,bodyPreview,receivedDateTime`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      value: Array<{
        id: string;
        subject: string;
        from?: { emailAddress?: { address?: string; name?: string } };
        bodyPreview?: string;
        receivedDateTime: string;
      }>;
    };

    return data.value.map((m) => ({
      subject: m.subject,
      from: m.from?.emailAddress?.address ?? 'unknown',
      preview: m.bodyPreview ?? '',
      messageId: m.id,
      receivedAt: new Date(m.receivedDateTime),
    }));
  }

  private async getGraphToken(): Promise<string> {
    const direct = this.config.get<string>('MS_GRAPH_ACCESS_TOKEN');
    if (direct) return direct;

    const tenant = this.config.get<string>('MS_GRAPH_TENANT_ID')!;
    const clientId = this.config.get<string>('MS_GRAPH_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('MS_GRAPH_CLIENT_SECRET')!;

    const res = await fetch(
      `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
      },
    );

    if (!res.ok) throw new Error(`Graph token error: ${await res.text()}`);
    const json = (await res.json()) as { access_token: string };
    return json.access_token;
  }
}