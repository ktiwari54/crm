import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CtiService } from './cti.service';

@Controller('cti')
@UseGuards(JwtAuthGuard)
export class CtiController {
  constructor(private readonly ctiService: CtiService) {}

  @Post('dial')
  dial(
    @Body()
    body: {
      phone: string;
      contactId?: string;
      dealId?: string;
      callScriptId?: string;
      subject?: string;
    },
    @Req() req: { user: { id: string } },
  ) {
    return this.ctiService.dial(body, req.user.id);
  }
}