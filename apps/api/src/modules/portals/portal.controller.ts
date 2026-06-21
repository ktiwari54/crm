import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PortalTokenGuard } from '../../auth/portal-token.guard';
import { PortalsService } from './portals.service';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalsService: PortalsService) {}

  @Get('me')
  @UseGuards(PortalTokenGuard)
  getMe(@Req() req: { portalAccess: { accountId: string; contactEmail: string } }) {
    return this.portalsService.getPortalMe(req.portalAccess);
  }
}