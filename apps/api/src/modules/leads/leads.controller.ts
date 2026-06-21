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
import { LeadsService } from './leads.service';

type AuthReq = { user: { id: string } };

// Minimal CSV parser: first row is the header, comma-separated, quoted cells +
// empty cells supported (so columns don't shift on blank values).
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, '\n').trim().split('\n').filter((l) => l.length);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])) as Record<string, string>;
  });
}

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.leadsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Get(':id/cadences')
  cadences(@Param('id') id: string) {
    return this.leadsService.cadenceEnrollments(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.leadsService.create(body as never, req.user.id);
  }

  // Bulk import. Accepts { csv: "<text>" } or { rows: [{...}] }.
  @Post('import')
  import(
    @Body() body: { csv?: string; rows?: Record<string, string>[] },
    @Req() req: AuthReq,
  ) {
    const rows = body.rows ?? (body.csv ? parseCsv(body.csv) : []);
    return this.leadsService.importRows(rows, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.leadsService.update(id, body as never, req.user.id);
  }

  @Post(':id/rescore')
  rescore(@Param('id') id: string, @Req() req: AuthReq) {
    return this.leadsService.rescore(id, req.user.id);
  }

  @Post(':id/enroll-cadence')
  enroll(@Param('id') id: string, @Body() body: { templateId: string }, @Req() req: AuthReq) {
    return this.leadsService.enrollCadence(id, body.templateId, req.user.id);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() body: Record<string, unknown>, @Req() req: AuthReq) {
    return this.leadsService.convert(id, body as never, req.user.id);
  }
}
