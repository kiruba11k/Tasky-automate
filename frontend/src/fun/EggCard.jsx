import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBuddy } from './BuddyContext';
import EggDialog from './EggDialog';
import { Emoji } from '@/icons/Emoji';

/** Dashboard card: how close the next mystery egg is, and a hatch button when one is ready. */
export default function EggCard() {
  const { eggs, ownedBuddies, ownedAccessories, accessories } = useBuddy();
  const [open, setOpen] = useState(false);
  const left = Math.max(0, eggs.next_at - eggs.done);
  const prev = eggs.done < 3 ? 0 : Math.floor(eggs.done / 10) * 10;
  const pct = eggs.available > 0 ? 100 : Math.max(0, Math.min(100, ((eggs.done - prev) / Math.max(1, eggs.next_at - prev)) * 100));
  return (
    <div className="glass-effect-enhanced rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className={eggs.available > 0 ? 'egg-ready' : ''}><Emoji e="🥚" size="3.2rem" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold text-white">Mystery egg</h3>
          <p className="text-xs text-slate-400">{eggs.available > 0 ? `${eggs.available} ready to hatch!` : `${left} more finished task${left === 1 ? '' : 's'} to the next one`}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={`rounded-xl border-2 border-slate-900 px-3 py-1.5 text-sm font-extrabold shadow-[3px_3px_0_rgba(0,0,0,.5)] ${eggs.available > 0 ? 'bg-yellow-300 text-ink animate-pulse' : 'bg-slate-800 text-slate-200'}`}>{eggs.available > 0 ? 'Hatch!' : 'Peek'}</button>
      </div>
      <div className="h-2 rounded-full bg-slate-700 overflow-hidden mt-3"><div className="h-full bg-gradient-to-r from-pink-400 to-yellow-300 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <p className="text-[11px] text-slate-400 mt-2">Collected: {ownedBuddies.length} buddies, {ownedAccessories.length}/{accessories.length || 12} accessories. <Link to="/Cast" className="text-sky-300 underline">Meet the cast</Link></p>
      <EggDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
