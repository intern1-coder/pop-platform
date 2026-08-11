import { Module } from '@nestjs/common';
import { IncidentController } from './incident.controller';
import { IncidentService } from './incident.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineModule } from '../timeline/timeline.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, TimelineModule, MonitoringModule],
  controllers: [IncidentController],
  providers: [IncidentService, PrismaService],
  exports: [IncidentService],
})
export class IncidentModule {}