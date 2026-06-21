import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JourneysService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customerJourney.findMany({
      where: { isActive: true },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        steps: { orderBy: { stepNumber: 'asc' } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const journey = await this.prisma.customerJourney.findUnique({
      where: { id },
      include: {
        owner: true,
        steps: { orderBy: { stepNumber: 'asc' } },
        enrollments: {
          include: { account: { select: { id: true, name: true } } },
        },
      },
    });
    if (!journey) throw new NotFoundException('Journey not found');
    return journey;
  }

  create(data: Prisma.CustomerJourneyCreateInput) {
    return this.prisma.customerJourney.create({
      data,
      include: {
        steps: { orderBy: { stepNumber: 'asc' } },
        owner: true,
      },
    });
  }

  async enroll(journeyId: string, accountIds: string[]) {
    await this.findOne(journeyId);
    await this.prisma.journeyEnrollment.createMany({
      data: accountIds.map((accountId) => ({ journeyId, accountId })),
      skipDuplicates: true,
    });
    return this.findOne(journeyId);
  }

  async advanceEnrollment(enrollmentId: string) {
    const enrollment = await this.prisma.journeyEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { journey: { include: { steps: true } } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const totalSteps = enrollment.journey.steps.length;
    const nextStep = enrollment.currentStep + 1;

    if (nextStep > totalSteps) {
      return this.prisma.journeyEnrollment.update({
        where: { id: enrollmentId },
        data: { status: 'completed', completedAt: new Date() },
        include: { account: true, journey: true },
      });
    }

    return this.prisma.journeyEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: nextStep },
      include: { account: true, journey: { include: { steps: true } } },
    });
  }

  listEnrollments(status?: string) {
    return this.prisma.journeyEnrollment.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        account: { select: { id: true, name: true } },
        journey: {
          select: {
            id: true,
            name: true,
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}