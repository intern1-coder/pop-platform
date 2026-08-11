// Court pack readiness checklist (ASB parity with Omnia ASB app).
// A case is "court ready" when every checklist item passes.

export interface CourtChecklistItem {
  key: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface ComplaintForChecklist {
  severity?: string;
  category?: string;
  riskFactors?: string | null;
  noticeServedDate?: Date | string | null;
}

const SERIOUS_CLAUSE_CODES = ['3.6.7', '3.6.8', '3.6.9', '3.6.10'];
const SERIOUS_RISK_FACTORS = ['threats_violence', 'hate_crime', 'police_involved'];

// Incident threshold by severity — Critical/High are meant to move fast so the
// bar is lower; never drops to zero (one contemporaneous record still counts).
const INCIDENT_THRESHOLD: Record<string, number> = { critical: 1, high: 1, medium: 2, low: 3 };

export function requiresPoliceReference(complaint: ComplaintForChecklist): boolean {
  const clauseMatch = (complaint.category || '').match(/Clause\s+([\d.]+)/);
  if (clauseMatch && SERIOUS_CLAUSE_CODES.includes(clauseMatch[1])) return true;
  const factors = (complaint.riskFactors || '').split(',').map((f) => f.trim());
  return factors.some((f) => SERIOUS_RISK_FACTORS.includes(f));
}

export interface CourtPackInput {
  complaint: ComplaintForChecklist;
  incidents: unknown[];
  letters: Array<{ letterType: string; sentDate?: Date | string | null }>;
  evidence: unknown[];
  external: unknown[];
  witnesses: unknown[];
}

export function buildCourtChecklist(input: CourtPackInput): {
  checklist: CourtChecklistItem[];
  courtReady: boolean;
} {
  const { complaint, incidents, letters, evidence, external, witnesses } = input;
  const sev = (complaint.severity || 'low').toLowerCase();
  const requiredIncidents = INCIDENT_THRESHOLD[sev] ?? 3;

  const hasFirst = letters.some((l) => l.letterType === 'first_warning');
  const hasFinalSent = letters.some(
    (l) => l.letterType === 'final_warning' && !!l.sentDate,
  );
  const hasNsp = letters.some((l) => l.letterType === 'notice_seeking_possession');
  const policeRequired = requiresPoliceReference(complaint);

  const checklist: CourtChecklistItem[] = [
    {
      key: 'has_incidents',
      label: `At least ${requiredIncidents} recorded incident${requiredIncidents !== 1 ? 's' : ''}`,
      pass: incidents.length >= requiredIncidents,
      detail: `${incidents.length} incident(s) recorded`,
    },
    {
      key: 'has_first_warning',
      label: 'First Warning letter generated',
      pass: hasFirst,
      detail: hasFirst ? 'Letter found' : 'No first warning letter',
    },
    {
      key: 'has_final_warning',
      label: 'Final Warning letter generated and sent',
      pass: hasFinalSent,
      detail: hasFinalSent ? 'Sent' : 'Not sent or missing',
    },
    {
      key: 'has_nsp',
      label: 'Notice Seeking Possession generated',
      pass: hasNsp,
      detail: hasNsp ? 'NSP found' : 'NSP not generated',
    },
    {
      key: 'has_evidence',
      label: 'Evidence attached',
      pass: evidence.length > 0,
      detail: `${evidence.length} evidence item(s)`,
    },
    {
      key: 'has_police_ref',
      label: 'Police / external body reference logged',
      pass: !policeRequired || external.length > 0,
      detail:
        external.length > 0
          ? `${external.length} reference(s)`
          : policeRequired
            ? 'Required for this case type — none logged'
            : 'Not required for this case type',
    },
    {
      key: 'has_witness',
      label: 'At least one witness statement',
      pass: witnesses.length > 0,
      detail: `${witnesses.length} witness(es)`,
    },
    {
      key: 'notice_served',
      label: 'Section 8 notice served date recorded',
      pass: !!complaint.noticeServedDate,
      detail: complaint.noticeServedDate
        ? `Served: ${new Date(complaint.noticeServedDate).toISOString().slice(0, 10)}`
        : 'Not recorded',
    },
  ];

  const courtReady = checklist.every((c) => c.pass);
  return { checklist, courtReady };
}
