import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ClipboardPaste, Copy, Download, Plus, Save, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WeeklyAssignment } from '@/entities/WeeklyAssignment';
import { WeeklyTask } from '@/entities/WeeklyTask';
import { saveWeek } from '@/api/weekly';
import { downloadText, exportSheet } from '@/lib/sheet';
import { shiftDate, shiftWeek, weekDates } from '@/lib/week';
import DaysDialog from './DaysDialog';
import ImportDialog from './ImportDialog';

let seq = 0;
const newKey = () => `new-${++seq}`;

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const field = 'bg-slate-800 border-slate-700 text-white text-sm';
const ring = { Assigned: 'border-slate-600', Submitted: 'border-amber-500', Approved: 'border-green-500', 'Changes Requested': 'border-red-500' };

function buildRows(tasks, assignments, { fresh = false, shiftDays = 0 } = {}) {
  return tasks.map((t) => ({
    key: fresh ? newKey() : t.id,
    id: fresh ? undefined : t.id,
    project_name: t.project_name || '',
    title: t.title,
    expected_result: t.expected_result || '',
    estimated_hours: t.estimated_hours === undefined || t.estimated_hours === null ? '' : String(t.estimated_hours),
    priority: t.priority || 'Medium',
    assign: Object.fromEntries(
      assignments.filter((a) => a.weekly_task_id === t.id).map((a) => [a.user_id, fresh
        ? { days: (a.days || []).map((d) => shiftDate(d, shiftDays)) }
        : { days: a.days || null, status: a.status, result: a.result }])
    ),
  }));
}

