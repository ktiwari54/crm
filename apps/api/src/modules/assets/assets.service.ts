import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(accountId?: string, status?: string) {
    return this.prisma.installedAsset.findMany({
      where: {
        ...(accountId ? { accountId } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        account: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { installDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.installedAsset.findUnique({
      where: { id },
      include: {
        product: true,
        account: true,
        order: true,
        cases: true,
        rmaRequests: true,
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  create(data: Prisma.InstalledAssetCreateInput) {
    return this.prisma.installedAsset.create({
      data,
      include: { product: true, account: true, order: true },
    });
  }

  async traceSerial(serial: string) {
    const asset = await this.prisma.installedAsset.findFirst({
      where: {
        OR: [
          { serialNumber: { equals: serial, mode: 'insensitive' } },
          { imei: { equals: serial, mode: 'insensitive' } },
          { macAddress: { equals: serial, mode: 'insensitive' } },
          { lotNumber: { equals: serial, mode: 'insensitive' } },
        ],
      },
      include: {
        product: {
          include: {
            successorProduct: { select: { id: true, sku: true, name: true } },
          },
        },
        account: true,
        order: {
          include: {
            lineItems: {
              include: { product: { select: { sku: true, name: true } } },
            },
          },
        },
        cases: {
          select: { id: true, caseNumber: true, subject: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        rmaRequests: {
          select: { id: true, rmaNumber: true, status: true, reason: true, requestedAt: true },
          orderBy: { requestedAt: 'desc' },
          take: 5,
        },
        fieldWorkOrders: {
          select: { id: true, workOrderNumber: true, title: true, status: true, scheduledAt: true },
          orderBy: { scheduledAt: 'desc' },
          take: 5,
        },
      },
    });
    if (!asset) throw new NotFoundException(`No asset found for serial/IMEI/MAC: ${serial}`);

    return {
      asset: {
        id: asset.id,
        serialNumber: asset.serialNumber,
        lotNumber: asset.lotNumber,
        imei: asset.imei,
        macAddress: asset.macAddress,
        status: asset.status,
        installDate: asset.installDate,
        warrantyEndDate: asset.warrantyEndDate,
        notes: asset.notes,
      },
      product: asset.product,
      account: { id: asset.account.id, name: asset.account.name },
      order: asset.order
        ? {
            orderNumber: asset.order.orderNumber,
            status: asset.order.status,
            shippedAt: asset.order.shippedAt,
            deliveredAt: asset.order.deliveredAt,
            lineItems: asset.order.lineItems,
          }
        : null,
      serviceHistory: {
        cases: asset.cases,
        rmaRequests: asset.rmaRequests,
        workOrders: asset.fieldWorkOrders,
      },
      traceChain: [
        asset.order ? { step: 'shipped', date: asset.order.shippedAt, ref: asset.order.orderNumber } : null,
        asset.installDate ? { step: 'installed', date: asset.installDate, ref: asset.account.name } : null,
        asset.warrantyEndDate ? { step: 'warranty_expires', date: asset.warrantyEndDate, ref: null } : null,
      ].filter(Boolean),
    };
  }

  expiringWarranties(days = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.prisma.installedAsset.findMany({
      where: {
        status: 'active',
        warrantyEndDate: { lte: cutoff, gte: new Date() },
      },
      include: {
        product: { select: { sku: true, name: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { warrantyEndDate: 'asc' },
    });
  }
}