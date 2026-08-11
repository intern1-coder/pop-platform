import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

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

    const mon = await this.prisma.complaintMonitoring.create({
      data: {
        complaintId,
        status: 'Requested',
        justification: data.justification || null,
        requestedById: userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringRequired: true, monitoringStatus: 'Requested' },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Requested',
      details: data.justification || 'Monitoring requested',
    });

    return mon;
  }

  async approve(complaintId: string, monitoringId: string, userId: string) {
    const mon = await this.getMonitoring(complaintId, monitoringId);
    if (mon.status !== 'Requested') throw new BadRequestException('Only requested monitoring can be approved');

    const updated = await this.prisma.complaintMonitoring.update({
      where: { id: monitoringId },
      data: { status: 'Approved', approvedById: userId },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringStatus: 'Approved' },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Approved',
      details: `Monitoring request approved by ${userId}`,
    });

    return updated;
  }

  async reject(complaintId: string, monitoringId: string, userId: string) {
    const mon = await this.getMonitoring(complaintId, monitoringId);
    if (mon.status !== 'Requested') throw new BadRequestException('Only requested monitoring can be rejected');

    const updated = await this.prisma.complaintMonitoring.update({
      where: { id: monitoringId },
      data: { status: 'Rejected', approvedById: userId, endReason: 'Rejected' },
    });

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { monitoringStatus: 'Rejected' },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Monitoring Rejected',
      details: `Monitoring request rejected by ${userId}`,
    });

    return updated;
  }
}
