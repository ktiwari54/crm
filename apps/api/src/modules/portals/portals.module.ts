import { Module } from '@nestjs/common';
import { PortalTokenGuard } from '../../auth/portal-token.guard';
import { PortalController } from './portal.controller';
import { PortalsController } from './portals.controller';
import { PortalsService } from './portals.service';

@Module({
  controllers: [PortalsController, PortalController],
  providers: [PortalsService, PortalTokenGuard],
  exports: [PortalsService],
})
export class PortalsModule {}