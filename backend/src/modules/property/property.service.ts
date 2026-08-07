import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, userId: string, orgId: string) {
    return this.prisma.property.create({
      data: { name: data.name, address: data.address, type: data.type, orgId },
    });
  }

  async findAll(user: any) {
    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));

    if (isStaff) {
      return this.prisma.property.findMany({ where: { orgId: user.orgId }, orderBy: { createdAt: 'desc' } });
    }

    const userWithUnits = await this.prisma.person.findUnique({
      where: { id: user.id },
      include: { tenancyUnits: true },
    });
    const propertyIds = userWithUnits?.tenancyUnits.map(u => u.propertyId) || [];
    return this.prisma.property.findMany({ where: { id: { in: propertyIds } }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, user: any) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new ForbiddenException('Not found');

    const roles = user?.roles || [];
    const isStaff = roles.some((r: string) => ['Admin', 'PropertyManager'].includes(r));
    if (isStaff) {
      if (property.orgId !== user.orgId) throw new ForbiddenException('Access denied');
      return property;
    }

    const userWithUnits = await this.prisma.person.findUnique({
      where: { id: user.id },
      include: { tenancyUnits: { where: { propertyId: id } } },
    });
    if (!userWithUnits || userWithUnits.tenancyUnits.length === 0) throw new ForbiddenException('Access denied');
    return property;
  }
}