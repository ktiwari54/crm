import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EmailsService } from './emails.service';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  findLogged(@Req() req: { user: { id: string } }) {
    return this.emailsService.findLogged(req.user.id);
  }

  @Get('templates')
  findTemplates() {
    return this.emailsService.findTemplates();
  }

  @Get('templates/:id')
  findTemplate(@Param('id') id: string) {
    return this.emailsService.findTemplate(id);
  }

  @Post('templates')
  createTemplate(@Body() body: Record<string, unknown>) {
    return this.emailsService.createTemplate(body as never);
  }

  @Post('log')
  logEmail(@Req() req: { user: { id: string } }, @Body() body: Record<string, unknown>) {
    return this.emailsService.logEmail(req.user.id, body as never);
  }

  @Post('send')
  sendFromTemplate(
    @Req() req: { user: { id: string } },
    @Body() body: { templateId: string; toAddresses: string[]; relatedType?: string; relatedId?: string },
  ) {
    return this.emailsService.sendFromTemplate(req.user.id, body.templateId, body);
  }

  @Post('draft')
  draft(
    @Req() req: { user: { id: string } },
    @Body() body: Record<string, unknown>,
  ) {
    return this.emailsService.draftEmail(req.user.id, body as never);
  }

  @Get('mailbox/status')
  mailboxStatus() {
    return this.emailsService.getMailboxStatus();
  }

  @Get('inbox')
  findInbox(@Req() req: { user: { id: string } }) {
    return this.emailsService.findInbox(req.user.id);
  }

  @Post('sync')
  syncInbox(@Req() req: { user: { id: string } }) {
    return this.emailsService.syncInbox(req.user.id);
  }
}