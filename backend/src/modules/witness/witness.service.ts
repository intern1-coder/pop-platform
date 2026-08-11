import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class WitnessService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async create(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const witness = await this.prisma.complaintWitness.create({
      data: {
        complaintId,
        name: data.name,
        contactDetails: data.contactDetails || null,
        statement: data.statement || null,
        anonymous: data.anonymous || false,
        digitalAcknowledgement: data.digitalAcknowledgement || false,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Witness Added',
      details: `Witness "${witness.name}" recorded${witness.anonymous ? ' (anonymous)' : ''}`,
    });

    return witness;
  }

  async findAll(complaintId: string) {
    await this.prisma.complaint.findUnique({ where: { id: complaintId } });
    return this.prisma.complaintWitness.findMany({
      where: { complaintId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(complaintId: string, witnessId: string, data: any) {
    const witness = await this.prisma.complaintWitness.findUnique({ where: { id: witnessId } });
    if (!witness) throw new NotFoundException('Witness not found');
    if (witness.complaintId !== complaintId) throw new NotFoundException('Witness not found');

    const updated = await this.prisma.complaintWitness.update({
      where: { id: witnessId },
      data: {
        name: data.name,
        contactDetails: data.contactDetails,
        statement: data.statement,
        anonymous: data.anonymous,
        digitalAcknowledgement: data.digitalAcknowledgement,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: witness.id,
      action: 'Witness Updated',
      details: `Witness "${updated.name}" details updated`,
    });

    return updated;
  }
}
