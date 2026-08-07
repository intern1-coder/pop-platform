import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  async create(data: { caseId?: string; complaintId?: string; personId: string; action: string; details: string }) {
    return this.prisma.timelineEvent.create({
      data: {
        caseId: data.caseId || null,
        complaintId: data.complaintId || null,
        personId: data.personId,
        action: data.action,
        details: data.details,
      },
    });
  }

  async getTimelineForCase(caseId: string) {
    return this.prisma.timelineEvent.findMany({
      where: { caseId },
      include: { person: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentTimeline(orgId: string, limit: number = 10) {
    // For now, just get recent events by person's organization
    // We'll refine later
    return this.prisma.timelineEvent.findMany({
      include: { person: true, case: { include: { property: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}