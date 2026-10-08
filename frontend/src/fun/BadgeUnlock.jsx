import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Shown one at a time when a new badge is earned. */
export default function BadgeUnlock({ badge, onClose }) {
  return (
    <Dialog open={!!badge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white text-center overflow-hidden">
        <div className="badge-rays" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center gap-2 py-2">
          <div className="text-sm font-bold uppercase tracking-widest text-yellow-300">New badge!</div>
          <div className="badge-pop text-7xl drop-shadow-[0_6px_0_rgba(0,0,0,.35)]" aria-hidden="true">{badge?.emoji}</div>
          <DialogTitle className="text-2xl font-extrabold">{badge?.name}</DialogTitle>
          <DialogDescription className="text-slate-300">{badge?.desc}</DialogDescription>
          <p className="text-xs text-emerald-300 font-semibold">+25 XP</p>
          <Button onClick={onClose} className="mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold">Awesome!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
