import { ri as LUNCH, Mn as toMinutes } from '@/internal/min';

/** Half-hour time slots from 10:00 to 19:00. */
export const TIME_SLOTS = Array.from(
  { length: 19 },
  (_, i) => `${String(10 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);

/** The lunch row shown between the planned blocks (the day's own lunch, 1pm to 2pm unless changed). */
export const lunchBlock = (lunch = LUNCH) => ({
  id: 'lunch',
  start: lunch.start,
  end: lunch.end,
  projectId: '',
  taskIds: [],
});

export const FIELD_CLASS = 'focus-ring rounded-xl border border-line bg-surface px-2 py-1 text-sm text-ink';

let blockCounter = 0;
/** Unique-enough counter used when generating ids for new blocks / extra entries. */
export const nextIdSuffix = () => ++blockCounter;

/** Planned minutes of a time block. */
export const blockMinutes = (block) => Math.max(0, toMinutes(block.end) - toMinutes(block.start));

/** Minutes between two HH:MM strings, or undefined when missing/not increasing. */
export const spanMinutes = (start, end) => (start && end && end > start ? toMinutes(end) - toMinutes(start) : undefined);

/** Drop extra-hours entries that are completely empty. */
export const nonEmptyExtras = (extras) => extras.filter((x) => x.work.trim() || x.minutes || x.start || x.end);

/** A submitted task that has logged minutes. */
export const isSubmittedWithTime = (task) =>
  (task.status === 'done' || task.status === 'in_review') && task.minutes != null;

/** The default lunch row (1pm to 2pm). */
export const LUNCH_BLOCK = lunchBlock();
