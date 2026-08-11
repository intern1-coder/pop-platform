import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { WitnessService } from './witness.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/witnesses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager', 'Tenant')
export class WitnessController {
  constructor(private readonly witnessService: WitnessService) {}

  @Post()
  create(@Param('complaintId') complaintId: string, @Body() data: any) {
    return this.witnessService.create(complaintId, data, undefined);
  }

  @Get()
  findAll(@Param('complaintId') complaintId: string) {
    return this.witnessService.findAll(complaintId);
  }

  @Put(':witnessId')
  update(@Param('complaintId') complaintId: string, @Param('witnessId') witnessId: string, @Body() data: any) {
    return this.witnessService.update(complaintId, witnessId, data);
  }
}
