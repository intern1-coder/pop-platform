import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('request')
  @Roles('Admin', 'PropertyManager')
  request(@Param('complaintId') complaintId: string, @Body() data: any, @Request() req) {
    return this.monitoringService.request(complaintId, data, req.user.id);
  }

  @Post(':monitoringId/approve')
  @Roles('Admin', 'PropertyManager')
  approve(@Param('complaintId') complaintId: string, @Param('monitoringId') monitoringId: string, @Request() req) {
    return this.monitoringService.approve(complaintId, monitoringId, req.user.id);
  }

  @Post(':monitoringId/reject')
  @Roles('Admin', 'PropertyManager')
  reject(@Param('complaintId') complaintId: string, @Param('monitoringId') monitoringId: string, @Request() req) {
    return this.monitoringService.reject(complaintId, monitoringId, req.user.id);
  }

  @Get()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findAll(@Param('complaintId') complaintId: string) {
    return this.monitoringService.findAll(complaintId);
  }
}
