import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { DailyTask } from '@/entities/DailyTask';
import { submitAssignment } from '@/api/weekly';
import { dayLabel } from '@/lib/week';
import StatusBadge from './StatusBadge';
import EmptyState from '@/fun/EmptyState';
import ChaseProgress from '@/fun/chase/ChaseProgress';

const dayStyle = {
  Completed: 'bg-green-500/20 border-green-500/40 text-green-300',
  'In Progress': 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  Blocked: 'bg-red-500/20 border-red-500/40 text-red-300',
  Pending: 'bg-slate-700/40 border-slate-600 text-slate-300',
};

export default function MyWeek({ me, tasks, assignments, userById, projectById, refreshKey, onChanged }) {
  const [dailies, setDailies] = useState([]);
  const [submitting, setSubmitting] = useState(null); // assignment
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mine = useMemo(() => assignments.filter((a) => a.user_id === me.id), [assignments, me.id]);
  const taskById = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);

  useEffect(() => {
    DailyTask.filter({ user_id: me.id }).then((all) => setDailies(all.filter((d) => d.weekly_assignment_id))).catch(() => setDailies([]));
  }, [me.id, refreshKey, assignments]);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await submitAssignment(submitting.id, { result });
      setSubmitting(null);
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!mine.length) {
    return <EmptyState title="Nothing on your plate this week" hint="Tasky is napping. When a leader allocates work to you it shows up here, with a ping!" />;
  }

  return (
    <div className="space-y-3">
      {mine.map((a) => {
        const t = taskById[a.weekly_task_id];
        const days = dailies.filter((d) => d.weekly_assignment_id === a.id).sort((x, y) => x.date.localeCompare(y.date));
        const finished = days.filter((d) => d.task_status === 'Completed').length;
        const canSubmit = a.status === 'Assigned' || a.status === 'Changes Requested';
        const others = assignments.filter((x) => x.weekly_task_id === a.weekly_task_id && x.user_id !== me.id).map((x) => userById[x.user_id]?.full_name).filter(Boolean);
        return (
          <Card key={a.id} className="glass-effect-enhanced">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{t?.title}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="text-sm text-slate-400">
                    {t?.project_name || projectById[t?.project_id]?.name || 'No project'}
                    {a.hours > 0 && <> · <span className="text-white">{a.hours} hrs</span></>}
                    {others.length > 0 && <> · with {others.join(', ')}</>}
                  </div>
                  {t?.expected_result && <div className="text-sm text-slate-300">Target: {t.expected_result}</div>}
                </div>
                {canSubmit && (
                  <Button onClick={() => { setSubmitting(a); setResult(a.result || ''); setError(''); }} className="bg-blue-600 hover:bg-blue-700"><Send className="w-4 h-4 mr-1" />Submit for approval</Button>
                )}
              </div>
              {a.status === 'Changes Requested' && a.review_note && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2">Changes requested: {a.review_note}</p>}
              {a.status === 'Submitted' && <p className="text-sm text-amber-300">Waiting for a team leader to approve.</p>}
              {a.status === 'Approved' && <p className="text-sm text-green-300">Approved ✓</p>}
              {a.result && <p className="text-sm text-slate-200 whitespace-pre-line bg-slate-800/60 rounded-md p-2"><span className="text-slate-400">Your result: </span>{a.result}</p>}
              {days.length > 0 && (
                <>
                  <ChaseProgress size="sm" label="Days finished" value={finished} max={days.length} text={`${finished}/${days.length} days`} />
                  <div className="flex flex-wrap gap-2">
                    {days.map((d) => (
                      <div key={d.id} className={`text-xs rounded-md border px-2 py-1 ${dayStyle[d.task_status] || dayStyle.Pending}`} title={d.task_status}>
                        {dayLabel(d.date)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!submitting} onOpenChange={(o) => !o && setSubmitting(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
            <DialogDescription className="text-slate-400">{submitting && taskById[submitting.weekly_task_id]?.title}. Your team leader will be notified right away.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="result">Result — what did you complete?</Label>
              <Textarea id="result" rows={5} value={result} onChange={(e) => setResult(e.target.value)} placeholder="e.g. 44% connection rate. Sent 104 first-level messages." className="bg-slate-800 border-slate-700 text-white" />
            </div>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={busy || !result.trim()} className="bg-blue-600 hover:bg-blue-700">{busy ? 'Submitting...' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
