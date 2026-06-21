import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FieldHistoryService } from './field-history.service';

@Controller('field-history')
@UseGuards(JwtAuthGuard)
export class FieldHistoryController {
  constructor(private readonly fieldHistoryService: FieldHistoryService) {}

  @Get()
  findForEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.fieldHistoryService.findForEntity(entityType, entityId);
  }
}