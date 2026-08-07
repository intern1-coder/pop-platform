import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private timelineService: TimelineService) {}

  @Get('recent')
  async getRecent(@Request() req) {
    return this.timelineService.getRecentTimeline(req.user.orgId, 10);
  }

  @Get('case/:caseId')
  async getCaseTimeline(@Param('caseId') caseId: string) {
    return this.timelineService.getTimelineForCase(caseId);
  }
}