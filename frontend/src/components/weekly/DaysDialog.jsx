import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { dayLabel, weekDates } from '@/lib/week';

/** Chooses the days one person works on a task; a daily task is created for each. */
export default function DaysDialog({ open, onOpenChange, week, days, defaultDays, name, taskTitle, onSave }) {
  const dates = weekDates(week);
  const [picked, setPicked] = useState([]);

  useEffect(() => { if (open) setPicked(days || defaultDays); }, [open]);

  const toggle = (d) => setPicked((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Days — {name}</DialogTitle>
          <DialogDescription className="text-slate-400">{taskTitle}. A daily task is created for each day you pick; the estimated hours are spread across them.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {dates.map((d) => (
            <button
              key={d} type="button" aria-pressed={picked.includes(d)} onClick={() => toggle(d)}
              className={`px-3 py-2 rounded-md border text-sm ${picked.includes(d) ? 'bg-blue-600/30 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
            >{dayLabel(d)}</button>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" className="text-slate-300" onClick={() => { onSave(null); onOpenChange(false); }}>Use the week's default days</Button>
          <Button type="button" disabled={!picked.length} className="bg-blue-600 hover:bg-blue-700" onClick={() => { onSave(picked); onOpenChange(false); }}>Save days</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
