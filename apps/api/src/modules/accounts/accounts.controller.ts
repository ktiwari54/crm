import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AccountsService } from './accounts.service';

type AuthReq = { user: { id: string } };

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.accountsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.accountsService.create(body as never, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.accountsService.update(id, body as never, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.accountsService.remove(id, req.user.id);
  }
}