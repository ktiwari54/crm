import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomModulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customModule.findMany({
      where: { isActive: true },
      include: { _count: { select: { records: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const mod = await this.prisma.customModule.findUnique({
      where: { id },
      include: { records: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!mod) throw new NotFoundException('Custom module not found');
    return mod;
  }

  async findByApiName(apiName: string) {
    const mod = await this.prisma.customModule.findUnique({
      where: { apiName },
      include: { records: { orderBy: { createdAt: 'desc' } } },
    });
    if (!mod) throw new NotFoundException('Custom module not found');
    return mod;
  }

  create(body: {
    name: string;
    apiName: string;
    description?: string;
    schema: { fields: { name: string; type: string; required?: boolean }[] };
  }) {
    return this.prisma.customModule.create({
      data: {
        name: body.name,
        apiName: body.apiName,
        description: body.description,
        schema: body.schema,
      },
    });
  }

  async createRecord(moduleId: string, data: Record<string, unknown>) {
    await this.findOne(moduleId);
    return this.prisma.customModuleRecord.create({
      data: { moduleId, data: data as never },
    });
  }
}