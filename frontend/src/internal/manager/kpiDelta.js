import { ZV as KPI_DIRECTION } from '@/internal/min';

/** Difference of two KPI values, one decimal. (bundle: tL) */
export const kpiDifference = (current, previous) =>
  current == null || previous == null ? null : Math.round((current - previous) * 10) / 10;

/** Text for a KPI delta. (bundle: dle) */
export function deltaText(kpi, delta) {
  if (delta == null) return '';
  if (delta === 0) return 'No change';
  const signed = `${delta > 0 ? '+' : '-'}${Math.abs(delta)}`;
  return kpi === 'onTime' ? `${signed} pts` : kpi === 'hours' || kpi === 'extra' ? `${signed}h` : signed;
}

/** Tone class for a KPI delta (good / bad / neutral). (bundle: fle) */
export function deltaTone(kpi, delta) {
  const score = (delta ?? 0) * KPI_DIRECTION[kpi];
  return score > 0 ? 'text-mint-ink' : score < 0 ? 'text-coral-ink' : 'text-muted';
}
