import { Module } from '@nestjs/common';
import { LetterController } from './letter.controller';
import { LetterService } from './letter.service';
import { TimelineModule } from '../timeline/timeline.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [TimelineModule, NotifyModule],
  controllers: [LetterController],
  providers: [LetterService],
  exports: [LetterService],
})
export class LetterModule {}
