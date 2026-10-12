/** Hours per day, e.g. 1.5 -> "1.5h". */
export const formatHours = (h) => `${Math.round(h * 100) / 100}h`;

/** Local time of a timestamp, e.g. "9:05 AM"; empty when missing. */
export const formatClock = (ts) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

/** Big bold number input used for weekly targets / numbers. */
export const BIG_NUMBER_INPUT_CLASS =
  'focus-ring w-full rounded-lg border-2 border-line bg-surface px-2 py-1 text-xl font-extrabold tabular-nums text-ink outline-none focus:border-accent';
