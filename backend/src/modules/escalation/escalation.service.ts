import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class EscalationService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async escalate(complaintId: string, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { organization: true },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const updated = await this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: 'Escalated',
        riskLevel: 'Critical',
        riskScore: 9,
      },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId,
        action: 'Escalated',
        details: `Complaint ${complaint.reference} escalated by ${userId}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Escalated',
      details: 'Case escalated to senior team / legal',
    });

    return updated;
  }
}
