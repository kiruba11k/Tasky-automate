import React, { useCallback, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { effects } from '@/fun/effects';
import { emitFun } from '@/fun/bus';
import { Emoji } from '@/icons/Emoji';
import { Err, Panel, primary, today } from './ui';

const KIND = { sticker: ['Sticker', '#60a5fa'], rare: ['Rare sticker', '#a78bfa'], epic: ['Epic sticker', '#fbbf24'], egg: ['Mystery egg', '#f472b6'], confetti: ['Confetti', '#34d399'] };

/** Daily wheel: finish a task today, then spin once for a sticker, a mystery egg or just confetti. */
export default function Wheel() {
  const [w, setW] = useState(null); const [spin, setSpin] = useState(0); const [prize, setPrize] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => request('GET', `/api/me/wheel?today=${today()}`).then(setW).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const go = async () => {
    setBusy(true); setErr('');
    try {
      const p = await request('POST', '/api/me/wheel', { today: today() });
      const n = w.segments.length;
      setSpin((s) => s + 360 * 5 + ((((360 - (p.segment + 0.5) * (360 / n)) - (s % 360)) % 360) + 360) % 360);
      setTimeout(() => { setPrize(p); load(); emitFun({ type: 'hatched' }); if (p.kind !== 'confetti') effects.big(); else effects.small(); }, 4200);
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const segs = w?.segments || [];
  const grad = segs.map((k, i) => `${KIND[k][1]} ${(i * 100) / segs.length}% ${((i + 1) * 100) / segs.length}%`).join(', ');
  const shown = prize || w?.prize;
  return (
    <Panel title="Daily wheel" hint="Finish a task today to unlock one free spin.">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative w-44 h-44 shrink-0" aria-hidden="true">
          <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-10 w-0 h-0 border-x-8 border-x-transparent border-t-[16px] border-t-white drop-shadow" />
          <div className="wheel" style={{ background: `conic-gradient(${grad || '#475569, #475569'})`, transform: `rotate(${spin}deg)` }}>
            {segs.map((k, i) => <span key={i} className="wheel-label" style={{ transform: `rotate(${(i + 0.5) * (360 / segs.length)}deg) translateY(-62px)` }}>{{ egg: 'O', confetti: '*', epic: 'E', rare: 'R', sticker: 'S' }[k]}</span>)}
          </div>
        </div>
        <div className="flex-1 min-w-[10rem]">
          {w?.available && !prize ? <button type="button" onClick={go} disabled={busy} className={primary}>{busy ? 'Spinning…' : 'Spin the wheel!'}</button>
            : <p className="text-sm text-slate-300">{shown ? 'Spun for today. Come back after tomorrow\'s first finished task!' : 'Finish a task today to unlock your spin.'}</p>}
          {shown && !busy || prize ? (
            <div className="mt-2 rounded-xl bg-slate-800/70 p-3 text-center">
              <div className="text-xs text-slate-400">Today's prize</div>
              <div className="text-lg font-extrabold text-white flex items-center justify-center gap-2">{shown?.sticker ? <Emoji e={shown.sticker.emoji} size="2rem" /> : shown?.kind === 'egg' ? <Emoji e="🥚" size="2rem" /> : null}{KIND[shown?.kind]?.[0]}</div>
              {shown?.kind === 'egg' && <div className="text-xs text-pink-300">A bonus egg is waiting in your nest!</div>}
            </div>
          ) : null}
          <Err text={err} />
        </div>
      </div>
    </Panel>
  );
}
