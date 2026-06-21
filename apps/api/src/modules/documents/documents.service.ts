import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  findAll(entityType?: string, entityId?: string) {
    return this.prisma.document.findMany({
      where: {
        ...(entityType === 'account' && entityId ? { accountId: entityId } : {}),
        ...(entityType === 'deal' && entityId ? { dealId: entityId } : {}),
        ...(entityType === 'quote' && entityId ? { quoteId: entityId } : {}),
        ...(entityType === 'contract' && entityId ? { contractId: entityId } : {}),
      },
      include: { uploadedBy: true, account: true, deal: true, contract: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { uploadedBy: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  create(data: Prisma.DocumentCreateInput) {
    return this.prisma.document.create({
      data,
      include: { uploadedBy: true, account: true, deal: true },
    });
  }

  async upload(
    file: Express.Multer.File,
    meta: { name?: string; accountId?: string; dealId?: string },
    uploadedById: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const ext = extname(file.originalname) || '';
    const storedName = `${randomUUID()}${ext}`;
    const fileUrl = await this.storage.upload(storedName, file.buffer, file.mimetype);

    return this.prisma.document.create({
      data: {
        name: meta.name || file.originalname,
        fileUrl,
        mimeType: file.mimetype,
        fileSize: file.size,
        account: meta.accountId ? { connect: { id: meta.accountId } } : undefined,
        deal: meta.dealId ? { connect: { id: meta.dealId } } : undefined,
        uploadedBy: { connect: { id: uploadedById } },
      },
      include: { uploadedBy: true, account: true, deal: true },
    });
  }
}