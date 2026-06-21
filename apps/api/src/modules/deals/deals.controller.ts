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
import { DealsService } from './deals.service';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get('pipeline')
  getPipeline(@Query('pipelineId') pipelineId?: string) {
    return this.dealsService.getPipeline(pipelineId);
  }

  @Get()
  findAll(
    @Query('stageId') stageId?: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.dealsService.findAll(stageId, pipelineId);
  }

  @Get(':id/inspection')
  getInspection(@Param('id') id: string) {
    return this.dealsService.getInspection(id);
  }

  @Get(':id/playbook')
  getPlaybook(@Param('id') id: string) {
    return this.dealsService.getPlaybookForDeal(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.dealsService.create(body as never);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: { user: { id: string } },
  ) {
    return this.dealsService.update(id, body as never, req.user.id);
  }

  @Post(':id/contacts')
  addContact(
    @Param('id') id: string,
    @Body() body: { contactId: string; role?: string; isPrimary?: boolean },
  ) {
    return this.dealsService.addContact(id, body);
  }

  @Post(':id/team')
  addTeamMember(
    @Param('id') id: string,
    @Body()
    body: { userId: string; role?: string; revenueSplitPercent?: number },
  ) {
    return this.dealsService.addTeamMember(id, body);
  }
}