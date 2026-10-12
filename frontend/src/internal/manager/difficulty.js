import { Qd as DIFFICULTY_TONES } from '@/internal/min';

/** Difficulty buckets shown in the assignment difficulty bars. (bundle: yb) */
export const DIFFICULTY_BANDS = [
  { key: 'challenging', label: 'challenging', bar: 'bg-coral-strong' },
  { key: 'standard', label: 'standard', bar: 'bg-sky-strong' },
  { key: 'easy', label: 'easy', bar: 'bg-butter-strong' },
];

/** Badge tone and text summarising how an assigner sets targets. (bundle: WU) */
export function difficultyBadge(mix) {
  return mix.pct.challenging >= 25 && mix.pct.challenging >= mix.pct.easy * 2
    ? { tone: DIFFICULTY_TONES.challenging, text: 'Sets tight targets' }
    : mix.pct.easy >= 25 && mix.pct.easy >= mix.pct.challenging * 2
      ? { tone: DIFFICULTY_TONES.easy, text: 'Sets easy targets' }
      : { tone: DIFFICULTY_TONES.standard, text: 'Mostly standard' };
}
