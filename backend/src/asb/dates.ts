// Calendar/date arithmetic + SLA visit windows (ASB parity).

// Section 8 notice periods by ground: Ground 12 (tenancy breach) = 14 days,
// Ground 14 (ASB/nuisance) = immediate (0 days).
export const NOTICE_GROUND_DAYS: Record<string, number> = { '12': 14, '14': 0 };

export function addCalendarDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatLongDateUK(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Visit SLA windows per severity (working days).
export const VISIT_WINDOWS: Record<string, number> = {
  critical: 0,
  high: 3,
  medium: 5,
  low: 7,
};

export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  if (days === 0) {
    d.setHours(23, 59, 59, 999);
    return d;
  }
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export interface VisitSlaInfo {
  pct: number;
  rag: 'red' | 'amber' | 'green';
  overdue: boolean;
  dueStr: string;
  windowDays: number;
  managedBy: string;
  due: Date;
}

export function visitSlaInfo(severity: string, createdAt: Date): VisitSlaInfo {
  const sev = (severity || 'low').toLowerCase();
  const windowDays = VISIT_WINDOWS[sev] ?? 7;
  const created = new Date(createdAt);
  const due = addWorkingDays(created, windowDays);
  const now = new Date();
  const totalMs = due.getTime() - created.getTime();
  const elapsedMs = now.getTime() - created.getTime();
  const pct = totalMs <= 0 ? 100 : Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  const overdue = now > due;
  const rag: VisitSlaInfo['rag'] = overdue ? 'red' : pct >= 90 ? 'red' : pct >= 50 ? 'amber' : 'green';
  const dueStr = due.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const managedBy = sev === 'critical' ? 'Head of Operations' : 'Property Manager';
  return { pct: overdue ? 100 : pct, rag, overdue, dueStr, windowDays, managedBy, due };
}
