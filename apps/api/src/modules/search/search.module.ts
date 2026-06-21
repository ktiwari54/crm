import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, ElasticsearchService],
  exports: [SearchService, ElasticsearchService],
})
export class SearchModule {}