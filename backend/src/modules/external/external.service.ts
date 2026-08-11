import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class ExternalService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  async findAll(complaintId: string) {
    await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    return this.prisma.complaintExternal.findMany({
      where: { complaintId },
      include: { loggedBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    if (!data.bodyType) throw new ForbiddenException('bodyType is required');

    const created = await this.prisma.complaintExternal.create({
      data: {
        complaintId,
        bodyType: data.bodyType,
        cadNumber: data.cadNumber || null,
        referenceNumber: data.referenceNumber || null,
        officerName: data.officerName || null,
        forceName: data.forceName || null,
        dateReported: data.dateReported ? new Date(data.dateReported) : null,
        status: data.status || null,
        notes: data.notes || null,
        loggedById: userId,
      },
      include: { loggedBy: true },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'external_added',
        details: `External ref (${data.bodyType}) added by ${userId}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'External Reference Added',
      details: `${data.bodyType} reference recorded (CAD: ${data.cadNumber || 'n/a'})`,
    });

    return created;
  }

  async remove(complaintId: string, externalId: string, userId: string) {
    const existing = await this.prisma.complaintExternal.findUnique({
      where: { id: externalId },
    });
    if (!existing) throw new NotFoundException('External reference not found');
    if (existing.complaintId !== complaintId) throw new ForbiddenException('Access denied');

    await this.prisma.complaintExternal.delete({ where: { id: externalId } });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'External Reference Removed',
      details: `${existing.bodyType} reference removed`,
    });

    return { ok: true };
  }
}
