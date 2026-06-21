import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_TASKS: Array<{ taskType: 'allocate' | 'pick' | 'pack' | 'ship' | 'deliver'; sortOrder: number; delayHours: number }> = [
  { taskType: 'allocate', sortOrder: 1, delayHours: 4 },
  { taskType: 'pick', sortOrder: 2, delayHours: 8 },
  { taskType: 'pack', sortOrder: 3, delayHours: 12 },
  { taskType: 'ship', sortOrder: 4, delayHours: 24 },
  { taskType: 'deliver', sortOrder: 5, delayHours: 72 },
];

@Injectable()
export class FulfillmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getTasks(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      select: { id: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.fulfillmentTask.findMany({
      where: { orderId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async initPlan(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');

    const existing = await this.prisma.fulfillmentTask.count({ where: { orderId } });
    if (existing > 0) return this.getTasks(orderId);

    const base = new Date();
    await this.prisma.fulfillmentTask.createMany({
      data: DEFAULT_TASKS.map((t) => {
        const dueAt = new Date(base);
        dueAt.setHours(dueAt.getHours() + t.delayHours);
        return {
          orderId,
          taskType: t.taskType,
          sortOrder: t.sortOrder,
          dueAt,
          status: t.sortOrder === 1 ? 'in_progress' : 'pending',
        };
      }),
    });

    return this.getTasks(orderId);
  }

  async updateTask(taskId: string, data: { status?: string; errorMessage?: string; notes?: string }) {
    const task = await this.prisma.fulfillmentTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Fulfillment task not found');

    return this.prisma.fulfillmentTask.update({
      where: { id: taskId },
      data: {
        ...(data.status ? { status: data.status as never } : {}),
        errorMessage: data.errorMessage,
        notes: data.notes,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      },
    });
  }

  async getFallout() {
    const now = new Date();
    const tasks = await this.prisma.fulfillmentTask.findMany({
      where: {
        OR: [
          { status: 'failed' },
          { status: 'overdue' },
          {
            status: { in: ['pending', 'in_progress'] },
            dueAt: { lt: now },
          },
        ],
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            account: { select: { name: true } },
          },
        },
      },
      orderBy: { dueAt: 'asc' },
    });

    return tasks.map((t) => ({
      ...t,
      isOverdue: t.dueAt ? t.dueAt < now && t.status !== 'completed' : false,
    }));
  }
}