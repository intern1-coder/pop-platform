import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class IncidentService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  async create(complaintId: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!complaint) throw new ForbiddenException('Complaint not found');

    const incident = await this.prisma.complaintIncident.create({
      data: {
        complaintId,
        incidentDate: new Date(data.incidentDate),
        category: data.category,
        severity: data.severity,
        description: data.description,
        location: data.location || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        gpsAccuracy: data.gpsAccuracy ? parseFloat(data.gpsAccuracy) : null,
        loggedById: userId,
      },
    });

    await this.timeline.create({
      complaintId,
      personId: userId,
      action: 'Incident Recorded',
      details: `Incident recorded: ${data.category} - ${data.severity}`,
    });

    // Update complaint risk level
    const allIncidents = await this.prisma.complaintIncident.findMany({
      where: { complaintId },
      select: { severity: true },
    });
    const severityMap: Record<string, number> = { Low: 1, Medium: 3, High: 6, Critical: 9 };
    let maxRisk = 0;
    allIncidents.forEach(inc => {
      const score = severityMap[inc.severity] || 0;
      if (score > maxRisk) maxRisk = score;
    });
    let riskLevel = 'Low';
    if (maxRisk <= 2) riskLevel = 'Low';
    else if (maxRisk <= 4) riskLevel = 'Medium';
    else if (maxRisk <= 7) riskLevel = 'High';
    else riskLevel = 'Critical';

    await this.prisma.complaint.update({
      where: { id: complaintId },
      data: { riskScore: maxRisk, riskLevel },
    });

    return incident;
  }

  async findAll(complaintId: string) {
    return this.prisma.complaintIncident.findMany({
      where: { complaintId },
      include: { loggedBy: true },
      orderBy: { incidentDate: 'desc' },
    });
  }

  async findOne(complaintId: string, incidentId: string) {
    const incident = await this.prisma.complaintIncident.findUnique({
      where: { id: incidentId },
      include: { loggedBy: true },
    });
    if (!incident) throw new ForbiddenException('Incident not found');
    if (incident.complaintId !== complaintId) {
      throw new ForbiddenException('Incident does not belong to this complaint');
    }
    return incident;
  }
}