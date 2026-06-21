import { Module } from '@nestjs/common';
import { BlueprintsModule } from '../blueprints/blueprints.module';
import { FieldHistoryModule } from '../field-history/field-history.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  imports: [FieldHistoryModule, BlueprintsModule, PlaybooksModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}