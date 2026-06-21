import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlaybooksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(stageName?: string) {
    return this.prisma.sellingPlaybook.findMany({
      where: {
        isActive: true,
        ...(stageName ? { stageName } : {}),
      },
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const playbook = await this.prisma.sellingPlaybook.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
    if (!playbook) throw new NotFoundException('Playbook not found');
    return playbook;
  }

  create(data: Prisma.SellingPlaybookCreateInput) {
    return this.prisma.sellingPlaybook.create({
      data,
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  forDealStage(stageName: string) {
    return this.prisma.sellingPlaybook.findFirst({
      where: { isActive: true, stageName },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }
}