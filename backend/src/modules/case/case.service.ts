import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

@Injectable()
export class CaseService {
  constructor(private prisma: PrismaService, private timeline: TimelineService) {}

  async create(data: any, userId: string, orgId: string) {
    const fullDesc = `
      Incident: ${data.incidentDetails || ''}
      Location: ${data.location || 'N/A'}
      Date: ${data.incidentDate || 'N/A'}
      Witnesses: ${data.witnesses || 'None'}
      Urgency: ${data.urgency || 'Medium'}
    `;

    const newCase = await this.prisma.case.create({
      data: {
        title: data.title,
        description: fullDesc,
        type: 'ASB',
        priority: data.urgency || 'Medium',
        propertyId: data.propertyId,
        reporterId: userId,
        orgId: orgId,
        status: 'Open',
      },
    });

    await this.timeline.create({
      caseId: newCase.id,
      personId: userId,
      action: 'Case Created',
      details: `ASB Report: ${data.title}`,
    });

    return newCase;
  }

  async findAll(user: any) {
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

    if (isStaff) {
      return this.prisma.case.findMany({
        where: { orgId: user.orgId },
        include: { property: true, reporter: true, assignee: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const userWithUnits = await this.prisma.person.findUnique({
      where: { id: user.id },
      include: { tenancyUnits: true },
    });
    const propertyIds = userWithUnits?.tenancyUnits.map(u => u.propertyId) || [];

    return this.prisma.case.findMany({
      where: {
        OR: [
          { reporterId: user.id },
          { propertyId: { in: propertyIds } },
        ],
      },
      include: { property: true, reporter: true, assignee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const caseItem = await this.prisma.case.findUnique({ where: { id } });
    if (!caseItem) throw new ForbiddenException('Not found');

    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));
    if (isStaff) {
      if (caseItem.orgId !== user.orgId) throw new ForbiddenException('Access denied');
      return caseItem;
    }

    if (caseItem.reporterId === user.id) return caseItem;
    
    const userWithUnits = await this.prisma.person.findUnique({
      where: { id: user.id },
      include: { tenancyUnits: { where: { propertyId: caseItem.propertyId } } },
    });
    if (!userWithUnits || userWithUnits.tenancyUnits.length === 0) throw new ForbiddenException('Access denied');
    return caseItem;
  }
}