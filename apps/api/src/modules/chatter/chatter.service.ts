import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatterService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(entityType?: string, entityId?: string) {
    return this.prisma.feedPost.findMany({
      where: {
        ...(entityType && entityId ? { entityType, entityId } : {}),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: entityType && entityId ? 50 : 30,
    });
  }

  create(data: Prisma.FeedPostCreateInput) {
    return this.prisma.feedPost.create({
      data,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }
}