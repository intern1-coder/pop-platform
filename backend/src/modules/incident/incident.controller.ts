import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  create(
    @Param('complaintId') complaintId: string,
    @Body() dto: any,
    @Request() req,
  ) {
    return this.incidentService.create(complaintId, dto, req.user.id);
  }

  @Get()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findAll(@Param('complaintId') complaintId: string) {
    return this.incidentService.findAll(complaintId);
  }

  @Get(':incidentId')
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findOne(
    @Param('complaintId') complaintId: string,
    @Param('incidentId') incidentId: string,
  ) {
    return this.incidentService.findOne(complaintId, incidentId);
  }
}