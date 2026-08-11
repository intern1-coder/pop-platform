import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class CommunicationService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async create(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const comm = await this.prisma.complaintCommunication.create({
      data: {
        complaintId,
        type: data.type,
        direction: data.direction,
        date: data.date || new Date(),
        summary: data.summary,
        details: data.details || null,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Communication Added',
      details: `Communication: ${data.type} — ${data.summary}`,
    });

    return comm;
  }

  async findAll(complaintId: string) {
    return this.prisma.complaintCommunication.findMany({
      where: { complaintId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(complaintId: string, communicationId: string, data: any, userId: string) {
    const comm = await this.prisma.complaintCommunication.findUnique({ where: { id: communicationId } });
    if (!comm) throw new NotFoundException('Communication not found');
    if (comm.complaintId !== complaintId) throw new ForbiddenException('Access denied');

    const isAdmin = await this.prisma.userRole.findMany({
      where: { userId, role: { name: 'Admin' } },
    });
    if (isAdmin.length === 0) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.complaintCommunication.update({
      where: { id: communicationId },
      data: { type: data.type, direction: data.direction, date: data.date, summary: data.summary, details: data.details },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Communication Updated',
      details: `Communication ${communicationId} updated`,
    });

    return updated;
  }

  private async isAdmin(userId: string) {
    const hasAdminRole = await this.prisma.userRole.findMany({
      where: { userId, role: { name: 'Admin' } },
    });
    return hasAdminRole.length > 0;
  }
}