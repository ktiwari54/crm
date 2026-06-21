import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TerritoriesService } from './territories.service';

@Controller('territories')
@UseGuards(JwtAuthGuard)
export class TerritoriesController {
  constructor(private readonly territoriesService: TerritoriesService) {}

  @Get()
  findAll() {
    return this.territoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.territoriesService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.territoriesService.create(body as never);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.territoriesService.update(id, body as never);
  }
}