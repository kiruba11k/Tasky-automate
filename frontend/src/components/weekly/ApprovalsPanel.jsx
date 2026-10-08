import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { approveAssignment, rejectAssignment } from '@/api/weekly';

export default function ApprovalsPanel({ submitted, taskById, userById, projectById, me, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null); // assignment id
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const act = async (id, fn) => {
    setBusy(id);
    setError('');
    try {
      await fn();
      setRejecting(null);
      setNote('');
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!submitted.length) {
    return <div className="text-center py-16 text-slate-400 glass-effect-enhanced rounded-lg">Nothing is waiting for approval.</div>;
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {submitted.map((a) => {
        const t = taskById[a.weekly_task_id];
        const u = userById[a.user_id];
        const own = a.user_id === me.id && me.role !== 'admin';
        return (
          <Card key={a.id} className="glass-effect-enhanced">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">{t?.title || 'Task'}</div>
                  <div className="text-sm text-slate-400">
                    {u?.full_name || 'Someone'} · {projectById[t?.project_id]?.name || 'No project'} · week of {format(parseISO(a.week_start), 'MMM d')}
                  </div>
                  <div className="text-sm text-slate-200 mt-1">
                    Done <span className="font-semibold">{a.done ?? a.target}</span> of {a.target}{t?.unit ? ` ${t.unit}` : ''}
                    {t?.expected_outcome && <span className="text-slate-400"> · outcome: {t.expected_outcome}</span>}
                  </div>
                  {a.note && <div className="text-sm text-slate-300 italic mt-1">"{a.note}"</div>}
                </div>
                <div className="flex gap-2">
                  <Button disabled={own || busy === a.id} onClick={() => act(a.id, () => approveAssignment(a.id))} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-1" />Approve</Button>
                  <Button disabled={own || busy === a.id} variant="outline" onClick={() => { setRejecting(rejecting === a.id ? null : a.id); setNote(''); }} className="bg-transparent border-slate-600 text-slate-200"><MessageSquareWarning className="w-4 h-4 mr-1" />Request changes</Button>
                </div>
              </div>
              {own && <p className="text-xs text-amber-400">You can't approve your own work — another leader or admin needs to.</p>}
              {rejecting === a.id && (
                <div className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to change?" className="bg-slate-800 border-slate-700 text-white" aria-label="What needs to change" />
                  <Button disabled={!note.trim() || busy === a.id} onClick={() => act(a.id, () => rejectAssignment(a.id, note))} className="bg-red-600 hover:bg-red-700">Send back</Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
