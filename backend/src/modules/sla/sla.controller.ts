import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { SlaService } from './sla.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('sla')
export class SlaController {
  constructor(private readonly sla: SlaService) {}

  // Manual trigger for the daily SLA + monitoring expiry run (admins only).
  @Post('run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async run() {
    await this.sla.runSlaEscalation();
    return { ok: true };
  }
}
