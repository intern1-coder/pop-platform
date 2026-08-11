// Risk factor weights + risk scoring (ASB parity with Omnia ASB app).
// Score = sum of selected factor weights. Level thresholds:
//   0-2 low, 3-4 medium, 5-7 high, 8+ critical.

export const RISK_FACTORS: Record<string, { label: string; weight: number }> = {
  vulnerable_tenant: { label: 'Vulnerable tenant', weight: 2 },
  threats_violence: { label: 'Threats / violence', weight: 5 },
  repeat_offender: { label: 'Repeat offender', weight: 2 },
  police_involved: { label: 'Police involved', weight: 2 },
  hate_crime: { label: 'Hate crime', weight: 3 },
  child_safeguarding: { label: 'Child safeguarding', weight: 3 },
};

export function riskFactorList(): Array<{ key: string; label: string; weight: number }> {
  return Object.entries(RISK_FACTORS).map(([key, v]) => ({ key, label: v.label, weight: v.weight }));
}

export function computeRiskScore(factors?: string | null): number {
  if (!factors) return 0;
  return factors
    .split(',')
    .reduce((sum, f) => sum + (RISK_FACTORS[f.trim()]?.weight || 0), 0);
}

export function riskLevelFromScore(score: number): string {
  const s = Number(score) || 0;
  if (s >= 8) return 'Critical';
  if (s >= 5) return 'High';
  if (s >= 3) return 'Medium';
  return 'Low';
}
