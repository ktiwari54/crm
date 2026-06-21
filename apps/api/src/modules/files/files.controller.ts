import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { StorageService } from '../../storage/storage.service';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':filename')
  async download(@Param('filename') filename: string, @Res() res: Response) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const file = await this.storage.getStream(safeName);
    if (!file) throw new NotFoundException('File not found');
    if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
    return file.stream.pipe(res);
  }
}