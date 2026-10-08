import { addDays } from './weekly.js';

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WD_ABBR = { mon: 0, tue: 1, tues: 1, wed: 2, thu: 3, thur: 3, thurs: 3, fri: 4, sat: 5, sun: 6 };
const isoOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

/** Maps a spoken name to a user: exact full name, else unique first-name / prefix match. */
export function matchUser(name, users) {
  const n = norm(name).replace(/[.,]/g, '');
  if (!n) return { error: 'empty name' };
  const first = (u) => norm(u.full_name).split(' ')[0];
  const exact = users.filter((u) => norm(u.full_name) === n);
  if (exact.length === 1) return { user: exact[0] };
  const loose = users.filter((u) => first(u) === n || norm(u.full_name).startsWith(n) || n.startsWith(first(u)));
  if (loose.length === 1) return { user: loose[0] };
  return { error: loose.length > 1 ? `"${name}" matches more than one person` : `"${name}" is not a team member` };
}

/** Turns "monday", "tomorrow", "2026-10-14" … into an ISO date. Weekday names resolve inside `weekDates` (Mon..Sun) when given. */
export function resolveDay(text, { today, weekDates }) {
  const t = norm(text);
  if (!t) return null;
  if (isoOk(t)) return t;
  if (t === 'today') return today;
  if (t === 'tomorrow') return addDays(today, 1);
  if (t === 'yesterday') return addDays(today, -1);
  const idx = WEEKDAYS.indexOf(t) >= 0 ? WEEKDAYS.indexOf(t) : WD_ABBR[t.replace(/\.$/, '')];
  if (idx === undefined) return null;
  if (weekDates) return weekDates[idx];
  // Daily mode: the next occurrence of that weekday, including today.
  const todayIdx = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(today, (idx - todayIdx + 7) % 7);
}

