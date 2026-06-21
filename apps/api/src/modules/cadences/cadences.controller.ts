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
import { CadencesService } from './cadences.service';

@Controller('cadences')
@UseGuards(JwtAuthGuard)
export class CadencesController {
  constructor(private readonly cadencesService: CadencesService) {}

  @Get('templates')
  findTemplates() {
    return this.cadencesService.findTemplates();
  }

  @Get('enrollments')
  findEnrollments(@Query('ownerId') ownerId?: string) {
    return this.cadencesService.findEnrollments(ownerId);
  }

  @Post('enroll')
  enroll(
    @Body() body: { templateId: string; entityType: string; entityId: string },
    @Req() req: { user: { id: string } },
  ) {
    return this.cadencesService.enroll({ ...body, ownerId: req.user.id });
  }

  @Patch('enrollments/:id/advance')
  advance(@Param('id') id: string) {
    return this.cadencesService.advanceStep(id);
  }
}