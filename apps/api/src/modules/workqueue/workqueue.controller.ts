import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { WorkqueueService } from './workqueue.service';

@Controller('workqueue')
@UseGuards(JwtAuthGuard)
export class WorkqueueController {
  constructor(private readonly workqueueService: WorkqueueService) {}

  @Get()
  getWorkqueue(@Query('ownerId') ownerId?: string) {
    return this.workqueueService.getWorkqueue(ownerId);
  }
}