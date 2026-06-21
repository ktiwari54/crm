import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TerritoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.territory.findMany({
      where: { isActive: true },
      include: { users: true, _count: { select: { accounts: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const territory = await this.prisma.territory.findUnique({
      where: { id },
      include: { users: true, accounts: true },
    });
    if (!territory) throw new NotFoundException('Territory not found');
    return territory;
  }

  create(data: Prisma.TerritoryCreateInput) {
    return this.prisma.territory.create({ data });
  }

  async update(id: string, data: Prisma.TerritoryUpdateInput) {
    await this.findOne(id);
    return this.prisma.territory.update({ where: { id }, data });
  }
}