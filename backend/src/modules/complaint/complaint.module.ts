import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [PrismaModule, TimelineModule, NotifyModule],
  controllers: [ComplaintController],
  providers: [ComplaintService, PrismaService],
  exports: [ComplaintService],
})
export class ComplaintModule {}