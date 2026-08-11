import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('complaints/:complaintId/escalation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Post()
  @Roles('Admin', 'PropertyManager')
  escalate(@Param('complaintId') complaintId: string, @Request() req) {
    return this.escalationService.escalate(complaintId, req.user.id);
  }
}
