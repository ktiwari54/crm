import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { parseCsv } from '../../common/csv';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Post('import')
  import(
    @Body() body: { csv?: string; rows?: Record<string, string>[] },
    @Req() req: { user: { id: string } },
  ) {
    const rows = body.rows ?? (body.csv ? parseCsv(body.csv) : []);
    return this.productsService.importRows(rows, req.user.id);
  }

  @Get('eol-impact')
  eolImpact() {
    return this.productsService.getEolImpact();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/inventory')
  getInventory(@Param('id') id: string) {
    return this.productsService.getInventory(id);
  }
}