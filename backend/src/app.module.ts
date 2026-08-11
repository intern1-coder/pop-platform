import { Module } from '@nestjs/common';
import { PropertyModule } from './modules/property/property.module';
import { CaseModule } from './modules/case/case.module';
import { PeopleModule } from './modules/people/people.module';
import { AuthModule } from './auth/auth.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { IncidentModule } from './modules/incident/incident.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { LetterModule } from './modules/letter/letter.module';
import { WitnessModule } from './modules/witness/witness.module';
import { ActionModule } from './modules/action/action.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { EscalationModule } from './modules/escalation/escalation.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PropertyModule,
    CaseModule,
    PeopleModule,
    TimelineModule,
    ComplaintModule,
    IncidentModule,
    EvidenceModule,
    CommunicationModule,
    LetterModule,
    WitnessModule,
    ActionModule,
    MonitoringModule,
    EscalationModule,
    DashboardModule,
  ],
})
export class AppModule {}