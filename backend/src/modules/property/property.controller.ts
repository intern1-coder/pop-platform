import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PropertyService } from './property.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @Roles('Admin', 'PropertyManager')
  create(@Body() dto: any, @Request() req) {
    return this.propertyService.create(dto, req.user.id, req.user.orgId);
  }

  @Get()
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findAll(@Request() req) {
    return this.propertyService.findAll(req.user);
  }

  @Get(':id')
  @Roles('Admin', 'PropertyManager', 'Tenant')
  findOne(@Param('id') id: string, @Request() req) {
    return this.propertyService.findOne(id, req.user);
  }
}