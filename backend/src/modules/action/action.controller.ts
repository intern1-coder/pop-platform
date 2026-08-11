import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ActionService } from './action.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/actions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager', 'Tenant')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Post()
  create(@Param('complaintId') complaintId: string, @Body() data: any, @Request() req) {
    return this.actionService.create(complaintId, data, req.user.id);
  }

  @Get()
  findAll(@Param('complaintId') complaintId: string) {
    return this.actionService.findAll(complaintId);
  }

  @Put(':actionId')
  update(@Param('complaintId') complaintId: string, @Param('actionId') actionId: string, @Body() data: any) {
    return this.actionService.update(complaintId, actionId, data);
  }
}
