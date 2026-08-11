import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotifyModule } from '../notify/notify.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotifyModule, MonitoringModule],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
