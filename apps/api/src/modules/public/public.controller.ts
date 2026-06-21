import { Body, Controller, Post } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Post('leads')
  createLead(@Body() body: Record<string, unknown>) {
    return this.publicService.createLead(body as never);
  }

  @Post('cases')
  createCase(@Body() body: Record<string, unknown>) {
    return this.publicService.createCase(body as never);
  }
}