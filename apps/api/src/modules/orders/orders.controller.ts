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
import { FulfillmentService } from './fulfillment.service';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly fulfillmentService: FulfillmentService,
  ) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.ordersService.findAll(status);
  }

  @Get('fallout')
  getFallout() {
    return this.fulfillmentService.getFallout();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/fulfillment')
  getFulfillment(@Param('id') id: string) {
    return this.fulfillmentService.getTasks(id);
  }

  @Post('from-quote/:quoteId')
  createFromQuote(@Param('quoteId') quoteId: string, @Req() req: { user: { id: string } }) {
    return this.ordersService.createFromQuote(quoteId, req.user.id);
  }

  @Post(':id/fulfillment')
  initFulfillment(@Param('id') id: string) {
    return this.fulfillmentService.initPlan(id);
  }

  @Patch('fulfillment/:taskId')
  updateFulfillmentTask(
    @Param('taskId') taskId: string,
    @Body() body: { status?: string; errorMessage?: string; notes?: string },
  ) {
    return this.fulfillmentService.updateTask(taskId, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ordersService.updateStatus(id, body.status);
  }
}