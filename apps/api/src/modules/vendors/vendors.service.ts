import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        products: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  create(data: Prisma.VendorCreateInput) {
    return this.prisma.vendor.create({
      data,
      include: { products: { include: { product: true } } },
    });
  }

  async linkProduct(
    vendorId: string,
    data: { productId: string; moq?: number; leadTimeDays?: number; unitCost?: number; isPrimary?: boolean },
  ) {
    await this.findOne(vendorId);
    return this.prisma.vendorProduct.create({
      data: {
        vendorId,
        productId: data.productId,
        moq: data.moq ?? 1,
        leadTimeDays: data.leadTimeDays ?? 14,
        unitCost: data.unitCost,
        isPrimary: data.isPrimary ?? false,
      },
      include: { product: true, vendor: true },
    });
  }
}