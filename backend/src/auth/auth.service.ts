import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(email: string, password: string, firstName: string, lastName: string) {
    const existing = await this.prisma.person.findUnique({ where: { email } });
    if (existing) throw new ConflictException('User exists');

    const hash = await bcrypt.hash(password, 10);
    let org = await this.prisma.organization.findFirst();
    if (!org) org = await this.prisma.organization.create({ data: { name: 'Default Org' } });

    const user = await this.prisma.person.create({
      data: { email, passwordHash: hash, firstName, lastName, orgId: org.id, status: 'Active' },
    });

    let role = await this.prisma.role.findUnique({ where: { name: 'Tenant' } });
    if (!role) role = await this.prisma.role.create({ data: { name: 'Tenant' } });
    await this.prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    return this.login(user);
  }

  async login(user: any) {
    const roles = await this.getUserRoles(user.id);
    const payload = { sub: user.id, email: user.email, orgId: user.orgId, roles };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.session.create({
      data: { userId: user.id, refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    await this.prisma.person.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    return { accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles } };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.person.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'Active') throw new UnauthorizedException('Account locked');
    return user;
  }

  async refreshTokens(refreshToken: string) {
    const session = await this.prisma.session.findUnique({ where: { refreshToken }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) throw new UnauthorizedException('Invalid refresh token');
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.login(session.user);
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
    return { success: true };
  }

  async getUserRoles(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map(ur => ur.role.name);
  }
}