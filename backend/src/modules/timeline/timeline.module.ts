import { Module } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [PrismaModule],
  controllers: [TimelineController],
  providers: [TimelineService, PrismaService],
  exports: [TimelineService],
})
export class TimelineModule {}