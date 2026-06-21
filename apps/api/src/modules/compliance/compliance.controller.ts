import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ComplianceService } from './compliance.service';
import { GdprService } from './gdpr.service';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly gdprService: GdprService,
  ) {}

  @Get('screening')
  findScreenings(@Query('quoteId') quoteId?: string) {
    return this.complianceService.findScreenings(quoteId);
  }

  @Post('screening')
  screen(
    @Body() body: { quoteId: string; destinationCountry: string },
  ) {
    return this.complianceService.screenQuote(body.quoteId, body.destinationCountry);
  }

  @Get('gdpr')
  findGdprRequests(@Query('status') status?: string) {
    return this.gdprService.findAll(status);
  }

  @Post('gdpr')
  createGdprRequest(
    @Req() req: { user: { id: string } },
    @Body() body: Record<string, unknown>,
  ) {
    return this.gdprService.create(body as never, req.user.id);
  }

  @Post('gdpr/:id/process')
  processGdpr(@Param('id') id: string, @Body() body: { action: 'export' | 'delete' }) {
    return body.action === 'delete'
      ? this.gdprService.processDelete(id)
      : this.gdprService.processExport(id);
  }
}