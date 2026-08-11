import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

const STATUS_ORDER = ['Pending', 'InProgress', 'Completed'];

@Injectable()
export class ActionService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async create(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const action = await this.prisma.complaintAction.create({
      data: {
        complaintId,
        description: data.description,
        ownerId: data.ownerId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: 'Pending',
        createdById: userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Action Created',
      details: `Action: ${data.description} (due ${action.dueDate?.toISOString()})`,
    });

    return action;
  }

  async findAll(complaintId: string) {
    await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    return this.prisma.complaintAction.findMany({
      where: { complaintId },
      include: { owner: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(complaintId: string, actionId: string, data: any) {
    const action = await this.prisma.complaintAction.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action not found');
    if (action.complaintId !== complaintId) throw new NotFoundException('Action not found');

    const nextStatus = data.status;
    const isCycle = STATUS_ORDER.includes(action.status) && nextStatus && STATUS_ORDER.indexOf(nextStatus) > STATUS_ORDER.indexOf(action.status);
    let completedAt = action.completedAt;
    if (nextStatus === 'Completed') completedAt = new Date();
    if (nextStatus === 'Pending' || nextStatus === 'InProgress') completedAt = null;

    const updated = await this.prisma.complaintAction.update({
      where: { id: actionId },
      data: {
        description: data.description !== undefined ? data.description : action.description,
        ownerId: data.ownerId !== undefined ? data.ownerId : action.ownerId,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : action.dueDate,
        status: nextStatus || action.status,
        completedAt: completedAt ?? undefined,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: action.createdById ?? updated.ownerId ?? null,
      action: isCycle ? 'Action Progressed' : 'Action Updated',
      details: `Action updated -> ${updated.status} (${updated.description})`,
    });

    return updated;
  }
}
