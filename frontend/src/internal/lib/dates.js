// Date / time helpers. All "date keys" are local-time "YYYY-MM-DD" strings;
// weeks run Monday to Sunday and are keyed by their Monday; months by "YYYY-MM".

/** `$w` */
export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `YV` */
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `XV` */
export const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** `KV` - labels for period granularities. */
export const GRANULARITY_LABELS = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

/** `ri` - the fixed daily lunch break (1pm to 2pm); no work blocks may overlap. */
export const LUNCH_BLOCK = { start: "13:00", end: "14:00" };

/** The lunch break for a person's day: the one they set for that day, else the latest one they set before it, else 1pm to 2pm. */
export function lunchFor(daily, personId, date, profiles) {
  if (profiles?.[personId]?.lunch) return profiles[personId].lunch; // a lunch set on the profile applies to every day
  const own = daily[`${personId}|${date}`]?.lunch;
  if (own) return own;
  let best = null;
  for (const [key, rec] of Object.entries(daily)) {
    if (!rec?.lunch || !key.startsWith(`${personId}|`)) continue;
    const day = key.slice(personId.length + 1);
    if (day < date && (!best || day > best.day)) best = { day, lunch: rec.lunch };
  }
  return best ? best.lunch : LUNCH_BLOCK;
}

/** "1pm" / "1:30pm" for an HH:MM time. */
export function clockLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
}

/** `dR` / `Iw` - Date -> "YYYY-MM-DD" (local). */
export function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** `Xa` - "YYYY-MM-DD" -> local Date at midnight. */
export function parseDateKey(key) {
  return new Date(key + "T00:00:00");
}

/** `$e` - date key for today plus `offsetDays`. */
export function todayKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateKey(d);
}

/** `ft` - date key plus N days. */
export function addDays(key, days) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** `Wr` - true for Monday to Friday. */
export function isWeekday(key) {
  const day = parseDateKey(key).getDay();
  return day !== 0 && day !== 6;
}

/** `ia` - the weekday strictly before `key` (default today). */
export function previousWeekday(key = todayKey(0)) {
  let d = addDays(key, -1);
  while (!isWeekday(d)) d = addDays(d, -1);
  return d;
}

/** `gV` - the weekday strictly after `key` (default today). */
export function nextWeekday(key = todayKey(0)) {
  let d = addDays(key, 1);
  while (!isWeekday(d)) d = addDays(d, 1);
  return d;
}

/** `Xt` - Monday of the week containing `key`. */
export function weekStart(key) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateKey(d);
}

/** `Mt` - Monday of the current week shifted by `weeks` (0 = this week). */
export function currentWeekStart(weeks = 0) {
  return addDays(weekStart(todayKey(0)), weeks * 7);
}

/** `yt` - "5 Mar" style label. */
export function formatDayMonth(key) {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

/** `fR` - the `count` weekdays before `from` (default today), nearest first. */
export function lastWeekdays(count, from = todayKey(0)) {
  const out = [];
  let d = from;
  while (out.length < count) {
    d = previousWeekday(d);
    out.push(d);
  }
  return out;
}

/** `$g` - every weekday from `from` to `to` inclusive. */
export function weekdaysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) if (isWeekday(d)) out.push(d);
  return out;
}

/** `yV` - minutes since midnight -> "HH:MM". */
export const minutesToClock = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(Math.round(minutes % 60)).padStart(2, "0")}`;

/** `Mn` - "HH:MM" -> minutes since midnight. */
export const clockToMinutes = (clock) => {
  const [h, m] = clock.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** `ni` - ISO timestamp for a date key at `minutes` since midnight (capped 23:59). */
export function dateTimeIso(key, minutes) {
  return new Date(`${key}T${minutesToClock(Math.min(minutes, 1439))}:00`).toISOString();
}

/** `xr` / `NV` - current time as ISO string. */
export const nowIso = () => new Date().toISOString();

/** `GV` - last day of a "YYYY-MM" month as a date key. */
export const monthEndKey = (month) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0);
  return `${month}-${String(last.getDate()).padStart(2, "0")}`;
};

/**
 * `Ko` - build a reporting period.
 * @param {"day"|"week"|"month"} gran
 * @param {string} key any date key (or "YYYY-MM" for months)
 * @returns {{gran,key,label,title,from,to,partial}}
 */
export function buildPeriod(gran, key) {
  const today = todayKey(0);
  if (gran === "day") {
    return {
      gran,
      key,
      label: formatDayMonth(key),
      title: `${WEEKDAY_SHORT[parseDateKey(key).getDay()]} ${formatDayMonth(key)}`,
      from: key,
      to: key,
      partial: key === today,
    };
  }
  if (gran === "week") {
    const start = weekStart(key);
    const end = addDays(start, 6);
    return {
      gran,
      key: start,
      label: formatDayMonth(start),
      title: `${formatDayMonth(start)} to ${formatDayMonth(addDays(start, 4))}`,
      from: start,
      to: end,
      partial: start <= today && today <= end,
    };
  }
  const month = key.slice(0, 7);
  const [year, monthNo] = month.split("-").map(Number);
  const end = monthEndKey(month);
  return {
    gran,
    key: month,
    label: MONTH_SHORT[monthNo - 1],
    title: `${MONTH_LONG[monthNo - 1]} ${year}`,
    from: `${month}-01`,
    to: end,
    partial: `${month}-01` <= today && today <= end,
  };
}

/** `$s` - move a period by `steps` (days skip weekends). */
export function shiftPeriod(period, steps) {
  if (!steps) return period;
  if (period.gran === "day") {
    let d = period.key;
    for (let i = 0; i < Math.abs(steps); i++) {
      do d = addDays(d, Math.sign(steps));
      while (!isWeekday(d));
    }
    return buildPeriod("day", d);
  }
  if (period.gran === "week") return buildPeriod("week", addDays(period.key, steps * 7));
  const [y, m] = period.key.split("-").map(Number);
  const shifted = new Date(y, m - 1 + steps, 1);
  return buildPeriod(
    "month",
    `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`,
  );
}

/** `hf` - the current period of a granularity (day falls back to last weekday). */
export function currentPeriod(gran) {
  const today = todayKey(0);
  return buildPeriod(gran, gran === "day" && !isWeekday(today) ? previousWeekday(today) : today);
}

/** `QV` - "current" | "previous" | explicit key -> period. */
export function resolvePeriod(gran, which = "current") {
  return which === "current"
    ? currentPeriod(gran)
    : which === "previous"
      ? shiftPeriod(currentPeriod(gran), -1)
      : buildPeriod(gran, which);
}

/** `qw` - the last `count` periods ending at `end` (default current), oldest first. */
export function recentPeriods(gran, count, end) {
  const last = end
    ? buildPeriod(gran, gran === "day" && !isWeekday(end) ? previousWeekday(end) : end)
    : currentPeriod(gran);
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => shiftPeriod(last, i - (n - 1)));
}
