import React, { useEffect, useMemo, useState } from 'react';
import { addDays, parseISO } from 'date-fns';
import { CalendarDays, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { WeeklyAssignment } from '@/entities/WeeklyAssignment';
import { WeeklyTask } from '@/entities/WeeklyTask';
import { saveWeek } from '@/api/weekly';
import { dayLabel, evenSplit, planTotal, shiftWeek, toISO, weekDates } from '@/lib/week';
import DaySplitDialog from './DaySplitDialog';
import StatusBadge from './StatusBadge';

let seq = 0;
const newKey = () => `new-${++seq}`;
const blankRow = () => ({ key: newKey(), title: '', project_id: '', unit: '', hours_per_unit: '1', expected_outcome: '', priority: 'Medium', cells: {} });

function buildRows(tasks, assignments, { fresh = false, shiftDays = 0 } = {}) {
  const shift = (plan) => (plan ? Object.fromEntries(Object.entries(plan).map(([d, v]) => [toISO(addDays(parseISO(d), shiftDays)), v])) : null);
  return tasks.map((t) => ({
    key: fresh ? newKey() : t.id,
    id: fresh ? undefined : t.id,
    title: t.title,
    project_id: t.project_id || '',
    unit: t.unit || '',
    hours_per_unit: String(t.hours_per_unit ?? 1),
    expected_outcome: t.expected_outcome || '',
    priority: t.priority || 'Medium',
    cells: Object.fromEntries(
      assignments.filter((a) => a.weekly_task_id === t.id).map((a) => [a.user_id, fresh
        ? { target: String(a.target), plan: shift(a.daily_plan) }
        : { target: String(a.target), plan: a.daily_plan || null, status: a.status }])
    ),
  }));
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const field = 'h-8 px-2 text-xs bg-slate-800 border-slate-700 text-white';
const select = `${field} rounded-md border w-full`;

export default function AllocationGrid({ week, users, projects, tasks, assignments, onSaved }) {
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }
  const [split, setSplit] = useState(null); // { rowKey, userId }

  const members = useMemo(() => users.filter((u) => u.status !== 'Inactive'), [users]);
  const dates = weekDates(week);

  // Rebuild from the server unless there are unsaved edits.
  useEffect(() => {
    if (dirty) return;
    setRows(buildRows(tasks, assignments));
  }, [tasks, assignments, week]);

  useEffect(() => { setDirty(false); setMessage(null); }, [week]);

  const edit = (fn) => { setRows(fn); setDirty(true); setMessage(null); };
  const setRow = (key, patch) => edit((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const setCell = (key, userId, value) => edit((rs) => rs.map((r) => {
    if (r.key !== key) return r;
    const cells = { ...r.cells };
    if (value === '') delete cells[userId];
    else cells[userId] = { ...cells[userId], target: value, plan: cells[userId]?.target === value ? cells[userId].plan : null };
    return { ...r, cells };
  }));

  const hours = (userId) => rows.reduce((s, r) => s + (Number(r.cells[userId]?.target) || 0) * (Number(r.hours_per_unit) || 0), 0);

  const copyLastWeek = async () => {
    try {
      const prev = shiftWeek(week, -1);
      const [pt, pa] = await Promise.all([WeeklyTask.filter({ week_start: prev }, 'sort_order'), WeeklyAssignment.filter({ week_start: prev })]);
      const have = new Set(rows.map((r) => `${r.title.trim().toLowerCase()}|${r.project_id}`));
      const incoming = buildRows(pt, pa, { fresh: true, shiftDays: 7 }).filter((r) => !have.has(`${r.title.trim().toLowerCase()}|${r.project_id}`));
      if (!pt.length) return setMessage({ type: 'error', text: 'Nothing was planned last week.' });
      if (!incoming.length) return setMessage({ type: 'ok', text: "Last week's tasks are already in this week." });
      edit((rs) => [...rs, ...incoming]);
      setMessage({ type: 'ok', text: `Copied ${incoming.length} task${incoming.length === 1 ? '' : 's'} from last week. Change the numbers, then Save & notify.` });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const removeRow = (r) => {
    if (Object.keys(r.cells).length && !window.confirm(`Remove "${r.title || 'this task'}" and its allocations?`)) return;
    edit((rs) => rs.filter((x) => x.key !== r.key));
  };

  const save = async () => {
    if (!days.length) return setMessage({ type: 'error', text: 'Pick at least one working day.' });
    const planDates = days.map((i) => dates[i]);
    const payload = {
      week_start: week,
      tasks: rows.filter((r) => r.title.trim() || Object.keys(r.cells).length).map((r) => ({
        id: r.id,
        title: r.title,
        project_id: r.project_id,
        unit: r.unit,
        hours_per_unit: r.hours_per_unit,
        expected_outcome: r.expected_outcome,
        priority: r.priority,
        assignments: Object.entries(r.cells).filter(([, c]) => Number(c.target) > 0).map(([user_id, c]) => {
          const target = Number(c.target);
          return { user_id, target, plan: c.plan && Math.abs(planTotal(c.plan) - target) < 0.01 ? c.plan : evenSplit(target, planDates) };
        }),
      })),
    };
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveWeek(payload);
      setDirty(false);
      setRows(buildRows(res.tasks, res.assignments));
      setMessage({ type: 'ok', text: res.changes ? `Saved. ${res.changes} allocation${res.changes === 1 ? '' : 's'} changed — daily tasks created and people notified.` : 'Saved. Nothing changed.' });
      onSaved?.();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const splitRow = split && rows.find((r) => r.key === split.rowKey);
  const splitCell = splitRow?.cells[split?.userId];
  const splitUser = members.find((u) => u.id === split?.userId);

  return (
    <div className="space-y-4">
      <Card className="glass-effect-enhanced">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => edit((rs) => [...rs, blankRow()])} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><Plus className="w-4 h-4 mr-1" />Add task</Button>
          <Button onClick={copyLastWeek} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><Copy className="w-4 h-4 mr-1" />Copy from last week</Button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400" title="Days that targets are spread over when you don't set a custom split">
            <CalendarDays className="w-4 h-4" />
            {DAY_NAMES.map((n, i) => (
              <button
                key={n} type="button" aria-pressed={days.includes(i)}
                onClick={() => { setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort())); setDirty(true); }}
                className={`px-2 py-1 rounded-md border ${days.includes(i) ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
              >{n}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
            <Button onClick={save} disabled={saving || !dirty} className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save & notify'}</Button>
          </div>
        </CardContent>
      </Card>

      {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}

      <Card className="glass-effect-enhanced">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-300">
                <th className="text-left p-3 min-w-[19rem] sticky left-0 bg-slate-900/95 z-10">Task</th>
                {members.map((u) => (
                  <th key={u.id} className="p-3 min-w-[8.5rem] text-center font-medium">
                    <div className="text-white">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400">{u.role.replace('_', ' ')} · {Math.round(hours(u.id) * 10) / 10}h</div>
                  </th>
                ))}
                <th className="p-3 text-center">Total</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={members.length + 3} className="p-10 text-center text-slate-400">No tasks planned for this week. Add a task or copy last week's.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-slate-800 align-top">
                  <td className="p-3 sticky left-0 bg-slate-900/95 z-10 space-y-1.5">
                    <Input className={`${field} text-sm font-medium`} placeholder="Task (e.g. LinkedIn posts)" value={r.title} onChange={(e) => setRow(r.key, { title: e.target.value })} aria-label="Task title" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <select className={select} value={r.project_id} onChange={(e) => setRow(r.key, { project_id: e.target.value })} aria-label="Project">
                        <option value="">No project</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select className={select} value={r.priority} onChange={(e) => setRow(r.key, { priority: e.target.value })} aria-label="Priority">
                        {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <Input className={field} placeholder="Unit (posts, leads…)" value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value })} aria-label="Unit" />
                      <Input className={field} type="number" min="0" step="any" placeholder="Hours / unit" value={r.hours_per_unit} onChange={(e) => setRow(r.key, { hours_per_unit: e.target.value })} aria-label="Hours per unit" />
                    </div>
                    <Input className={field} placeholder="Expected outcome" value={r.expected_outcome} onChange={(e) => setRow(r.key, { expected_outcome: e.target.value })} aria-label="Expected outcome" />
                  </td>
                  {members.map((u) => {
                    const c = r.cells[u.id];
                    return (
                      <td key={u.id} className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number" min="0" step="any" value={c?.target ?? ''} placeholder="–"
                            onChange={(e) => setCell(r.key, u.id, e.target.value)}
                            className="h-9 w-16 px-1 text-center bg-slate-800 border-slate-700 text-white"
                            aria-label={`${r.title || 'Task'} for ${u.full_name}`}
                          />
                          {c && Number(c.target) > 0 && (
                            <button type="button" title="Set daily split" aria-label="Set daily split" onClick={() => setSplit({ rowKey: r.key, userId: u.id })} className="p-1 rounded text-slate-400 hover:text-white">
                              <CalendarDays className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {c?.status && c.status !== 'Assigned' && <div className="mt-1"><StatusBadge status={c.status} /></div>}
                        {c?.plan && <div className="text-[10px] text-slate-500 mt-0.5">custom split</div>}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center text-white font-semibold">{Object.values(r.cells).reduce((s, c) => s + (Number(c.target) || 0), 0) || ''}</td>
                  <td className="p-3"><button type="button" aria-label="Remove task" onClick={() => removeRow(r)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500">Type a number in a person's cell to allocate it; several people can share one task. Saving creates the daily tasks (for leaders too) and notifies everyone affected immediately. Changing a number on a submitted or approved task reopens it.</p>

      {split && splitRow && splitCell && (
        <DaySplitDialog
          open
          onOpenChange={(o) => !o && setSplit(null)}
          week={week}
          target={Number(splitCell.target)}
          plan={splitCell.plan}
          defaultDays={days}
          name={splitUser?.full_name}
          taskTitle={splitRow.title}
          onSave={(plan) => edit((rs) => rs.map((r) => (r.key === split.rowKey ? { ...r, cells: { ...r.cells, [split.userId]: { ...r.cells[split.userId], plan } } } : r)))}
        />
      )}
    </div>
  );
}
