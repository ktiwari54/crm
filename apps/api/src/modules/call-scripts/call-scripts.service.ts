import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CallScriptsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(category?: string) {
    return this.prisma.callScript.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const script = await this.prisma.callScript.findUnique({ where: { id } });
    if (!script) throw new NotFoundException('Call script not found');
    return script;
  }

  create(data: Prisma.CallScriptCreateInput) {
    return this.prisma.callScript.create({ data });
  }
}