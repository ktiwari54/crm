import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ChatterService } from './chatter.service';

@Controller('chatter')
@UseGuards(JwtAuthGuard)
export class ChatterController {
  constructor(private readonly chatterService: ChatterService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.chatterService.findAll(entityType, entityId);
  }

  @Post()
  create(
    @Body() body: { body: string; entityType?: string; entityId?: string },
    @Req() req: { user: { id: string } },
  ) {
    return this.chatterService.create({
      body: body.body,
      entityType: body.entityType,
      entityId: body.entityId,
      author: { connect: { id: req.user.id } },
    });
  }
}