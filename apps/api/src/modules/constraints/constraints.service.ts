import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConstraintsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.productConstraint.findMany({
      where: { isActive: true },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        relatedProduct: { select: { id: true, sku: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const constraint = await this.prisma.productConstraint.findUnique({
      where: { id },
      include: { product: true, relatedProduct: true },
    });
    if (!constraint) throw new NotFoundException('Constraint not found');
    return constraint;
  }

  create(data: Prisma.ProductConstraintCreateInput) {
    return this.prisma.productConstraint.create({
      data,
      include: { product: true, relatedProduct: true },
    });
  }

  async validateQuoteLine(productId: string, existingProductIds: string[]) {
    const constraints = await this.prisma.productConstraint.findMany({
      where: { productId, isActive: true },
      include: { relatedProduct: true },
    });

    const violations: string[] = [];
    for (const c of constraints) {
      if (c.constraintType === 'requires' && c.relatedProductId) {
        if (!existingProductIds.includes(c.relatedProductId)) {
          violations.push(
            c.message ??
              `${c.productId} requires ${c.relatedProduct?.sku ?? 'related product'}`,
          );
        }
      }
      if (c.constraintType === 'blocks' && c.relatedProductId) {
        if (existingProductIds.includes(c.relatedProductId)) {
          violations.push(
            c.message ??
              `Cannot add product — blocked by constraint ${c.name}`,
          );
        }
      }
    }
    return { valid: violations.length === 0, violations };
  }
}