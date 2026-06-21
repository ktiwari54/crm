import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string) {
    return this.prisma.salesProgram.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.salesProgram.findUnique({
      where: { id },
      include: { owner: true },
    });
    if (!program) throw new NotFoundException('Sales program not found');
    return program;
  }

  create(body: {
    name: string;
    description?: string;
    productFocus?: string;
    startDate: string;
    endDate: string;
    targetRevenue?: number;
    targetUnits?: number;
    status?: string;
    ownerId?: string;
  }) {
    return this.prisma.salesProgram.create({
      data: {
        name: body.name,
        description: body.description,
        productFocus: body.productFocus,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        targetRevenue: body.targetRevenue,
        targetUnits: body.targetUnits,
        status: (body.status ?? 'active') as never,
        owner: body.ownerId ? { connect: { id: body.ownerId } } : undefined,
      },
      include: { owner: { select: { firstName: true, lastName: true } } },
    });
  }
}