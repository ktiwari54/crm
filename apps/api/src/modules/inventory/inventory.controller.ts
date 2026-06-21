import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StockMovementType } from '../../../generated/prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { InventoryService } from './inventory.service';

type AuthReq = { user: { id: string } };

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  lowStock() {
    return this.inventoryService.lowStock();
  }

  @Post('adjust')
  adjust(
    @Body()
    body: {
      productId: string;
      warehouseId: string;
      type: StockMovementType;
      quantity: number;
      reason?: string;
      reference?: string;
    },
    @Req() req: AuthReq,
  ) {
    return this.inventoryService.adjust({ ...body, userId: req.user.id });
  }

  @Post('transfer')
  transfer(
    @Body()
    body: {
      productId: string;
      fromWarehouseId: string;
      toWarehouseId: string;
      quantity: number;
      reason?: string;
      reference?: string;
    },
    @Req() req: AuthReq,
  ) {
    return this.inventoryService.transfer({ ...body, userId: req.user.id });
  }

  @Put('reorder-policy')
  setReorderPolicy(
    @Body()
    body: {
      productId: string;
      warehouseId: string;
      reorderPoint?: number;
      reorderQuantity?: number;
      safetyStock?: number;
    },
  ) {
    const { productId, warehouseId, ...policy } = body;
    return this.inventoryService.setReorderPolicy(productId, warehouseId, policy);
  }

  @Get(':productId/movements')
  movements(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.movements(productId, warehouseId);
  }
}
