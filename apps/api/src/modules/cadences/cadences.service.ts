import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CadencesService {
  constructor(private readonly prisma: PrismaService) {}

  findTemplates() {
    return this.prisma.cadenceTemplate.findMany({
      where: { isActive: true },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  findEnrollments(ownerId?: string) {
    return this.prisma.cadenceEnrollment.findMany({
      where: {
        ...(ownerId ? { ownerId } : {}),
        status: 'active',
      },
      include: {
        template: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
        owner: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async enroll(body: {
    templateId: string;
    entityType: string;
    entityId: string;
    ownerId: string;
  }) {
    const template = await this.prisma.cadenceTemplate.findUnique({
      where: { id: body.templateId },
    });
    if (!template) throw new NotFoundException('Cadence template not found');

    return this.prisma.cadenceEnrollment.create({
      data: {
        template: { connect: { id: body.templateId } },
        entityType: body.entityType,
        entityId: body.entityId,
        owner: { connect: { id: body.ownerId } },
      },
      include: {
        template: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
        owner: true,
      },
    });
  }

  async advanceStep(enrollmentId: string) {
    const enrollment = await this.prisma.cadenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { template: { include: { steps: true } } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const totalSteps = enrollment.template.steps.length;
    const nextStep = enrollment.currentStep + 1;

    if (nextStep > totalSteps) {
      return this.prisma.cadenceEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'completed', completedAt: new Date() },
        include: { template: true, owner: true },
      });
    }

    return this.prisma.cadenceEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: nextStep },
      include: {
        template: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
        owner: true,
      },
    });
  }
}