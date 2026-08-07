import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, orgId: string) {
    const person = await this.prisma.person.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        orgId: orgId,
      },
    });

    const roleName = data.role || 'Tenant';
    let role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) role = await this.prisma.role.create({ data: { name: roleName } });
    await this.prisma.userRole.create({ data: { userId: person.id, roleId: role.id } });

    return person;
  }

  async findAll(orgId: string) {
    return this.prisma.person.findMany({
      where: { orgId },
      include: { roles: { include: { role: true } } },
    });
  }

  async findOne(id: string) {
    return this.prisma.person.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
  }
}