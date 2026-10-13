// Deadline alerts. A task is due by the end of its working day (WORK_END_HOUR, default 19:00 in WORK_TZ, default India time).
// The sweep is pure, so it can be tested: given the open tasks and what was already sent, it says which alerts to send now.

export const OPEN = ['todo', 'in_progress', 'changes'];
const pad = (n) => String(n).padStart(2, '0');

/** Wall-clock "now" in a time zone, as { date: 'yyyy-MM-dd', minutes } (minutes since midnight there). */
export function wallClock(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const dayNumber = (date) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);

/** Minutes until a task's deadline (negative once past). */
export function minutesLeft(task, now, endHour = 19) {
  return (dayNumber(task.date) - dayNumber(now.date)) * 1440 + endHour * 60 - now.minutes;
}

/** Alerts to send now: [{ taskId, level, to, text, alsoTell? }]. `sent` maps "taskId|level" to a time and is updated by the caller. */
export function dueAlerts({ tasks, nowMs, tz = 'Asia/Kolkata', endHour = 19, sent = {}, nameOf = () => 'Someone' }) {
  const now = wallClock(nowMs, tz);
  const out = [];
  for (const t of tasks) {
    if (!OPEN.includes(t.status) || !t.date || !t.assigneeId) continue;
    const left = minutesLeft(t, now, endHour);
    const title = t.title || 'your task';
    const add = (level, text, alsoTell) => { if (!sent[`${t.id}|${level}`]) out.push({ taskId: t.id, level, to: t.assigneeId, text, alsoTell }); };
    if (left > 15 && left <= 60) add('h1', `⏰ ${left >= 50 ? 'About an hour' : `${left} minutes`} left to finish “${title}”`);
    else if (left > 0 && left <= 15) add('m15', `🏃 Only ${left} minute${left === 1 ? '' : 's'} left for “${title}”!`);
    else if (left <= 0 && left > -1440) add('over', `😬 “${title}” has passed its deadline`, t.assignedById && t.assignedById !== t.assigneeId ? { to: t.assignedById, text: `🐢 ${nameOf(t.assigneeId)}'s task “${title}” is past its deadline` } : undefined);
    else if (left <= -1440 && now.minutes >= 600 && left > -4320) add(`late-${now.date}`, `🐌 “${title}” is still waiting for you`);
  }
  return out;
}

// ---- project weeks and months -------------------------------------------------------------------------------------------------
// A project keeps this week's and this month's numbers; when a new week or month begins they move into the history (pastWeeks /
// pastMonths) and start again from zero. The server does this, so it happens once, for everybody, and is saved.

export const mondayOf = (date) => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

/** The project's data with the week and month rolled over for `today` (yyyy-mm-dd), or the same object when nothing changed. */
export function rollProject(p, today) {
  const thisWeek = mondayOf(today);
  const thisMonth = today.slice(0, 7);
  let out = p;
  if (!out.weekOf) out = { ...out, weekOf: thisWeek };
  else if (out.weekOf !== thisWeek) out = { ...out, pastWeeks: [{ start: out.weekOf, counts: out.week || {} }, ...(out.pastWeeks || []).filter((w) => w.start !== out.weekOf)], week: {}, weekOf: thisWeek };
  if (!out.monthOf) out = { ...out, monthOf: thisMonth };
  else if (out.monthOf !== thisMonth) out = { ...out, pastMonths: [{ month: out.monthOf, counts: out.month || {} }, ...(out.pastMonths || []).filter((m) => m.month !== out.monthOf)], month: {}, monthOf: thisMonth };
  return out;
}
