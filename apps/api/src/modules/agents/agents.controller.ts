import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AgentsService } from './agents.service';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.agentsService.create(body as never);
  }

  @Post(':id/run')
  run(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
    @Body() body: Record<string, unknown>,
  ) {
    return this.agentsService.run(id, body ?? {}, req.user.id);
  }
}