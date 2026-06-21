import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RevopsService } from './revops.service';

@Controller('revops')
@UseGuards(JwtAuthGuard)
export class RevopsController {
  constructor(private readonly revopsService: RevopsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.revopsService.getDashboard();
  }
}