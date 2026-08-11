import { Module } from '@nestjs/common';
import { ExternalController } from './external.controller';
import { ExternalService } from './external.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [TimelineModule],
  controllers: [ExternalController],
  providers: [ExternalService],
  exports: [ExternalService],
})
export class ExternalModule {}
