import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { parseSheet } from '@/lib/sheet';
import { weekLabel } from '@/lib/week';

/** Paste rows copied from the team's weekly spreadsheet (or load a CSV) and review them before they enter the grid. */
export default function ImportDialog({ open, onOpenChange, users, onImport }) {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseSheet(text, users), [text, users]);
  const userName = Object.fromEntries(users.map((u) => [u.id, u.full_name]));

  const loadFile = async (e) => {
    const f = e.target.files?.[0];
    if (f) setText(await f.text());
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import from your sheet</DialogTitle>
          <DialogDescription className="text-slate-400">
            Copy the rows (with the header) from Google Sheets/Excel and paste them here, or load a CSV. Columns: Project Dates, Project, Task, Target / Expected Result, Assigned To, Estimated Time (hrs). Result and Status are ignored. Nothing is saved or sent until you press Save & notify.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste here…" rows={7} className="bg-slate-800 border-slate-700 text-white font-mono text-xs" aria-label="Pasted sheet" />
        <div className="flex items-center gap-3 text-sm">
          <label className="text-blue-400 hover:underline cursor-pointer">
            Load a CSV file
            <input type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={loadFile} />
          </label>
          {text && <span className="text-slate-300">{parsed.rows.length} task{parsed.rows.length === 1 ? '' : 's'} found{parsed.week ? ` · week of ${weekLabel(parsed.week)}` : ''}</span>}
        </div>
        {parsed.warnings.length > 0 && (
          <ul className="text-xs text-amber-300 list-disc pl-5 space-y-0.5">{parsed.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        )}
        {parsed.rows.length > 0 && (
          <div className="max-h-52 overflow-auto rounded-md border border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-800 text-slate-300"><tr><th className="p-2 text-left">Project</th><th className="p-2 text-left">Task</th><th className="p-2 text-left">Target</th><th className="p-2 text-left">Assigned</th><th className="p-2">Hrs</th></tr></thead>
              <tbody>
                {parsed.rows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800 align-top">
                    <td className="p-2">{r.project_name}</td><td className="p-2">{r.title}</td><td className="p-2">{r.expected_result}</td>
                    <td className="p-2">{r.assignees.map((id) => userName[id]).join(', ') || '—'}</td><td className="p-2 text-center">{r.estimated_hours ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button disabled={!parsed.rows.length} className="bg-blue-600 hover:bg-blue-700" onClick={() => { onImport(parsed); setText(''); onOpenChange(false); }}>
            Add {parsed.rows.length || ''} to the week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
