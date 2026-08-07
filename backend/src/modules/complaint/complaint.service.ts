import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class ComplaintService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
  ) {}

  // Generate complaint reference: ASB-2024-001
  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.complaint.count();
    const seq = String(count + 1).padStart(3, '0');
    return `ASB-${year}-${seq}`;
  }

  // Calculate risk level from score
  private getRiskLevel(score: number): string {
    if (score <= 2) return 'Low';
    if (score <= 4) return 'Medium';
    if (score <= 7) return 'High';
    return 'Critical';
  }

  async create(data: any, userId: string, orgId: string) {
    const reference = await this.generateReference();
    
    // Calculate risk score (simplified - can be more complex)
    const severityMap: Record<string, number> = { Low: 1, Medium: 3, High: 6, Critical: 9 };
    const riskScore = severityMap[data.severity] || 1;
    const riskLevel = this.getRiskLevel(riskScore);

    const complaint = await this.prisma.complaint.create({
      data: {
        reference,
        tenantName: data.tenantName,
        tenantEmail: data.tenantEmail,
        tenantPhone: data.tenantPhone,
        propertyId: data.propertyId,
        category: data.category,
        severity: data.severity,
        status: 'Open',
        description: data.description,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        postcode: data.postcode,
        incidentDate: new Date(data.incidentDate),
        riskScore,
        riskLevel,
        assignedToId: data.assignedToId || null,
        orgId,
      },
    });

    
    // Create timeline entry
    
    await this.timeline.create({
      complaintId: complaint.id,
      personId: userId,
      action: 'Case Created',
      details: `Complaint ${reference} created - ${data.category}`,
    });

    // Create audit log
    await this.prisma.complaintAudit.create({
      data: {
        complaintId: complaint.id,
        action: 'Created',
        details: `Complaint ${reference} created by ${userId}`,
        userId,
      },
    });

    

    return complaint;
  }

  async findAll(user: any, filters?: any) {
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

    const where: any = {};
    
    if (!isStaff) {
      // Tenants only see their own complaints
      where.tenantEmail = user.email;
    } else {
      where.orgId = user.orgId;
    }

    // Apply filters
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.severity) where.severity = filters.severity;

    return this.prisma.complaint.findMany({
      where,
      include: {
        property: true,
        assignedTo: true,
        incidents: true,
        evidence: true,
        communications: true,
        actions: true,
        witnesses: true,   // <-- FIXED: was 'witness'
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        property: true,
        assignedTo: true,
        incidents: true,
        evidence: true,
        communications: true,
        letters: true,
        witnesses: true,     // <-- FIXED: was 'witness'
        actions: true,
        auditLogs: true,
        timelineEvents: true,
      },
    });

    if (!complaint) throw new ForbiddenException('Complaint not found');

    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

    if (!isStaff && complaint.tenantEmail !== user.email) {
      throw new ForbiddenException('Access denied');
    }

    return complaint;
  }

  async update(id: string, data: any, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new ForbiddenException('Complaint not found');

    // Recalculate risk if severity changed
    let riskScore = complaint.riskScore;
    let riskLevel = complaint.riskLevel;
    if (data.severity) {
      const severityMap: Record<string, number> = { Low: 1, Medium: 3, High: 6, Critical: 9 };
      riskScore = severityMap[data.severity] || 1;
      riskLevel = this.getRiskLevel(riskScore);
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        ...data,
        riskScore,
        riskLevel,
      },
    });

    // Audit log
    await this.prisma.complaintAudit.create({
      data: {
        complaintId: id,
        action: 'Updated',
        details: `Complaint ${complaint.reference} updated by ${userId}`,
        userId,
      },
    });

    return updated;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new ForbiddenException('Complaint not found');

    const closedAt = status === 'Closed' ? new Date() : undefined;

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status, closedAt },
    });

    // Audit log
    await this.prisma.complaintAudit.create({
      data: {
        complaintId: id,
        action: 'Status Changed',
        details: `Status changed to ${status} by ${userId}`,
        userId,
      },
    });

    return updated;
  }
}