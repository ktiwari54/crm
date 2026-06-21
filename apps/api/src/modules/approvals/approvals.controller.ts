import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.approvalsService.findAll(status);
  }

  @Post('quotes/:quoteId/submit')
  submitQuote(
    @Param('quoteId') quoteId: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.approvalsService.submitQuoteApproval(quoteId, req.user.id);
  }

  @Patch(':id/review')
  review(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: { status: 'approved' | 'rejected'; reviewNotes?: string },
  ) {
    return this.approvalsService.review(id, req.user.id, body);
  }
}