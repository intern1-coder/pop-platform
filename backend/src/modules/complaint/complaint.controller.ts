import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  create(@Body() dto: any, @Request() req) {
    return this.complaintService.create(dto, req.user.id, req.user.orgId);
  }

  @Get()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findAll(@Request() req, @Query() query: any) {
    return this.complaintService.findAll(req.user, query);
  }

  @Get(':id')
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findOne(@Param('id') id: string, @Request() req) {
    return this.complaintService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles('Admin', 'PropertyManager')
  update(@Param('id') id: string, @Body() dto: any, @Request() req) {
    return this.complaintService.update(id, dto, req.user.id);
  }

  @Put(':id/status')
  @Roles('Admin', 'PropertyManager')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req) {
    return this.complaintService.updateStatus(id, status, req.user.id);
  }
}