export default function AllocationGrid({ week, users, projects, tasks, assignments, pendingImport, onPendingApplied, onJumpWeek, onSaved }) {
  const [rows, setRows] = useState([]);
  const [defaultDays, setDefaultDays] = useState([0, 1, 2, 3, 4]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'ok', text }
  const [daysFor, setDaysFor] = useState(null); // { rowKey, userId }
  const [showImport, setShowImport] = useState(false);

  const members = useMemo(() => users.filter((u) => u.status !== 'Inactive'), [users]);
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const dates = weekDates(week);
  const projectNames = useMemo(() => [...new Set([...projects.map((p) => p.name), ...rows.map((r) => r.project_name).filter(Boolean)])], [projects, rows]);

  // Rebuild from the server unless there are unsaved edits.
  useEffect(() => {
    if (dirty) return;
    setRows(buildRows(tasks, assignments));
  }, [tasks, assignments, week]);

  useEffect(() => { setDirty(false); setMessage(null); }, [week]);

  const edit = (fn) => { setRows(fn); setDirty(true); setMessage(null); };
  const setRow = (key, patch) => edit((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const rowsFromImport = (parsed) => parsed.rows.map((r) => ({
    key: newKey(), project_name: r.project_name, title: r.title, expected_result: r.expected_result,
    estimated_hours: r.estimated_hours === null ? '' : String(r.estimated_hours), priority: 'Medium',
    assign: Object.fromEntries(r.assignees.map((id) => [id, { days: null }])),
  }));

  const addImported = (parsed) => {
    if (parsed.week && parsed.week !== week) {
      if (window.confirm(`This sheet is for the week of ${parsed.week}. Switch to that week and add it there?`)) {
        onJumpWeek(parsed.week, rowsFromImport(parsed));
        return;
      }
    }
    edit((rs) => [...rs, ...rowsFromImport(parsed)]);
    setMessage({ type: 'ok', text: `Added ${parsed.rows.length} task${parsed.rows.length === 1 ? '' : 's'}. Check the rows, then Save & notify.` });
  };

  // Rows imported for another week are applied once that week is showing.
  useEffect(() => {
    if (pendingImport && pendingImport.week === week) {
      setRows((rs) => [...rs, ...pendingImport.rows]);
      setDirty(true);
      setMessage({ type: 'ok', text: `Added ${pendingImport.rows.length} imported tasks. Check the rows, then Save & notify.` });
      onPendingApplied();
    }
  }, [pendingImport, week]);

  const copyLastWeek = async () => {
    try {
      const prev = shiftWeek(week, -1);
      const [pt, pa] = await Promise.all([WeeklyTask.filter({ week_start: prev }, 'sort_order'), WeeklyAssignment.filter({ week_start: prev })]);
      if (!pt.length) return setMessage({ type: 'error', text: 'Nothing was planned last week.' });
      const have = new Set(rows.map((r) => `${r.title.trim().toLowerCase()}|${r.project_name.trim().toLowerCase()}`));
      const incoming = buildRows(pt, pa, { fresh: true, shiftDays: 7 }).filter((r) => !have.has(`${r.title.trim().toLowerCase()}|${r.project_name.trim().toLowerCase()}`));
      if (!incoming.length) return setMessage({ type: 'ok', text: "Last week's tasks are already in this week." });
      edit((rs) => [...rs, ...incoming]);
      setMessage({ type: 'ok', text: `Copied ${incoming.length} task${incoming.length === 1 ? '' : 's'} from last week. Adjust them, then Save & notify.` });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const addRow = () => edit((rs) => [...rs, { key: newKey(), project_name: rs.at(-1)?.project_name || '', title: '', expected_result: '', estimated_hours: '', priority: 'Medium', assign: {} }]);

  const removeRow = (r) => {
    if (Object.keys(r.assign).length && !window.confirm(`Remove "${r.title || 'this task'}" and its allocations?`)) return;
    edit((rs) => rs.filter((x) => x.key !== r.key));
  };

  const toggleAssignee = (rowKey, userId) => edit((rs) => rs.map((r) => {
    if (r.key !== rowKey) return r;
    const assign = { ...r.assign };
    if (assign[userId]) delete assign[userId];
    else assign[userId] = { days: null };
    return { ...r, assign };
  }));

  const save = async () => {
    if (!defaultDays.length) return setMessage({ type: 'error', text: 'Pick at least one working day.' });
    const planDays = defaultDays.map((i) => dates[i]);
    const payload = {
      week_start: week,
      tasks: rows.filter((r) => r.title.trim() || Object.keys(r.assign).length).map((r) => ({
        id: r.id,
        title: r.title,
        project_name: r.project_name,
        expected_result: r.expected_result,
        estimated_hours: r.estimated_hours,
        priority: r.priority,
        assignments: Object.entries(r.assign).map(([user_id, c]) => ({ user_id, days: c.days || planDays })),
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

  const exportCsv = () => downloadText(`weekly-tasks-${week}.csv`, exportSheet({ week, tasks, assignments, users, projects }));

  const daysRow = daysFor && rows.find((r) => r.key === daysFor.rowKey);
  const daysCell = daysRow?.assign[daysFor?.userId];

  const rowStatus = (r) => {
    const cells = Object.values(r.assign).filter((c) => c.status);
    if (!cells.length) return null;
    const done = cells.filter((c) => c.status === 'Approved').length;
    return { done, total: cells.length };
  };

  return (
    <div className="space-y-4">
      <Card className="glass-effect-enhanced">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Button onClick={addRow} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><Plus className="w-4 h-4 mr-1" />Add task</Button>
          <Button onClick={copyLastWeek} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><Copy className="w-4 h-4 mr-1" />Copy from last week</Button>
          <Button onClick={() => setShowImport(true)} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><ClipboardPaste className="w-4 h-4 mr-1" />Import from sheet</Button>
          <Button onClick={exportCsv} disabled={!tasks.length} variant="outline" className="bg-transparent border-slate-600 text-slate-200"><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400" title="Default days for newly assigned people">
            <CalendarDays className="w-4 h-4" />
            {DAY_NAMES.map((n, i) => (
              <button
                key={n} type="button" aria-pressed={defaultDays.includes(i)}
                onClick={() => setDefaultDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()))}
                className={`px-2 py-1 rounded-md border ${defaultDays.includes(i) ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
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
          <datalist id="project-names">{projectNames.map((n) => <option key={n} value={n} />)}</datalist>
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-300 text-left">
                <th className="p-3 w-44">Project</th>
                <th className="p-3 min-w-[16rem]">Task</th>
                <th className="p-3 min-w-[12rem]">Target / Expected Result</th>
                <th className="p-3 min-w-[14rem]">Assigned To</th>
                <th className="p-3 w-24">Est. hrs</th>
                <th className="p-3 min-w-[12rem]">Result</th>
                <th className="p-3 w-24">Status</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={8} className="p-10 text-center text-slate-400">No tasks planned for this week. Add a task, copy last week's, or import your sheet.</td></tr>
              )}
              {rows.map((r, i) => {
                const st = rowStatus(r);
                const newProject = i === 0 || rows[i - 1].project_name !== r.project_name;
                return (
                  <tr key={r.key} className={`align-top border-b border-slate-800 ${newProject && i > 0 ? 'border-t-2 border-t-slate-600' : ''}`}>
                    <td className="p-2"><Input list="project-names" className={field} placeholder="Project" value={r.project_name} onChange={(e) => setRow(r.key, { project_name: e.target.value })} aria-label="Project" /></td>
                    <td className="p-2"><Textarea rows={2} className={`${field} min-h-0`} placeholder="Task" value={r.title} onChange={(e) => setRow(r.key, { title: e.target.value })} aria-label="Task" /></td>
                    <td className="p-2"><Textarea rows={2} className={`${field} min-h-0`} placeholder="e.g. 35% connection rate" value={r.expected_result} onChange={(e) => setRow(r.key, { expected_result: e.target.value })} aria-label="Target / Expected Result" /></td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {Object.entries(r.assign).map(([uid, c]) => (
                          <span key={uid} className={`inline-flex items-center gap-1 rounded-full border ${ring[c.status] || ring.Assigned} bg-slate-800 pl-2.5 pr-1 py-0.5 text-xs text-white`} title={c.status || 'Not saved yet'}>
                            {userById[uid]?.full_name || 'Unknown'}
                            <button type="button" aria-label={`Days for ${userById[uid]?.full_name}`} title={c.days ? `${c.days.length} custom day(s)` : 'Set days'} onClick={() => setDaysFor({ rowKey: r.key, userId: uid })} className={`p-0.5 rounded ${c.days ? 'text-blue-300' : 'text-slate-500'} hover:text-white`}><CalendarDays className="w-3 h-3" /></button>
                            <button type="button" aria-label={`Unassign ${userById[uid]?.full_name}`} onClick={() => toggleAssignee(r.key, uid)} className="p-0.5 text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" aria-label="Assign people" className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:text-white"><UserPlus className="w-3 h-3" />Add</button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-56 p-2 bg-slate-900 border-slate-700 text-white">
                            {members.map((u) => (
                              <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer text-sm">
                                <input type="checkbox" checked={!!r.assign[u.id]} onChange={() => toggleAssignee(r.key, u.id)} />
                                <span>{u.full_name}</span>
                                <span className="ml-auto text-[10px] text-slate-500">{u.role.replace('_', ' ')}</span>
                              </label>
                            ))}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </td>
                    <td className="p-2"><Input type="number" min="0" step="any" className={field} placeholder="N/A" value={r.estimated_hours} onChange={(e) => setRow(r.key, { estimated_hours: e.target.value })} aria-label="Estimated hours" /></td>
                    <td className="p-2 text-xs text-slate-300 whitespace-pre-line">
                      {Object.entries(r.assign).filter(([, c]) => c.result).map(([uid, c]) => (
                        <div key={uid} className="mb-1">{Object.keys(r.assign).length > 1 && <span className="text-slate-500">{userById[uid]?.full_name}: </span>}{c.result}</div>
                      ))}
                    </td>
                    <td className="p-2">
                      {st ? (
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${st.done === st.total ? 'bg-green-500/20 text-green-300' : 'bg-slate-700/60 text-slate-300'}`}>
                          {st.done === st.total ? 'TRUE' : 'FALSE'}{st.total > 1 && ` ${st.done}/${st.total}`}
                        </span>
                      ) : <span className="text-xs text-slate-500">—</span>}
                    </td>
                    <td className="p-2"><button type="button" aria-label="Remove task" onClick={() => removeRow(r)} className="text-slate-500 hover:text-red-400 mt-2"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500">Same columns as your weekly sheet. Assign one or more people to a task; the estimated hours are shared between them and spread over their days. Saving creates their daily tasks (leaders and project managers included) and notifies everyone affected immediately. Status turns TRUE once every assignee's work is approved.</p>

      <ImportDialog open={showImport} onOpenChange={setShowImport} users={users} onImport={addImported} />
      {daysFor && daysRow && daysCell && (
        <DaysDialog
          open
          onOpenChange={(o) => !o && setDaysFor(null)}
          week={week}
          days={daysCell.days}
          defaultDays={defaultDays.map((i) => dates[i])}
          name={userById[daysFor.userId]?.full_name}
          taskTitle={daysRow.title}
          onSave={(days) => edit((rs) => rs.map((r) => (r.key === daysFor.rowKey ? { ...r, assign: { ...r.assign, [daysFor.userId]: { ...r.assign[daysFor.userId], days } } } : r)))}
        />
      )}
    </div>
  );
}
