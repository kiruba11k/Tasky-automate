import { motion } from 'framer-motion';
import { Lock, LockOpen, UtensilsCrossed } from 'lucide-react';
import { oe as cx, Se as useStore, Ye as toast, We as formatMinutes, Mn as toMinutes } from '@/internal/min';
import { LUNCH_LENGTHS, WORK_END, WORK_START, toClock } from './planBlocks';

/** The lunch break of the person's profile: start, length and a lock that keeps it from being moved. */
export function LunchRow({ personId, lunch, onChange }) {
  const setProfile = useStore((s) => s.setProfile);
  const length = toMinutes(lunch.end) - toMinutes(lunch.start);
  const apply = (next) => {
    setProfile(personId, { lunch: next });
    onChange(next);
  };
  const setStart = (value) => {
    if (!value) return;
    const start = toMinutes(value);
    if (start < WORK_START || start + length > WORK_END) {
      toast({ title: 'Lunch has to be between 10am and 7pm', tone: 'info' });
      return;
    }
    apply({ ...lunch, start: value, end: toClock(start + length) });
  };
  const selectClass =
    'focus-ring rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink disabled:opacity-70';
  return (
    <div
      className={cx(
        'flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
        lunch.locked ? 'border-mint-strong/50 bg-mint/30' : 'border-line bg-surface',
      )}
      aria-label="Lunch time"
    >
      <UtensilsCrossed size={15} className="text-muted" />
      <span className="font-semibold">Lunch</span>
      <input
        aria-label="Lunch start"
        type="time"
        step={900}
        disabled={lunch.locked}
        className={selectClass}
        value={lunch.start}
        onChange={(e) => setStart(e.target.value)}
      />
      <select
        aria-label="Lunch length"
        disabled={lunch.locked}
        className={selectClass}
        value={length}
        onChange={(e) => {
          const minutes = +e.target.value;
          const start = toMinutes(lunch.start);
          if (start + minutes <= WORK_END) apply({ ...lunch, end: toClock(start + minutes) });
        }}
      >
        {LUNCH_LENGTHS.map((m) => (
          <option key={m} value={m}>
            {formatMinutes(m)}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted">
        {lunch.start} to {lunch.end}
      </span>
      <motion.button
        whileTap={{ scale: 0.92 }}
        aria-pressed={!!lunch.locked}
        onClick={() => {
          apply({ ...lunch, locked: !lunch.locked });
          toast({ title: lunch.locked ? 'Lunch unlocked' : 'Lunch locked 🔒', tone: 'success' });
        }}
        className={cx(
          'focus-ring ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
          lunch.locked ? 'bg-mint-strong text-white' : 'border border-line text-ink hover:bg-surface-2',
        )}
      >
        {lunch.locked ? (
          <>
            <Lock size={12} /> Locked
          </>
        ) : (
          <>
            <LockOpen size={12} /> Lock lunch
          </>
        )}
      </motion.button>
    </div>
  );
}

export default LunchRow;
