import { Module } from '@nestjs/common';
import { CustomModulesController } from './custom-modules.controller';
import { CustomModulesService } from './custom-modules.service';

@Module({
  controllers: [CustomModulesController],
  providers: [CustomModulesService],
})
export class CustomModulesModule {}