import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

export const MONITORING_ACTIVE = ['Requested', 'Approved'];

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async findAll(complaintId: string) {
    await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    return this.prisma.complaintMonitoring.findMany({
      where: { complaintId },
      include: { requestedBy: true, approvedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getMonitoring(complaintId: string, monitoringId: string) {
    const mon = await this.prisma.complaintMonitoring.findUnique({ where: { id: monitoringId } });
    if (!mon) throw new NotFoundException('Monitoring request not found');
    if (mon.complaintId !== complaintId) throw new ForbiddenException('Access denied');
    return mon;
  }

  async request(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const justification = (data.justification || '').trim();
    if (!justification) {
      throw new BadRequestException('A justification is required to request Monitoring');
    }

    // A case can only be parked as Monitoring once a warning letter has actually
    // been SENT — proof of real casework, not a self-toggle.
    const sentWarning = await this.prisma.complaintLetter.count({
      where: {
        complaintId,
        letterType: { in: ['first_warning', 'final_warning'] },
        sentDate: { not: null },
      },
    });
    if (!sentWarning) {
      throw new BadRequestException(
        'Monitoring can only be requested once a warning letter has actually been sent on this case.',
      );
    }

    const existingActive = await this.prisma.complaintMonitoring.findFirst({
      where: { complaintId, status: { in: MONITORING_ACTIVE } },
    });
    if (existingActive) {
      throw new BadRequestException('This case already has an active or pending Monitoring request.');
    }

    const mon = await this.prisma.complaintMonitoring.create({
      data: {
        complaintId,
        status: 'Requested',
        justification,
        requestedById: userId,
      },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringRequired: true, monitoringStatus: 'Requested' },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'monitoring_requested',
        details: `Monitoring requested by ${userId}: ${justification}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Requested',
      details: justification,
    });

    return mon;
  }

  async approve(complaintId: string, monitoringId: string, userId: string) {
    const mon = await this.getMonitoring(complaintId, monitoringId);
    if (mon.status !== 'Requested') throw new BadRequestException('Only requested monitoring can be approved');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const updated = await this.prisma.complaintMonitoring.update({
      where: { id: monitoringId },
      data: { status: 'Approved', approvedById: userId, expiresAt },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringStatus: 'Approved' },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'monitoring_approved',
        details: `Monitoring approved by ${userId} — active for 30 days`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Approved',
      details: `Monitoring request approved — active until ${expiresAt.toISOString().slice(0, 10)}`,
    });

    return updated;
  }

  async reject(complaintId: string, monitoringId: string, userId: string) {
    const mon = await this.getMonitoring(complaintId, monitoringId);
    if (mon.status !== 'Requested') throw new BadRequestException('Only requested monitoring can be rejected');

    const updated = await this.prisma.complaintMonitoring.update({
      where: { id: monitoringId },
      data: {
        status: 'Rejected',
        approvedById: userId,
        endReason: `Rejected by ${userId}`,
      },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringStatus: 'Rejected' },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'monitoring_rejected',
        details: `Monitoring request rejected by ${userId}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Rejected',
      details: `Monitoring request rejected by ${userId}`,
    });

    return updated;
  }

  // Mark active monitoring as Broken — e.g. a new incident was logged while the
  // case was parked, so "compliant behaviour" can no longer be assumed.
  async breakActive(complaintId: string, reason: string) {
    const active = await this.prisma.complaintMonitoring.findFirst({
      where: { complaintId, status: { in: MONITORING_ACTIVE } },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) return null;

    const updated = await this.prisma.complaintMonitoring.update({
      where: { id: active.id },
      data: { status: 'Broken', endReason: reason },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringStatus: 'Broken' },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'monitoring_broken',
        details: reason,
        userId: 'system',
      },
    });

    await this.timeline.create({
      complaintId,
      personId: null as any,
      action: 'Monitoring Broken',
      details: reason,
    });

    return updated;
  }

  // Cron helper — expire Approved monitoring past its 30-day window.
  async expirePastDue(): Promise<number> {
    const now = new Date();
    const expired = await this.prisma.complaintMonitoring.findMany({
      where: { status: 'Approved', expiresAt: { not: null, lt: now } },
    });
    for (const m of expired) {
      await this.prisma.complaintMonitoring.update({
        where: { id: m.id },
        data: { status: 'Expired', endReason: '30-day monitoring period elapsed' },
      });
      await this.prisma.complaint.update({
        where: { id: m.complaintId },
        data: { monitoringStatus: 'Expired' },
      });
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: m.complaintId,
          action: 'monitoring_expired',
          details: '30-day Monitoring period elapsed — case flagged for review',
          userId: 'system',
        },
      });
      await this.timeline.create({
        complaintId: m.complaintId,
        personId: null as any,
        action: 'Monitoring Expired',
        details: '30-day Monitoring period elapsed — case flagged for review',
      });
    }
    return expired.length;
  }
}
