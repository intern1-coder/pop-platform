import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { riskFactorList } from '../../asb/risk';
import { ASB_LETTER_TYPES } from '../../asb/letter-templates';

@Controller('meta/asb')
export class MetaController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'PropertyManager')
  getMeta() {
    return {
      riskFactors: riskFactorList(),
      letterTypes: ASB_LETTER_TYPES,
      visitWindows: { critical: 0, high: 3, medium: 5, low: 7 },
      noticeGrounds: [
        { value: '12', label: 'Ground 12 — tenancy breach (14 days)' },
        { value: '14', label: 'Ground 14 — ASB / nuisance (immediate)' },
      ],
    };
  }

  @Get('housing-companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'PropertyManager')
  housingCompanies() {
    return this.prisma.housingCompany.findMany({ orderBy: { fullName: 'asc' } });
  }

  @Post('housing-companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  createCompany(@Body() dto: { alias: string; fullName: string; address: string }) {
    return this.prisma.housingCompany.create({
      data: {
        alias: dto.alias,
        fullName: dto.fullName,
        address: dto.address,
      },
    });
  }

  @Put('housing-companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  updateCompany(@Param('id') id: string, @Body() dto: any) {
    return this.prisma.housingCompany.update({
      where: { id },
      data: dto,
    });
  }

  @Delete('housing-companies/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  deleteCompany(@Param('id') id: string) {
    return this.prisma.housingCompany.delete({ where: { id } });
  }
}
