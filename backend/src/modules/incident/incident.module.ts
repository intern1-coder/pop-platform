import { Module } from '@nestjs/common';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';

@Module({
  imports: [PrismaModule, TimelineModule],
  controllers: [IncidentController],
  providers: [IncidentService, PrismaService],
  exports: [IncidentService],
})
export class IncidentModule {}