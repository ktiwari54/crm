import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiTrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  maskPii(text: string): string {
    return text
      .replace(/[\w.-]+@[\w.-]+\.\w+/gi, '[EMAIL_REDACTED]')
      .replace(/\+?[\d][\d\s().-]{8,}[\d]/g, '[PHONE_REDACTED]')
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME_REDACTED]');
  }

  async log(entry: {
    action: string;
    entityType?: string;
    entityId?: string;
    userId?: string;
    promptPreview?: string;
    metadata?: Record<string, unknown>;
  }) {
    const raw = entry.promptPreview ?? '';
    const masked = this.maskPii(raw);

    return this.prisma.aiAuditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId,
        model: this.config.get<string>('LLM_MODEL') ?? 'rule-based',
        piiMasked: raw !== masked,
        promptPreview: masked.slice(0, 500),
        metadata: entry.metadata as never,
      },
    });
  }

  findAuditLogs(limit = 50) {
    return this.prisma.aiAuditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  getSettings() {
    return {
      piiMaskingEnabled: true,
      llmConfigured: !!this.config.get<string>('LLM_API_KEY'),
      model: this.config.get<string>('LLM_MODEL') ?? 'gpt-4o-mini',
      auditRetentionDays: 90,
      maskedFields: ['email', 'phone', 'full_name'],
    };
  }
}