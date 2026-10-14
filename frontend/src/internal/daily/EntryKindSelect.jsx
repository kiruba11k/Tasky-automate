import { ChevronDown, FileText, Hash, SquareCheckBig } from 'lucide-react';
import { oe as cx } from '@/internal/min';

const KINDS = [
  { id: 'number', label: 'Number', icon: Hash, tone: 'bg-sky/60 text-sky-ink' },
  { id: 'milestone', label: 'Milestone', icon: SquareCheckBig, tone: 'bg-mint/60 text-mint-ink' },
  { id: 'text', label: 'Text', icon: FileText, tone: 'bg-lavender/60 text-lavender-ink' },
];

/** Picker for what kind of target a task row has: a number, a milestone (status) or free text. */
export function EntryKindSelect({ value, onChange, disabled }) {
  const kind = KINDS.find((k) => k.id === value) ?? KINDS[0];
  const Icon = kind.icon;
  return (
    <span
      className={cx(
        'relative flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1 pr-2',
        disabled && 'border-transparent bg-transparent',
      )}
    >
      <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-md', kind.tone)}>
        <Icon size={13} />
      </span>
      <span className="flex-1 text-sm">{kind.label}</span>
      {!disabled && <ChevronDown size={14} className="text-muted" />}
      {!disabled && (
        <select
          aria-label="Type"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

export default EntryKindSelect;
