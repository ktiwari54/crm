import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: string, category?: string, q?: string) {
    return this.prisma.knowledgeArticle.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(category ? { category } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { body: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        product: { select: { id: true, sku: true, name: true } },
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { viewCount: 'desc' },
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id },
      include: { product: true, author: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async view(id: string) {
    const article = await this.findOne(id);
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: article.viewCount + 1 },
      include: { product: true, author: true },
    });
  }

  create(data: Prisma.KnowledgeArticleCreateInput) {
    return this.prisma.knowledgeArticle.create({
      data,
      include: { product: true, author: true },
    });
  }

  async publish(id: string) {
    await this.findOne(id);
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
      include: { product: true, author: true },
    });
  }
}