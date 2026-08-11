import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExternalService } from './external.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/external')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin', 'PropertyManager')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}

  @Get()
  findAll(@Param('complaintId') complaintId: string) {
    return this.externalService.findAll(complaintId);
  }

  @Post()
  create(@Param('complaintId') complaintId: string, @Body() dto: any, @Request() req) {
    return this.externalService.create(complaintId, dto, req.user.id);
  }

  @Delete(':externalId')
  remove(
    @Param('complaintId') complaintId: string,
    @Param('externalId') externalId: string,
    @Request() req,
  ) {
    return this.externalService.remove(complaintId, externalId, req.user.id);
  }
}
