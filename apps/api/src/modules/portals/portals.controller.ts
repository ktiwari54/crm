import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PortalsService } from './portals.service';

@Controller('portals')
@UseGuards(JwtAuthGuard)
export class PortalsController {
  constructor(private readonly portalsService: PortalsService) {}

  @Get()
  findAll() {
    return this.portalsService.findAll();
  }

  @Get('summary/:accountId')
  summary(@Param('accountId') accountId: string) {
    return this.portalsService.getPortalSummary(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.portalsService.findOne(id);
  }

  @Post('grant')
  grant(@Body() body: { accountId: string; contactEmail: string }) {
    return this.portalsService.grantAccess(body.accountId, body.contactEmail);
  }
}