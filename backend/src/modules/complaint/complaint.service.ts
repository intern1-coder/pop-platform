import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';
import { NotifyService } from '../notify/notify.service';
import { computeRiskScore, riskLevelFromScore } from '../../asb/risk';
import { buildCourtChecklist, requiresPoliceReference } from '../../asb/court-checklist';
import { visitSlaInfo } from '../../asb/dates';

@Injectable()
export class ComplaintService {
  constructor(
    private prisma: PrismaService,
    private timeline: TimelineService,
    private notify: NotifyService,
  ) {}

  // Generate complaint reference: ASB-2026-001
  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.complaint.count();
    const seq = String(count + 1).padStart(3, '0');
    return `ASB-${year}-${seq}`;
  }

  // Resolve a landlord alias to the registered company (name + address) used in
  // letter footers. Returns null when no alias matches (caller flags it).
  private async resolveLandlord(alias?: string | null) {
    if (!alias) return { landlordName: null, landlordAddress: null, unmapped: false };
    const company = await this.prisma.housingCompany.findFirst({
      where: { alias: { equals: alias.trim(), mode: 'insensitive' } },
    });
    if (company) {
      return {
        landlordName: company.fullName,
        landlordAddress: company.address,
        unmapped: false,
      };
    }
    return { landlordName: alias, landlordAddress: null, unmapped: true };
  }

  async create(data: any, userId: string, orgId: string) {
    const reference = await this.generateReference();

    const riskFactors = data.riskFactors || null;
    const riskScore = computeRiskScore(riskFactors);
    const riskLevel = riskLevelFromScore(riskScore);

    const landlord = await this.resolveLandlord(data.landlordName);

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
        riskFactors,
        assignedToId: data.assignedToId || null,
        assignedPmEmail: data.assignedPmEmail || null,
        branch: data.branch || null,
        propertyLevel: !!data.propertyLevel,
        noticeGround: data.noticeGround || null,
        noticeServedDate: data.noticeServedDate ? new Date(data.noticeServedDate) : null,
        noticeExpiresDate: data.noticeExpiresDate ? new Date(data.noticeExpiresDate) : null,
        rentArrearsAmount: data.rentArrearsAmount ?? null,
        landlordName: landlord.landlordName,
        landlordAddress: landlord.landlordAddress,
        housingCompanyId: data.housingCompanyId || null,
        tenancyRef: data.tenancyRef || null,
        orgId,
        tenants: {
          create:
            Array.isArray(data.tenants) && data.tenants.length
              ? data.tenants.map((t: any, i: number) => ({
                  tenantName: t.tenantName || t.name,
                  tenantEmail: t.tenantEmail || null,
                  tenantPhone: t.tenantPhone || null,
                  tenancyRef: t.tenancyRef || null,
                  isPrimary: i === 0,
                }))
              : [
                  {
                    tenantName: data.tenantName,
                    tenantEmail: data.tenantEmail || null,
                    tenantPhone: data.tenantPhone || null,
                    tenancyRef: data.tenancyRef || null,
                    isPrimary: true,
                  },
                ],
        },
      },
    });

    await this.timeline.create({
      complaintId: complaint.id,
      personId: userId,
      action: 'Case Created',
      details: `Complaint ${reference} created - ${data.category}${data.propertyLevel ? ' (whole property)' : ''}`,
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId: complaint.id,
        action: 'complaint_created',
        details: `Complaint ${reference} created by ${userId}`,
        userId,
      },
    });

    if (riskFactors) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: complaint.id,
          action: 'risk_assessed',
          details: `Risk assessment saved — score ${riskScore} (${riskLevel})`,
          userId,
        },
      });
    }

    if (landlord.unmapped) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: complaint.id,
          action: 'landlord_unmapped',
          details: `Landlord "${data.landlordName}" doesn't match any known company — letters will use the generic fallback name/address until this is mapped in housing_companies.`,
          userId,
        },
      });
    }

    // Critical cases alert the management chain immediately.
    if ((data.severity || '').toLowerCase() === 'critical') {
      const opsEmails = (process.env.OPS_ALERT_EMAILS || '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
      for (const to of opsEmails) {
        await this.notify.sendEmail({
          to,
          subject: `[CRITICAL CASE] Complaint ${reference} — IMMEDIATE ACTION REQUIRED`,
          bodyText: `Critical complaint logged.\n\nCase: ${reference}\nTenant: ${data.tenantName}\nCategory: ${data.category}\nLogged by: ${userId}`,
        });
      }
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: complaint.id,
          action: 'critical_case_alert',
          details: `Immediate critical alert sent to BM and Ops on case creation`,
          userId: 'system',
        },
      });
    }

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

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.severity) where.severity = filters.severity;

    // Pagination params: ?page=1&limit=25 (cap at 100)
    const page = Math.max(parseInt(filters?.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(filters?.limit, 10) || 25, 1), 100);
    const skip = (page - 1) * limit;

    // Lean select — only fields the list UI actually renders. Previously this
    // endpoint returned the FULL complaint with every nested sub-table
    // (incidents, evidence, communications, actions, witnesses, tenants,
    // monitoring) for every row, which the list page never used.
    const select = {
      id: true,
      reference: true,
      tenantName: true,
      category: true,
      severity: true,
      riskLevel: true,
      riskScore: true,
      status: true,
      incidentDate: true,
      createdAt: true,
      updatedAt: true,
      monitoringStatus: true,
      property: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    } as const;

    const [total, data] = await Promise.all([
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        select,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
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
        witnesses: true,
        actions: true,
        auditLogs: true,
        timelineEvents: true,
        monitoring: true,
        tenants: true,
        external: true,
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
    if (!complaint) throw new NotFoundException('Complaint not found');

    // Recompute risk when factors change.
    let riskScore = complaint.riskScore;
    let riskLevel = complaint.riskLevel;
    const riskChanged =
      data.riskFactors !== undefined && data.riskFactors !== complaint.riskFactors;
    if (riskChanged) {
      riskScore = computeRiskScore(data.riskFactors);
      riskLevel = riskLevelFromScore(riskScore);
    }

    // Auto-stamp closure time when transitioning to closed.
    let closedAt = data.closedAt !== undefined ? (data.closedAt ? new Date(data.closedAt) : null) : undefined;
    if (data.status === 'Closed' && complaint.status !== 'Closed' && closedAt === undefined) {
      closedAt = new Date();
    }
    if (data.status !== undefined && data.status !== 'Closed' && closedAt === undefined) {
      closedAt = null;
    }

    // Re-resolve landlord if it changed and no address supplied.
    let landlordName = data.landlordName !== undefined ? data.landlordName : undefined;
    let landlordAddress = data.landlordAddress !== undefined ? data.landlordAddress : undefined;
    if (data.landlordName !== undefined && data.landlordName !== complaint.landlordName) {
      const resolved = await this.resolveLandlord(data.landlordName);
      landlordName = resolved.landlordName;
      landlordAddress = resolved.landlordAddress;
      if (resolved.unmapped) {
        await this.prisma.complaintAudit.create({
          data: {
            complaintId: id,
            action: 'landlord_unmapped',
            details: `Landlord "${data.landlordName}" doesn't match any known company.`,
            userId,
          },
        });
      }
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: {
        ...data,
        riskScore,
        riskLevel,
        ...(closedAt !== undefined ? { closedAt } : {}),
        ...(landlordName !== undefined ? { landlordName } : {}),
        ...(landlordAddress !== undefined ? { landlordAddress } : {}),
        noticeServedDate: data.noticeServedDate !== undefined ? (data.noticeServedDate ? new Date(data.noticeServedDate) : null) : undefined,
        noticeExpiresDate: data.noticeExpiresDate !== undefined ? (data.noticeExpiresDate ? new Date(data.noticeExpiresDate) : null) : undefined,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
      },
    });

    // Audit each meaningful change separately so the case timeline reads cleanly.
    if (data.status !== undefined && data.status !== complaint.status) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: id,
          action: 'status_changed',
          details: `Status changed from ${complaint.status} to ${data.status}`,
          userId,
        },
      });
    }
    if (data.severity !== undefined && data.severity !== complaint.severity) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: id,
          action: 'severity_changed',
          details: `Severity changed from ${complaint.severity} to ${data.severity}`,
          userId,
        },
      });
    }
    if (riskChanged) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: id,
          action: 'risk_assessed',
          details: `Risk assessment saved — score ${riskScore} (${riskLevel})`,
          userId,
        },
      });
    }
    const noticeChanged =
      (data.noticeGround !== undefined && data.noticeGround !== complaint.noticeGround) ||
      (data.noticeServedDate !== undefined && (complaint.noticeServedDate
        ? data.noticeServedDate !== complaint.noticeServedDate.toISOString().slice(0, 10)
        : !!data.noticeServedDate));
    if (noticeChanged) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: id,
          action: 'notice_updated',
          details: 'Section 8 notice details updated',
          userId,
        },
      });
    }
    if (data.assignedToId !== undefined && data.assignedToId !== complaint.assignedToId) {
      await this.prisma.complaintAudit.create({
        data: {
          complaintId: id,
          action: 'pm_reassigned',
          details: `PM reassigned by ${userId}`,
          userId,
        },
      });
    }

    await this.timeline.create({
      complaintId: id,
      personId: userId,
      action: 'Case Updated',
      details: `Complaint ${complaint.reference} updated`,
    });

    return updated;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    const closedAt = status === 'Closed' ? new Date() : null;

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status, closedAt },
    });

    await this.prisma.complaintAudit.create({
      data: {
        complaintId: id,
        action: 'status_changed',
        details: `Status changed to ${status} by ${userId}`,
        userId,
      },
    });

    await this.timeline.create({
      complaintId: id,
      personId: userId,
      action: 'Status Changed',
      details: `Status changed to ${status}`,
    });

    return updated;
  }

  // GET /complaints/:id/sla — visit SLA status for the case.
  async getSla(id: string, user: any) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));
    if (!isStaff && complaint.tenantEmail !== user.email) throw new ForbiddenException('Access denied');

    const sla = visitSlaInfo(complaint.severity, complaint.createdAt);
    const incidentCount = await this.prisma.complaintIncident.count({ where: { complaintId: id } });
    const evidenceCount = await this.prisma.complaintEvidence.count({ where: { complaintId: id } });
    return {
      ...sla,
      severity: complaint.severity,
      incidentCount,
      evidenceCount,
      addressed: incidentCount > 0 || evidenceCount > 0,
    };
  }

  // GET /complaints/:id/export — full case pack + court readiness checklist.
  async exportCase(id: string, user: any) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        property: true,
        assignedTo: true,
        incidents: true,
        evidence: true,
        communications: true,
        letters: true,
        witnesses: true,
        actions: true,
        auditLogs: true,
        timelineEvents: true,
        monitoring: true,
        tenants: true,
        external: true,
      },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));
    if (!isStaff && complaint.tenantEmail !== user.email) throw new ForbiddenException('Access denied');

    const { checklist, courtReady } = buildCourtChecklist({
      complaint,
      incidents: complaint.incidents,
      letters: complaint.letters,
      evidence: complaint.evidence,
      external: complaint.external,
      witnesses: complaint.witnesses,
    });

    return {
      complaint,
      incidents: complaint.incidents,
      evidence: complaint.evidence,
      letters: complaint.letters,
      external: complaint.external,
      witnesses: complaint.witnesses,
      audit: complaint.auditLogs,
      communications: complaint.communications,
      actions: complaint.actions,
      tenants: complaint.tenants,
      monitoring: complaint.monitoring,
      checklist,
      courtReady,
    };
  }
}
