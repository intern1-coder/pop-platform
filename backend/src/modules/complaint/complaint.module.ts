import { Module } from '@nestjs/common';
import { ComplaintController } from './complaint.controller';
import { ComplaintService } from './complaint.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, TimelineModule],
  controllers: [ComplaintController],
  providers: [ComplaintService, PrismaService],
  exports: [ComplaintService],
})
export class ComplaintModule {}