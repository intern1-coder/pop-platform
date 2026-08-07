import { Module } from '@nestjs/common';
import { PropertyModule } from './modules/property/property.module';
import { CaseModule } from './modules/case/case.module';
import { PeopleModule } from './modules/people/people.module';
import { AuthModule } from './auth/auth.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { ComplaintModule } from './modules/complaint/complaint.module'; // <-- MUST BE HERE
import { IncidentModule } from './modules/incident/incident.module';  
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
    IncidentModule // <-- MUST BE HERE
  ],
})
export class AppModule {}