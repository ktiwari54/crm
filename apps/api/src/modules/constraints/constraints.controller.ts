import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ConstraintsService } from './constraints.service';

@Controller('constraints')
@UseGuards(JwtAuthGuard)
export class ConstraintsController {
  constructor(private readonly constraintsService: ConstraintsService) {}

  @Get()
  findAll() {
    return this.constraintsService.findAll();
  }

  @Post('validate')
  validate(
    @Body() body: { productId: string; existingProductIds: string[] },
  ) {
    return this.constraintsService.validateQuoteLine(
      body.productId,
      body.existingProductIds ?? [],
    );
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.constraintsService.create(body as never);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.constraintsService.findOne(id);
  }
}