// Water jar: each glass is its own entry, { date: { glassId: true } }, kept on the person's profile so it follows them to every device.
// A map (not a single number) means two devices adding glasses at the same moment both count, and "undo" removes only the latest glass.

export const GOAL = 8;
export const MAX_GLASSES = 16;
const KEEP_DAYS = 14;

export const countGlasses = (water, date) => Object.keys(water?.[date] || {}).length;

/** The saved water record with one more glass today (never above the daily maximum). Older days beyond two weeks are dropped. */
export function addGlass(water, date, id = `t${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`) {
  if (countGlasses(water, date) >= MAX_GLASSES) return prune(water, date);
  return prune({ ...water, [date]: { ...(water?.[date] || {}), [id]: true } }, date);
}

/** The record with the latest glass of the day removed. */
export function undoGlass(water, date) {
  const ids = Object.keys(water?.[date] || {}).sort();
  if (!ids.length) return water || {};
  const rest = { ...water[date] };
  delete rest[ids[ids.length - 1]];
  return { ...water, [date]: rest };
}

/** Brings in a count that used to be kept in one browser (glasses `old1`..`oldN`: bringing it in twice changes nothing). */
export function withLocalCount(water, date, n) {
  const have = countGlasses(water, date);
  if (!(n > have)) return water || {};
  const day = { ...(water?.[date] || {}) };
  for (let i = 1; i <= Math.min(n, MAX_GLASSES) && Object.keys(day).length < Math.min(n, MAX_GLASSES); i += 1) day[`old${i}`] = true;
  return { ...water, [date]: day };
}

function prune(water, date) {
  const cutoff = new Date(`${date}T00:00:00`); cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const min = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  return Object.fromEntries(Object.entries(water || {}).filter(([d]) => d >= min));
}
