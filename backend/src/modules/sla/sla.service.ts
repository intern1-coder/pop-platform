import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifyService } from '../notify/notify.service';
import { MonitoringService } from '../monitoring/monitoring.service';

const VISIT_WINDOWS: Record<string, number> = { critical: 0, high: 3, medium: 5, low: 7 };

function addWorkingDaysUTC(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  if (days === 0) {
    d.setHours(23, 59, 59, 999);
    return d;
  }
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}
function nextCalendarDay(from: Date): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
function nextWorkingDay(from: Date): Date {
  const d = new Date(from.getTime());
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d;
}

@Injectable()
export class SlaService implements OnModuleInit {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
    private monitoring: MonitoringService,
  ) {}

  onModuleInit() {
    this.logger.log('SLA scheduler initialised (daily 02:00 UTC)');
  }

  // Daily cron: enforce SLA windows, escalate overdue cases, and auto-expire
  // Monitoring past its 30-day window. Each step is recorded as a real audit
  // entry regardless of whether the (optional) email actually sends.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runSlaEscalation() {
    this.logger.log('Running SLA / monitoring cron...');
    try {
      await this.monitoring.expirePastDue();
    } catch (e) {
      this.logger.error('Monitoring expiry cron error', e as Error);
    }

    const bmEmailMap: Record<string, string> = (() => {
      try {
        return JSON.parse(process.env.BM_EMAIL_MAP || '{}');
      } catch {
        return {};
      }
    })();
    const opsEmails = (process.env.OPS_ALERT_EMAILS || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    let openCases: any[];
    try {
      openCases = await this.prisma.complaint.findMany({
        where: { status: { not: 'Closed' } },
        select: {
          id: true,
          severity: true,
          createdAt: true,
          branch: true,
          assignedTo: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    } catch (e) {
      this.logger.error('Failed loading open cases', e as Error);
      return;
    }

    for (const c of openCases) {
      try {
        const sev = (c.severity || 'Low').toLowerCase();
        const windowDays = VISIT_WINDOWS[sev] ?? 7;
        const created = new Date(c.createdAt);
        if (isNaN(created.getTime())) continue;
        const windowCloseAt = addWorkingDaysUTC(created, windowDays);
        const now = new Date();
        if (now < windowCloseAt) continue; // still within SLA window

        const [incidentCount, evidenceCount] = await Promise.all([
          this.prisma.complaintIncident.count({ where: { complaintId: c.id } }),
          this.prisma.complaintEvidence.count({ where: { complaintId: c.id } }),
        ]);
        if (incidentCount > 0 || evidenceCount > 0) continue; // real casework — no nag

        const pastAlerts = await this.prisma.complaintAudit.findMany({
          where: { complaintId: c.id, action: { in: ['pm_bm_reminder', 'ops_escalation'] } },
          select: { action: true },
        });
        const sent = new Set(pastAlerts.map((a) => a.action));

        const ref = c.id;
        const caseBlurb = `Case: ${ref}\nSeverity: ${sev.toUpperCase()}\nBranch: ${c.branch || 'unknown'}\nAssigned to: ${c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : 'unassigned'}`;

        if (!sent.has('pm_bm_reminder')) {
          const pmEmail = c.assignedTo?.email;
          const bmEmails = (bmEmailMap[c.branch || ''] || '')
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean);
          const recipients = [...(pmEmail ? [pmEmail] : []), ...bmEmails];
          for (const to of recipients) {
            await this.notify.sendEmail({
              to,
              subject: `[SLA REMINDER] Case ${ref} — no action logged yet`,
              bodyText: `No incident or evidence has been logged on this case by the end of its SLA window.\n\n${caseBlurb}`,
            });
          }
          await this.prisma.complaintAudit.create({
            data: {
              complaintId: c.id,
              action: 'pm_bm_reminder',
              details: `No incident or evidence logged by the end of the SLA window — reminder sent to PM (${c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : 'unassigned'}) and the branch's Branch Manager.`,
              userId: 'system',
            },
          });
          // Give the reminder its own cycle before considering escalation.
          continue;
        }

        if (sev !== 'critical' && sev !== 'high') continue; // Medium/Low — dashboard only
        if (sent.has('ops_escalation')) continue;

        const escalateAfter = sev === 'critical' ? nextCalendarDay(windowCloseAt) : nextWorkingDay(windowCloseAt);
        if (now < escalateAfter) continue;

        for (const to of opsEmails) {
          await this.notify.sendEmail({
            to,
            subject: `[ESCALATION] Case ${ref} — ${sev.toUpperCase()} severity, still unaddressed`,
            bodyText: `Still no incident or evidence logged since the PM/BM reminder.\n\n${caseBlurb}`,
          });
        }
        await this.prisma.complaintAudit.create({
          data: {
            complaintId: c.id,
            action: 'ops_escalation',
            details: 'Still no incident or evidence logged since the PM/BM reminder — escalated to Ops Head.',
            userId: 'system',
          },
        });
      } catch (e) {
        this.logger.error(`SLA processing error for case ${c.id}`, e as Error);
      }
    }
    this.logger.log('SLA / monitoring cron complete.');
  }
}
