import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters?: {
    ownerId?: string;
    relatedType?: string;
    relatedId?: string;
    status?: string;
  }) {
    return this.prisma.activity.findMany({
      where: {
        ...(filters?.ownerId ? { ownerId: filters.ownerId } : {}),
        ...(filters?.relatedType
          ? { relatedType: filters.relatedType as never }
          : {}),
        ...(filters?.relatedId ? { relatedId: filters.relatedId } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
      },
      include: { owner: true, callScript: true },
      orderBy: { dueAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: { owner: true, callScript: true },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  create(data: Prisma.ActivityCreateInput) {
    return this.prisma.activity.create({
      data,
      include: { owner: true, callScript: true },
    });
  }

  async update(id: string, data: Prisma.ActivityUpdateInput) {
    await this.findOne(id);
    return this.prisma.activity.update({
      where: { id },
      data,
      include: { owner: true, callScript: true },
    });
  }
}