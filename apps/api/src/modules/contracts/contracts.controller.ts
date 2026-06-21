import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ContractsService } from './contracts.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('clauses')
  findClauses() {
    return this.contractsService.findClauses();
  }

  @Get('templates')
  findTemplates() {
    return this.contractsService.findTemplates();
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.contractsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Post('clauses')
  createClause(@Body() body: Record<string, unknown>) {
    return this.contractsService.createClause(body as never);
  }

  @Post('from-template/:templateId')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { accountId: string; title: string; ownerId?: string; dealId?: string },
  ) {
    return this.contractsService.createFromTemplate(templateId, body);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.contractsService.create(body as never);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.contractsService.update(id, body as never);
  }
}