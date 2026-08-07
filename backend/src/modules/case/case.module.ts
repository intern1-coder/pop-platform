import { Module } from '@nestjs/common';
import { CaseController } from './case.controller';
import { CaseService } from './case.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, TimelineModule],
  controllers: [CaseController],
  providers: [CaseService, PrismaService],
  exports: [CaseService],
})
export class CaseModule {}