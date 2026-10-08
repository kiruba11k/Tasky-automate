import Papa from 'papaparse';
import { mondayOf, sheetDateRange } from './week';

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

function columnMap(row) {
  const map = {};
  row.forEach((cell, i) => {
    const c = norm(cell);
    if (!c) return;
    if (c.includes('date')) map.dates ??= i;
    else if (c === 'project') map.project ??= i;
    else if (c === 'task' || c === 'tasks') map.task ??= i;
    else if (/target|expected/.test(c)) map.target ??= i;
    else if (/assigned/.test(c)) map.assigned ??= i;
    else if (/estimated|hrs|hours/.test(c)) map.hours ??= i;
  });
  return map;
}

function parseDmy(text) {
  const m = String(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return null;
  const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, Number(m[2]) - 1, Number(m[1]), 12);
  return Number.isNaN(d.getTime()) ? null : d;
}

function matchUser(name, users) {
  const n = norm(name);
  const first = (u) => norm(u.full_name).split(' ')[0];
  const exact = users.filter((u) => norm(u.full_name) === n);
  if (exact.length === 1) return { user: exact[0] };
  const loose = users.filter((u) => first(u) === n || norm(u.full_name).startsWith(n) || n.startsWith(first(u)));
  if (loose.length === 1) return { user: loose[0] };
  return { error: loose.length > 1 ? `"${name}" matches more than one user — use the full name` : `"${name}" has no matching user (add them under Management first)` };
}

/**
 * Parses rows pasted from a spreadsheet (tab- or comma-separated) in the team's weekly format:
 * Project Dates | Project | Task | Target / Expected Result | Assigned To | Estimated Time (hrs) | Result | Status.
 * The Project cell applies to the rows below it until a blank row; Result and Status columns are ignored.
 */
export function parseSheet(text, users) {
  const { data } = Papa.parse(String(text || '').replace(/\r/g, ''), { skipEmptyLines: false });
  const active = users.filter((u) => u.status !== 'Inactive');
  const rows = [];
  const warnings = new Set();
  let cols = null;
  let project = '';
  let week = null;

  for (const row of data) {
    if (row.every((c) => !String(c ?? '').trim())) { project = ''; continue; }
    const header = columnMap(row);
    if (header.task !== undefined && header.assigned !== undefined) { cols = header; project = ''; continue; }
    if (!cols) continue;
    const cell = (k) => (cols[k] === undefined ? '' : String(row[cols[k]] ?? '').trim());
    if (cell('dates') && !week) {
      const d = parseDmy(cell('dates'));
      if (d) week = mondayOf(d);
    }
    if (cell('project')) project = cell('project');
    const title = cell('task');
    if (!title) continue;
    const assignees = [];
    for (const name of cell('assigned').split(/\s*(?:\/|,|&|\band\b)\s*/i).map((s) => s.trim()).filter(Boolean)) {
      const { user, error } = matchUser(name, active);
      if (error) warnings.add(error);
      else if (!assignees.includes(user.id)) assignees.push(user.id);
    }
    const hours = parseFloat(cell('hours'));
    const target = cell('target');
    rows.push({
      title,
      project_name: project,
      expected_result: /^[-–—]$/.test(target) ? '' : target,
      estimated_hours: Number.isFinite(hours) ? hours : null,
      assignees,
    });
  }
  return { rows, week, warnings: [...warnings] };
}

/** Builds CSV text in the same column layout, ready to open in Sheets/Excel. */
export function exportSheet({ week, tasks, assignments, users, projects }) {
  const userName = Object.fromEntries(users.map((u) => [u.id, u.full_name]));
  const projectName = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const header = ['Project Dates', 'Project', 'Task', 'Target / Expected Result', 'Assigned To', 'Estimated Time (hrs)', 'Result', 'Status'];
  const lines = [header];
  let lastProject = null;
  tasks.forEach((t, i) => {
    const mine = assignments.filter((a) => a.weekly_task_id === t.id);
    const name = t.project_name || projectName[t.project_id] || '';
    if (lastProject !== null && name !== lastProject) lines.push([]);
    const results = mine.filter((a) => a.result).map((a) => (mine.length > 1 ? `${userName[a.user_id]}: ${a.result}` : a.result));
    lines.push([
      i === 0 ? sheetDateRange(week) : '',
      name !== lastProject ? name : '',
      t.title,
      t.expected_result || '',
      mine.map((a) => userName[a.user_id]).filter(Boolean).join('/'),
      t.estimated_hours ?? 'N/A',
      results.join('\n'),
      mine.length > 0 && mine.every((a) => a.status === 'Approved') ? 'TRUE' : 'FALSE',
    ]);
    lastProject = name;
  });
  return Papa.unparse(lines);
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
