import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/communications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager', 'Tenant')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  @Post()
  async create(@Param('complaintId') complaintId: string, @Body() data: any, @Request() req) {
    return this.communicationService.create(complaintId, data, req.user.id);
  }

  @Get()
  async findAll(@Param('complaintId') complaintId: string, @Request() req) {
    return this.communicationService.findAll(complaintId);
  }

  @Put(':communicationId')
  async update(
    @Param('complaintId') complaintId: string,
    @Param('communicationId') communicationId: string,
    @Body() data: any,
    @Request() req,
  ) {
    return this.communicationService.update(complaintId, communicationId, data, req.user.id);
  }
}