/** Rule-based fallback used when no LLM is configured. Handles the common phrasing; the LLM path is far more flexible. */
export function heuristicParse({ transcript, users, projects, mode }) {
  const active = users.filter((u) => u.status !== 'Inactive');
  const segments = String(transcript)
    .split(/\n+|(?<=[.!?;])\s+|\s+(?:and then|then|next task|next|also|another task|second task|third task)\b[,:]?\s+/i)
    .map((s) => s.trim()).filter(Boolean);
  const items = [];

  for (let seg of segments) {
    const filler = /^(?:okay|ok|um+|uh+|er+|hmm+|so|then|and then|next|also|and|please|now|add|create|new task|task|assign|give|schedule)\b[:,]?\s*/i;
    while (filler.test(seg)) seg = seg.replace(filler, '');
    seg = seg.replace(/[.!?]+$/, '').trim();
    if (!seg) continue;
    const item = { title: '', project_name: '', expected_result: '', estimated_hours: null, assignees: [], days: [], priority: 'Medium' };

    const hours = seg.match(/(?:\b(?:takes?|taking|for|estimated?|estimate|about|around)\s+)?(?:(\d+(?:\.\d+)?)|half an?)\s*(?:hours?|hrs?|h)\b/i);
    if (hours) { item.estimated_hours = hours[1] ? Number(hours[1]) : 0.5; seg = seg.replace(hours[0], ' '); }

    const target = seg.match(/[,;]?\s*(?:the\s+)?(?:target|expected (?:result|outcome)|goal|aim)\s*(?:is|of|being)?\s*[:,]?\s*(.+)$/i);
    if (target) { item.expected_result = target[1].trim().replace(/[\s,;.]+$/, ''); seg = seg.slice(0, target.index).trim(); }

    if (/\b(?:critical|urgent)\b/i.test(seg)) item.priority = 'Critical';
    else if (/\bhigh priority\b/i.test(seg)) item.priority = 'High';
    else if (/\blow priority\b/i.test(seg)) item.priority = 'Low';
    seg = seg.replace(/\b(?:critical|urgent|(?:high|low|medium) priority)\b/gi, ' ');

    for (const d of seg.matchAll(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/gi)) item.days.push(d[1].toLowerCase());
    seg = seg.replace(/\b(?:on |by |for |every )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)\b/gi, ' ');

    for (const p of projects) {
      const re = new RegExp(`\\b(?:for |on |in |under )?(?:the )?${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: project)?\\b`, 'i');
      if (re.test(seg)) { item.project_name = p.name; seg = seg.replace(re, ' '); break; }
    }
    const typed = !item.project_name && seg.match(/\b(?:for|under|in) (?:the )?([A-Z][\w&-]*(?: [A-Z][\w&-]*)*) project\b/);
    if (typed) { item.project_name = typed[1]; seg = seg.replace(typed[0], ' '); }

    if (/\b(?:me|myself|i will|i'll|i am going to|i'm going to)\b/i.test(seg)) { item.assignees.push('__me__'); seg = seg.replace(/\b(?:assign(?:ed)?(?: this)?(?: to)?\s+)?(?:me|myself)\b/gi, ' ').replace(/\b(?:i will|i'll|i am going to|i'm going to)\b/gi, ' '); }
    for (const u of active) {
      const first = u.full_name.split(' ')[0];
      const re = new RegExp(`\\b(?:${u.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
      if (re.test(seg)) { item.assignees.push(u.full_name); seg = seg.replace(new RegExp(re.source, 'gi'), ' '); }
    }
    seg = seg.replace(/\b(?:assign(?:ed)?(?: this| it)?(?: to)?|to be done by|handled by|for)\b/gi, ' ').replace(/\s*,\s*(?=,|$)/g, ' ').replace(/\s+(?:and|&|,)\s*$/i, '').replace(/^\s*(?:(?:and|&|,|to|should|will|shall|must|can|needs? to|has to|have to)\s+)+/i, '').replace(/\s{2,}/g, ' ').trim();
    if (seg.length < 3) continue;
    item.title = seg.charAt(0).toUpperCase() + seg.slice(1);
    items.push(item);
  }
  return { tasks: items, mode };
}

const SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          project_name: { type: 'string' },
          expected_result: { type: 'string' },
          estimated_hours: { type: ['number', 'null'] },
          assignees: { type: 'array', items: { type: 'string' } },
          days: { type: 'array', items: { type: 'string' } },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
        },
        required: ['title'],
      },
    },
  },
  required: ['tasks'],
};

function buildPrompt({ transcript, mode, users, projects, today, weekStart, weekDates, me }) {
  return `You convert a dictated message into task records for a marketing team's task manager.

Today is ${today}. ${mode === 'weekly' ? `The plan is for the week starting Monday ${weekStart} (${weekDates.slice(0, 5).join(', ')} are Mon-Fri).` : ''}
The speaker is ${me.full_name}. When they say "me", "I" or "myself", use the assignee "__me__".

Team members (use these exact full names for assignees): ${users.map((u) => `${u.full_name} (${u.role.replace('_', ' ')})`).join('; ') || 'none'}
Existing projects: ${projects.map((p) => p.name).join('; ') || 'none'}

Rules:
- Create one task per distinct piece of work. Never invent work, people, numbers or projects that were not said.
- title: the work itself, short and imperative, without names, hours, days or targets in it.
- project_name: use an existing project name when it clearly matches (speech recognition may misspell it); otherwise the name as spoken; "" if none.
- expected_result: the target / expected outcome exactly as the speaker phrased it ("" if none). Keep numbers (e.g. "35% connection rate").
- estimated_hours: total hours for the task as a number, or null if not stated.
- assignees: team members named for the task (full names from the list, or "__me__"). A task given to several people lists them all. If a name is not in the list, still return it as spoken.
- days: ${mode === 'weekly' ? 'weekday names (monday..sunday) the work happens on, only if stated; [] means the whole working week' : 'the single day the task is for ("today", "tomorrow", a weekday name or yyyy-MM-dd); [] means today'}.
- priority: Low, Medium, High or Critical; Medium unless the speaker implies otherwise.
- Fix obvious speech-recognition mistakes in names using the team/project lists.

Transcript:
"""${String(transcript).slice(0, 6000)}"""`;
}

/**
 * Parses a transcript into structured, resolved items.
 * `llm` is optional ({ prompt, response_json_schema } -> object); without it the rule-based parser is used.
 */
export async function parseVoice({ transcript, mode, users, projects, me, today, weekStart, llm }) {
  const active = users.filter((u) => u.status !== 'Inactive');
  const weekDates = weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : null;
  const warnings = [];
  let raw;
  let usedLlm = false;

  if (llm) {
    try {
      raw = await llm({ prompt: buildPrompt({ transcript, mode, users: active, projects, today, weekStart, weekDates, me }), response_json_schema: SCHEMA });
      if (!Array.isArray(raw?.tasks)) throw new Error('unexpected LLM output');
      usedLlm = true;
    } catch (e) {
      console.error('voice LLM parse failed, using rules:', e.message);
      warnings.push('The AI parser was unavailable, so simpler rules were used. Please check each task carefully.');
    }
  }
  if (!raw) raw = heuristicParse({ transcript, users, projects, mode });

  const tasks = raw.tasks.filter((t) => String(t?.title || '').trim()).slice(0, 50).map((t) => {
    const assigneeIds = [];
    const unresolved = [];
    for (const name of t.assignees || []) {
      if (name === '__me__') { if (!assigneeIds.includes(me.id)) assigneeIds.push(me.id); continue; }
      const { user, error } = matchUser(name, active);
      if (error) unresolved.push(error);
      else if (!assigneeIds.includes(user.id)) assigneeIds.push(user.id);
    }
    const proj = projects.find((p) => norm(p.name) === norm(t.project_name));
    let days = null;
    if (Array.isArray(t.days) && t.days.length) {
      days = [...new Set(t.days.map((d) => resolveDay(d, { today, weekDates })).filter(Boolean))].sort();
      if (weekDates) days = days.filter((d) => weekDates.includes(d));
      if (!days.length) days = null;
    }
    const hours = t.estimated_hours === null || t.estimated_hours === undefined || t.estimated_hours === '' ? null : Number(t.estimated_hours);
    const item = {
      title: String(t.title).trim(),
      project_name: proj ? proj.name : String(t.project_name || '').trim(),
      project_id: proj?.id,
      expected_result: String(t.expected_result || '').trim(),
      estimated_hours: Number.isFinite(hours) && hours >= 0 ? hours : null,
      assignee_ids: assigneeIds,
      priority: ['Low', 'Medium', 'High', 'Critical'].includes(t.priority) ? t.priority : 'Medium',
      unresolved,
    };
    if (mode === 'weekly') item.days = days;
    else {
      item.date = days?.[0] || today;
      if (!item.assignee_ids.length && !unresolved.length) item.assignee_ids = [me.id];
    }
    return item;
  });

  for (const t of tasks) for (const u of t.unresolved) warnings.push(`"${t.title}": ${u}`);
  if (mode === 'weekly') for (const t of tasks) if (!t.assignee_ids.length) warnings.push(`"${t.title}": nobody assigned yet — pick people in the review.`);
  if (!tasks.length) warnings.push('No tasks were found in that text. Try naming the task, who does it and when.');
  return { tasks, warnings, used_llm: usedLlm };
}
