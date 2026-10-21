import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Xt as weekStart, ft as addDays } from '@/internal/min';
import { latestWorkday, stepWorkdays, formatWeekRange, furthestDate } from './dateHelpers';
import { DayMarker } from './DateMenu';

/** Day picker: the calendar input accepts any date (weekends, holidays, past, up to 60 days ahead); the arrows step workdays. */
export function DatePicker({ date, onChange, mode = 'day', personId }) {
  const max = mode === 'day' ? furthestDate() : latestWorkday();
  const monday = weekStart(date);
  const nextDisabled = mode === 'day' ? date >= max : monday >= weekStart(max);
  const step = (dir) =>
    onChange(
      mode === 'day'
        ? stepWorkdays(date, dir)
        : (() => {
            const next = addDays(monday, dir * 7);
            return next > max ? max : next;
          })(),
    );
  const btn = 'focus-ring rounded-lg p-1.5 hover:bg-surface-2 disabled:opacity-30';
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <button aria-label={mode === 'day' ? 'Previous day' : 'Previous week'} className={btn} onClick={() => step(-1)}>
        <ChevronLeft size={16} />
      </button>
      {mode === 'day' ? (
        <label className="flex items-center gap-2 px-1 text-sm font-semibold">
          <CalendarDays size={15} />
          <input
            aria-label="Date"
            type="date"
            className="bg-transparent text-ink outline-none"
            value={date}
            max={max}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              onChange(v > max ? max : v);
            }}
          />
          {personId && <DayMarker personId={personId} date={date} />}
        </label>
      ) : (
        <span className="flex items-center gap-2 px-2 text-sm font-semibold" data-testid="week-label">
          <CalendarDays size={15} />
          {formatWeekRange(monday)}
        </span>
      )}
      <button aria-label={mode === 'day' ? 'Next day' : 'Next week'} disabled={nextDisabled} className={btn} onClick={() => step(1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default DatePicker;
