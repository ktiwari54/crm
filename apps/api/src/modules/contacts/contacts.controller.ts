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
import { ContactsService } from './contacts.service';

type AuthReq = { user: { id: string } };

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@Query('accountId') accountId?: string) {
    return this.contactsService.findAll(accountId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.contactsService.create(body as never, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.contactsService.update(id, body as never, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthReq) {
    return this.contactsService.remove(id, req.user.id);
  }
}