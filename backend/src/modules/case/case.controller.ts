import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CaseService } from './case.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CaseController {
  constructor(private readonly caseService: CaseService) {}

  @Post()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  create(@Body() dto: any, @Request() req) {
    return this.caseService.create(dto, req.user.id, req.user.orgId);
  }

  @Get()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findAll(@Request() req) {
    return this.caseService.findAll(req.user);
  }

  @Get(':id')
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findOne(@Param('id') id: string, @Request() req) {
    return this.caseService.findOne(id, req.user);
  }
}