import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CtiService {
  constructor(private readonly prisma: PrismaService) {}

  async dial(
    data: {
      phone: string;
      contactId?: string;
      dealId?: string;
      callScriptId?: string;
      subject?: string;
    },
    userId: string,
  ) {
    const digits = data.phone.replace(/[^\d+]/g, '');
    if (!digits) throw new BadRequestException('Invalid phone number');

    const activity = await this.prisma.activity.create({
      data: {
        activityType: 'call',
        subject: data.subject ?? `Outbound call to ${data.phone}`,
        status: 'open',
        priority: 'normal',
        dueAt: new Date(),
        owner: { connect: { id: userId } },
        callScript: data.callScriptId
          ? { connect: { id: data.callScriptId } }
          : undefined,
        ...(data.contactId
          ? { relatedType: 'contact' as const, relatedId: data.contactId }
          : data.dealId
            ? { relatedType: 'deal' as const, relatedId: data.dealId }
            : {}),
      },
      include: { callScript: true, owner: true },
    });

    return {
      activity,
      telUrl: `tel:${digits}`,
      phone: data.phone,
      logged: true,
    };
  }
}