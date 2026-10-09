import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { request } from '@/api/client';
import { useFun } from '@/fun/FunProvider';
import { hasWebGL } from '@/fun/three/species';
import { effects } from '@/fun/effects';
import { emitFun } from '@/fun/bus';
import { mondayOf } from '@/lib/week';
import { Err, Panel, primary, today } from './ui';

const BossStage = lazy(() => import('@/fun/three/BossStage'));

/** The weekly boss: every task the team finishes damages it, and the whole team shares the win. Nobody is ranked. */
export default function BossBattle() {
  const { settings } = useFun();
  const [b, setB] = useState(null); const [err, setErr] = useState(''); const [hit, setHit] = useState(0);
  const last = useRef(null);
  const load = useCallback(async () => {
    try { const r = await request('GET', `/api/team/boss?today=${today()}&week_start=${mondayOf()}`); if (last.current !== null && r.hp_left < last.current) setHit((h) => h + 1); last.current = r.hp_left; setB(r); } catch { /* optional widget */ }
  }, []);
  useEffect(() => {
    load(); const t = setInterval(() => { if (!document.hidden) load(); }, 45000);
    const on = (e) => { if (['entity', 'weekly', 'completed'].includes(e.detail?.type)) setTimeout(load, 1500); };
    window.addEventListener('tasky:fun', on);
    return () => { clearInterval(t); window.removeEventListener('tasky:fun', on); };
  }, [load]);
  const claim = async () => {
    setErr('');
    try { await request('POST', '/api/me/boss-claim', { today: today() }); effects.fireworks(); emitFun({ type: 'hatched' }); emitFun({ type: 'birdFlyby', banner: 'Boss defeated!', style: 'loop' }); load(); } catch (e) { setErr(e.message); }
  };
  const pct = b ? Math.round((b.hp_left / b.hp_max) * 100) : 100;
  const three = settings.view3d && hasWebGL();
  return (
    <Panel title="Weekly boss battle" hint="Every finished task hurts the boss. Beat it together for a bonus mystery egg.">
      {b && (
        <div className="flex flex-wrap items-center gap-4">
          {three && <div className="shrink-0 mx-auto"><Suspense fallback={<div style={{ width: 230, height: 200 }} />}><BossStage id={b.boss.id} hp={pct / 100} defeated={b.defeated} hit={hit} calm={settings.anim === 'calm'} /></Suspense></div>}
          <div className="flex-1 min-w-[12rem]">
            <div className="text-lg font-extrabold text-white">{b.boss.name}</div>
            <p className="text-xs text-slate-400 mb-2">{b.boss.tagline}</p>
            <div className="h-4 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-900" role="progressbar" aria-valuemin={0} aria-valuemax={b.hp_max} aria-valuenow={b.hp_left} aria-label="Boss health"><div className="h-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700" style={{ width: `${pct}%` }} /></div>
            <div className="text-xs text-slate-300 mt-1">{b.defeated ? 'Defeated! What a team.' : `${b.hp_left} of ${b.hp_max} health left. ${b.hp_max - b.hp_left} tasks landed so far.`}</div>
            {b.defeated && !b.claimed && <button type="button" onClick={claim} className={`${primary} mt-3`}>Claim the team reward</button>}
            {b.defeated && b.claimed && <div className="text-xs text-emerald-300 mt-2">Reward claimed: a bonus egg is in your nest.</div>}
            <Err text={err} />
          </div>
        </div>
      )}
    </Panel>
  );
}
