import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import ListeningBuddy from '@/fun/ListeningBuddy';
import { Mic, MicOff, Trash2, UserPlus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DailyTask } from '@/entities/DailyTask';
import { Project } from '@/entities/Project';
import { User } from '@/entities/User';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useSpeech } from '@/lib/useSpeech';
import { emitFun } from '@/fun/bus';
import { dayLabel, weekDates } from '@/lib/week';
import { Emoji, Rich } from '@/icons/Emoji';

const LANGS = [['en-IN', 'English (India)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['hi-IN', 'Hindi']];
const field = 'bg-slate-800 border-slate-700 text-white text-sm';
let seq = 0;

/**
 * Dictate (or type) tasks, review how they were understood, then create them.
 * mode "weekly": rows for the allocation grid (onApplyWeekly). mode "daily": daily tasks created directly.
 */
export default function VoiceTaskDialog({ open, onOpenChange, mode, week, onApplyWeekly, onCreatedDaily }) {
  const { user: me } = useAuth();
  const isLeader = me.role === 'admin' || me.role === 'team_leader';
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('tasky_voice_lang') || 'en-IN'; } catch { return 'en-IN'; } });
  const [transcript, setTranscript] = useState('');
  const [step, setStep] = useState('dictate');
  const [items, setItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [usedLlm, setUsedLlm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const speech = useSpeech({ lang, onFinal: (t) => setTranscript((prev) => `${prev}${prev && !/\s$/.test(prev) ? ' ' : ''}${t}`) });
  const dates = week ? weekDates(week) : [];
  const userById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);
  const people = useMemo(() => users.filter((u) => u.status !== 'Inactive'), [users]);

  useEffect(() => {
    if (!open) return;
    setStep('dictate'); setTranscript(''); setItems([]); setWarnings([]); setError('');
    Promise.all([User.list(), Project.list()]).then(([u, p]) => { setUsers(u); setProjects(p); }).catch(() => {});
  }, [open]);

  useEffect(() => { if (!open) speech.stop(); }, [open]);
  useEffect(() => { try { localStorage.setItem('tasky_voice_lang', lang); } catch { /* ignore */ } }, [lang]);

  const understand = async () => {
    speech.stop();
    setBusy(true);
    setError('');
    try {
      const res = await request('POST', '/api/voice/parse', { transcript, mode, week_start: week, today: format(new Date(), 'yyyy-MM-dd') });
      setItems(res.tasks.map((t) => ({ ...t, key: `v${++seq}` })));
      setWarnings(res.warnings);
      setUsedLlm(res.used_llm);
      setStep('review');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = (key, p) => setItems((its) => its.map((t) => (t.key === key ? { ...t, ...p } : t)));
  const toggleAssignee = (key, id) => setItems((its) => its.map((t) => (t.key !== key ? t : { ...t, assignee_ids: t.assignee_ids.includes(id) ? t.assignee_ids.filter((x) => x !== id) : [...t.assignee_ids, id] })));
  const toggleDay = (key, d) => setItems((its) => its.map((t) => {
    if (t.key !== key) return t;
    const cur = t.days || dates.slice(0, 5);
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort();
    return { ...t, days: next.length ? next : null };
  }));

  const ready = items.length > 0 && items.every((t) => t.title.trim() && (mode === 'weekly' || t.assignee_ids.length));
  const allAssigned = items.every((t) => t.assignee_ids.length);

  const createDaily = async () => {
    setBusy(true);
    setError('');
    const failed = [];
    let made = 0;
    for (const t of items) {
      const project = projects.find((p) => p.name.trim().toLowerCase() === t.project_name.trim().toLowerCase());
      for (const uid of t.assignee_ids) {
        try {
          await DailyTask.create({
            date: t.date,
            project_id: project?.id,
            user_id: uid,
            task: t.title.trim(),
            expected_outcome: t.expected_result.trim() || t.title.trim(),
            expected_time: t.estimated_hours > 0 ? t.estimated_hours : 1,
            task_status: 'Pending',
            priority: t.priority,
            file_source: 'manual',
            assigned_by: uid !== me.id ? me.id : undefined,
            notes: !project && t.project_name ? t.project_name : undefined,
          });
          made += 1;
        } catch (e) {
          failed.push(`${t.title}: ${e.message}`);
        }
      }
    }
    setBusy(false);
    if (failed.length) { setError(`Created ${made}, but ${failed.length} failed — ${failed.join('; ')}`); onCreatedDaily?.(); return; }
    emitFun({ type: 'voice' });
    onCreatedDaily?.(made);
    onOpenChange(false);
  };

  const applyWeekly = (saveNow) => {
    emitFun({ type: 'voice' });
    onApplyWeekly(items, { saveNow });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl">
        <DialogHeader>
          <DialogTitle>{step === 'dictate' ? (mode === 'weekly' ? 'Dictate the weekly plan' : 'Dictate your tasks') : 'Check and assign'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 'dictate'
              ? (mode === 'weekly'
                ? 'Say what needs doing, who does it, how long it takes and the target — e.g. "Komala and Alok review 100 prospects for BlueDove, target 35% connection rate, 8 hours. Then I will prepare the weekly report on Friday."'
                : 'Say your tasks — e.g. "Write the newsletter for SSDI, 2 hours, expected result approved draft. Tomorrow update Zoho, 1 hour."' + (isLeader ? ' You can also name a teammate to assign it to them.' : ''))
              : `${usedLlm ? 'Understood with AI.' : 'Understood with simple rules (add an Anthropic API key for much better accuracy).'} Fix anything that looks wrong; nothing is created until you confirm.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'dictate' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {speech.supported ? (
                <Button type="button" onClick={speech.listening ? speech.stop : speech.start} className={speech.listening ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}>
                  {speech.listening ? <><MicOff className="w-4 h-4 mr-2" />Stop</> : <><Mic className="w-4 h-4 mr-2" />Start dictating</>}
                </Button>
              ) : (
                <p className="text-sm text-amber-300">Dictation isn't supported in this browser (use Chrome, Edge or Safari). You can still type, or paste text from any dictation tool.</p>
              )}
              {speech.supported && (
                <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Speech language" className={`${field} rounded-md border px-2 h-9`} disabled={speech.listening}>
                  {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {speech.listening && <ListeningBuddy />}
            </div>
            <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={7} aria-label="Transcript" placeholder="Your words appear here. You can edit them before continuing." className={field} />
            {speech.interim && <p className="text-sm text-slate-400 italic">{speech.interim}</p>}
            {speech.error && <p role="alert" className="text-sm text-red-400">{speech.error}</p>}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-slate-500">Dictation uses your browser's speech service, which may send audio to its provider (e.g. Google for Chrome). The text is sent to this app, and to Anthropic if AI parsing is enabled.</p>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {warnings.map((w) => <p key={w} className="text-xs text-amber-300"><Emoji e="⚠️" /> {w}</p>)}
            {items.length === 0 && <p className="text-sm text-slate-400">No tasks found. Go back and try again.</p>}
            {items.map((t) => (
              <div key={t.key} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 space-y-2">
                <div className="flex gap-2">
                  <Input className={field} value={t.title} onChange={(e) => patch(t.key, { title: e.target.value })} aria-label="Task" />
                  <button type="button" aria-label="Remove" onClick={() => setItems((its) => its.filter((x) => x.key !== t.key))} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input list="voice-projects" className={field} placeholder="Project" value={t.project_name} onChange={(e) => patch(t.key, { project_name: e.target.value })} aria-label="Project" />
                  <Input className={field} placeholder={mode === 'weekly' ? 'Target / expected result' : 'Expected outcome'} value={t.expected_result} onChange={(e) => patch(t.key, { expected_result: e.target.value })} aria-label="Expected result" />
                  <Input className={field} type="number" min="0" step="any" placeholder="Est. hrs" value={t.estimated_hours ?? ''} onChange={(e) => patch(t.key, { estimated_hours: e.target.value === '' ? null : Number(e.target.value) })} aria-label="Estimated hours" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {t.assignee_ids.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 pl-2.5 pr-1 py-0.5 text-xs">
                      {userById[id]?.full_name || 'Unknown'}
                      {(mode === 'weekly' || isLeader) && <button type="button" aria-label={`Unassign ${userById[id]?.full_name}`} onClick={() => toggleAssignee(t.key, id)} className="p-0.5 text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>}
                    </span>
                  ))}
                  {(mode === 'weekly' || isLeader) && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" aria-label="Assign people" className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:text-white"><UserPlus className="w-3 h-3" />Assign</button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-56 p-2 bg-slate-900 border-slate-700 text-white">
                        {people.map((u) => (
                          <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 cursor-pointer text-sm">
                            <input type="checkbox" checked={t.assignee_ids.includes(u.id)} onChange={() => toggleAssignee(t.key, u.id)} />{u.full_name}
                          </label>
                        ))}
                      </PopoverContent>
                    </Popover>
                  )}
                  {t.unresolved.map((u) => <span key={u} className="text-xs text-amber-300"><Emoji e="⚠️" /> {u}</span>)}
                  {mode === 'daily' && (
                    <div className="ml-auto flex items-center gap-2">
                      <Input type="date" className={`${field} w-40`} value={t.date} onChange={(e) => patch(t.key, { date: e.target.value })} aria-label="Date" />
                      <select value={t.priority} onChange={(e) => patch(t.key, { priority: e.target.value })} aria-label="Priority" className={`${field} rounded-md border px-2 h-10`}>
                        {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {mode === 'weekly' && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 mr-1">Days{t.days ? '' : ' (default Mon–Fri)'}:</span>
                    {dates.map((d) => {
                      const on = (t.days || dates.slice(0, 5)).includes(d);
                      return <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(t.key, d)} className={`px-2 py-1 rounded-md border ${on ? (t.days ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-slate-500 text-slate-200') : 'border-slate-700 text-slate-500'}`}>{dayLabel(d).split(' ')[0]}</button>;
                    })}
                  </div>
                )}
              </div>
            ))}
            <datalist id="voice-projects">{projects.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {step === 'review' ? <Button type="button" variant="ghost" className="text-slate-300" onClick={() => setStep('dictate')}>← Back to dictation</Button> : <span />}
          <div className="flex gap-2">
            {step === 'dictate' && <Button onClick={understand} disabled={busy || transcript.trim().length < 3} className="bg-blue-600 hover:bg-blue-700">{busy ? 'Understanding…' : 'Understand'}</Button>}
            {step === 'review' && mode === 'weekly' && (
              <>
                <Button onClick={() => applyWeekly(false)} disabled={!ready} variant="outline" className="bg-transparent border-slate-600 text-slate-200">Add to week</Button>
                <Button onClick={() => applyWeekly(true)} disabled={!ready || !allAssigned} className="bg-green-600 hover:bg-green-700" title={allAssigned ? '' : 'Assign everyone first'}>Add & save now</Button>
              </>
            )}
            {step === 'review' && mode === 'daily' && <Button onClick={createDaily} disabled={!ready || busy} className="bg-green-600 hover:bg-green-700">{busy ? 'Creating…' : `Create ${items.reduce((n, t) => n + t.assignee_ids.length, 0)} task(s)`}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
