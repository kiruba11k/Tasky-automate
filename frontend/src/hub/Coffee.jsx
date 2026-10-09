import React, { useCallback, useEffect, useState } from 'react';
import { Coffee as Cup } from 'lucide-react';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { effects } from '@/fun/effects';
import { Panel, primary, subtle } from './ui';

/** Coffee roulette: opt in for the week, get paired with a teammate for a relaxed 15-minute chat. */
export default function Coffee() {
  const ws = mondayOf();
  const [d, setD] = useState(null);
  const [reveal, setReveal] = useState(false);
  const load = useCallback(() => request('GET', `/api/coffee?week_start=${ws}`).then(setD).catch(() => {}), [ws]);
  useEffect(() => { load(); }, [load]);
  const join = async () => { await request('POST', '/api/coffee', { week_start: ws }); await load(); };
  const leave = async () => { await request('POST', '/api/coffee', { week_start: ws, leave: true }); setReveal(false); await load(); };
  const show = () => { setReveal(true); effects.stars(); };
  return (
    <Panel title="Coffee roulette" hint="Opt in for the week and meet someone new for a 15-minute chat. It is just coffee, no agenda.">
      {!d ? null : !d.joined ? (
        <button type="button" onClick={join} className={primary}><Cup className="inline w-4 h-4 mr-1" />Count me in this week</button>
      ) : (
        <div>
          <p className="text-sm text-slate-300 mb-2">You are in! {d.pool} {d.pool === 1 ? 'person has' : 'people have'} joined so far.</p>
          {d.match ? (
            reveal ? (
              <div className="coffee-reveal rounded-xl bg-amber-500/15 border border-amber-400/40 p-3 text-center"><div className="text-xs text-amber-200">Your coffee buddy is…</div><div className="text-xl font-extrabold text-white">{d.match.map((m) => m.name).join(' & ')}</div><div className="text-xs text-slate-300 mt-1">Grab a coffee together this week!</div></div>
            ) : <button type="button" onClick={show} className={primary}>Reveal my match</button>
          ) : <p className="text-sm text-slate-400">Waiting for one more person so you can be paired.</p>}
          <button type="button" onClick={leave} className={`${subtle} mt-3`}>Leave this week</button>
        </div>
      )}
    </Panel>
  );
}
