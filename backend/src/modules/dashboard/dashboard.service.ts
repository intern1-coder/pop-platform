import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(orgId: string) {
    const [properties, openCases, totalIncidents, activeMonitoring, pendingActions, openComplaints] = await Promise.all([
      this.prisma.property.count({ where: { orgId } }),
      this.prisma.complaint.count({ where: { orgId, status: { not: 'Closed' } } }),
      this.prisma.complaintIncident.count({ where: { complaint: { orgId } } }),
      this.prisma.complaintMonitoring.count({ where: { complaint: { orgId }, status: 'Approved' } }),
      this.prisma.complaintAction.count({
        where: { complaint: { orgId }, status: { notIn: ['Completed'] } },
      }),
      this.prisma.complaint.count({ where: { orgId } }),
    ]);

    const recentActivity = await this.prisma.timelineEvent.findMany({
      where: { complaint: { orgId } },
      include: { person: true, complaint: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalProperties: properties,
      openCases,
      totalIncidents,
      activeMonitoring,
      pendingActions,
      totalComplaints: openComplaints,
      recentActivity,
    };
  }
}
