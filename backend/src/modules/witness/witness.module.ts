import { Module } from '@nestjs/common';
import { WitnessController } from './witness.controller';
import { WitnessService } from './witness.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [TimelineModule],
  controllers: [WitnessController],
  providers: [WitnessService],
  exports: [WitnessService],
})
export class WitnessModule {}
