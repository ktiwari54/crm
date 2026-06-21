import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ChangeTrackingService } from './change-tracking.service';

type AuthReq = { user: { id: string } };

@Controller()
@UseGuards(JwtAuthGuard)
export class ChangeTrackingController {
  constructor(private readonly tracking: ChangeTrackingService) {}

  // GET /timeline?entityType=lead&entityId=...
  @Get('timeline')
  timeline(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.tracking.timeline(entityType, entityId);
  }

  // GET /audit-log?entityType=lead&entityId=...
  @Get('audit-log')
  audit(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.tracking.auditLog(entityType, entityId);
  }

  // POST /audit-log/:id/revert
  @Post('audit-log/:id/revert')
  revert(@Param('id') id: string, @Req() req: AuthReq) {
    return this.tracking.revert(id, req.user.id);
  }
}
