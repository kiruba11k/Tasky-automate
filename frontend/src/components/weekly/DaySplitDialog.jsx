import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dayLabel, evenSplit, planTotal, weekDates } from '@/lib/week';

/** Lets a leader choose how one person's weekly target is spread over the days. */
export default function DaySplitDialog({ open, onOpenChange, week, target, plan, defaultDays, name, taskTitle, onSave }) {
  const dates = weekDates(week);
  const [values, setValues] = useState({});

  useEffect(() => {
    if (!open) return;
    const base = plan || evenSplit(Number(target), defaultDays.map((i) => dates[i]));
    setValues(Object.fromEntries(dates.map((d) => [d, base[d] ? String(base[d]) : ''])));
  }, [open]);

  const numeric = Object.fromEntries(Object.entries(values).map(([d, v]) => [d, Number(v) || 0]));
  const total = planTotal(numeric);
  const ok = Math.abs(total - Number(target)) < 0.01 && Object.values(numeric).every((v) => v >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Daily split — {name}</DialogTitle>
          <DialogDescription className="text-slate-400">{taskTitle}: spread {target} across the week.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-7 gap-1.5">
          {dates.map((d) => (
            <div key={d} className="text-center">
              <div className="text-[11px] text-slate-400 mb-1">{dayLabel(d)}</div>
              <Input
                type="number" min="0" step="any" value={values[d] ?? ''}
                onChange={(e) => setValues({ ...values, [d]: e.target.value })}
                className="h-9 px-1 text-center bg-slate-800 border-slate-700 text-white"
                aria-label={`Quantity on ${d}`}
              />
            </div>
          ))}
        </div>
        <p className={`text-sm ${ok ? 'text-green-400' : 'text-amber-400'}`}>
          Total {total} of {target}{ok ? ' ✓' : ` — ${total > Number(target) ? 'reduce' : 'add'} ${Math.abs(Math.round((Number(target) - total) * 100) / 100)}`}
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => { onSave(null); onOpenChange(false); }} className="text-slate-300">Even split (Mon–Fri)</Button>
          <Button type="button" disabled={!ok} onClick={() => { onSave(Object.fromEntries(Object.entries(numeric).filter(([, v]) => v > 0))); onOpenChange(false); }} className="bg-blue-600 hover:bg-blue-700">Use this split</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
