import React, { useEffect, useState } from 'react';
import { SOUNDS, currentSound, savedSound, setVolume, startSound, stopSound } from '@/fun/soundscape';

/** Pick a calm background sound to focus to. Quiet by default, and only plays after you press a button. */
export default function Soundscape({ compact = false }) {
  const [on, setOn] = useState(currentSound());
  const [vol, setVol] = useState(() => savedSound()?.volume ?? 0.5);
  useEffect(() => { const t = setInterval(() => setOn(currentSound()), 800); return () => clearInterval(t); }, []);
  const pick = (k) => { if (on === k) { stopSound(); setOn(null); } else { startSound(k, vol); setOn(k); } };
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-1' : ''}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Background sound">
        {SOUNDS.map(([k, label]) => <button key={k} type="button" aria-pressed={on === k} onClick={() => pick(k)} className={`rounded-lg border-2 border-slate-900 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1.5 text-sm'} font-bold ${on === k ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}>{label}</button>)}
      </div>
      {!compact && (
        <label className="flex items-center gap-2 text-xs text-slate-300 mt-3">Volume
          <input type="range" min="0.05" max="1" step="0.05" value={vol} onChange={(e) => { const v = Number(e.target.value); setVol(v); setVolume(v); }} className="flex-1 max-w-[12rem]" aria-label="Sound volume" />
        </label>
      )}
    </div>
  );
}
