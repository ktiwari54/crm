import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BlueprintsService } from './blueprints.service';

@Controller('blueprints')
@UseGuards(JwtAuthGuard)
export class BlueprintsController {
  constructor(private readonly blueprintsService: BlueprintsService) {}

  @Get()
  findAll() {
    return this.blueprintsService.findAll();
  }

  @Get('flow/:pipelineId')
  getPipelineFlow(@Param('pipelineId') pipelineId: string) {
    return this.blueprintsService.getPipelineFlow(pipelineId);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      entityType: string;
      pipelineStageId: string;
      requirement: string;
      message?: string;
    },
  ) {
    return this.blueprintsService.create(body);
  }

  @Post('validate/deal/:dealId/stage/:stageId')
  validateDealStage(
    @Param('dealId') dealId: string,
    @Param('stageId') stageId: string,
  ) {
    return this.blueprintsService.validateDealStageMove(dealId, stageId);
  }
}