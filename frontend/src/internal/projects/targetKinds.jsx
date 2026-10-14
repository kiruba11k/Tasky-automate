import React from 'react';
import { Hash, SquareCheckBig, FileText } from 'lucide-react';
import { oe as clsx } from '@/internal/min';

/** Input class shared by the target tables. */
export const TABLE_INPUT_CLASS =
  'focus-ring w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink';

/** The three kinds of target a week / month can hold. */
export const TARGET_KINDS = [
  { id: 'number', label: 'Number', icon: Hash, tone: 'bg-sky/60 text-sky-ink' },
  { id: 'milestone', label: 'Milestone', icon: SquareCheckBig, tone: 'bg-mint/60 text-mint-ink' },
  { id: 'text', label: 'Text', icon: FileText, tone: 'bg-lavender/60 text-lavender-ink' },
];

export const MILESTONE_STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked'];

/** Kind of a custom target row (older rows have none and are plain text). */
export const targetKind = (row) => row.kind ?? 'text';

/** Sorted custom weeks of a project. */
export const sortedWeeks = (p) => [...(p.customWeeks ?? [])].sort((a, b) => a.start.localeCompare(b.start));

/** Fresh id for a custom target row. */
export const newTargetId = (n) => `tt${Date.now().toString(36)}${n}${Math.random().toString(36).slice(2, 5)}`;

/** Small coloured pill naming a target kind. */
export function KindBadge({ kind }) {
  const k = TARGET_KINDS.find((x) => x.id === kind);
  const Icon = k.icon;
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', k.tone)}
    >
      <Icon size={11} />
      {k.label}
    </span>
  );
}
