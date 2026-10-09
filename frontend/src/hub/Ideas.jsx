import React, { useCallback, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { emitFun } from '@/fun/bus';
import { Emoji } from '@/icons/Emoji';
import { Err, Panel, field, primary } from './ui';

/** Idea box: pitch an idea (anonymously or by name) and boost the ones you like with a bird. */
export default function Ideas() {
  const [list, setList] = useState([]);
  const [t, setT] = useState(''); const [x, setX] = useState(''); const [anon, setAnon] = useState(true); const [err, setErr] = useState('');
  const load = useCallback(() => request('GET', '/api/ideas').then(setList).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => { setErr(''); try { await request('POST', '/api/ideas', { title: t, text: x, anonymous: anon }); setT(''); setX(''); load(); } catch (e) { setErr(e.message); } };
  const boost = async (id, voted) => { await request('POST', `/api/ideas/${id}/boost`); if (!voted) emitFun({ type: 'birdFlyby', banner: 'Idea boosted!', style: 'loop' }); load(); };
  return (
    <Panel title="Idea box" hint="Boost an idea with a bird. The most boosted ideas rise to the top.">
      <div className="grid sm:grid-cols-[1fr_1.4fr_auto] gap-2 mb-2">
        <input value={t} onChange={(e) => setT(e.target.value.slice(0, 80))} placeholder="Your idea in a few words" aria-label="Idea title" className={field} />
        <input value={x} onChange={(e) => setX(e.target.value.slice(0, 400))} placeholder="Details (optional)" aria-label="Idea details" className={field} />
        <button type="button" onClick={add} disabled={!t.trim()} className={primary}>Pitch it</button>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300 mb-2"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />Post anonymously</label>
      <Err text={err} />
      <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {list.length === 0 && <li className="text-sm text-slate-500 py-3 text-center">No ideas yet. What would make work better?</li>}
        {list.map((i) => (
          <li key={i.id} className="flex items-start gap-2 rounded-xl bg-slate-800/60 px-3 py-2">
            <button type="button" onClick={() => boost(i.id, i.voted)} aria-pressed={i.voted} aria-label={`Boost this idea (${i.votes})`} className={`shrink-0 rounded-lg border-2 border-slate-900 px-2 py-1 text-center ${i.voted ? 'bg-sky-400 text-ink' : 'bg-slate-700 text-slate-200'}`}><Emoji e="🕊" size="1.1rem" /><div className="text-xs font-extrabold">{i.votes}</div></button>
            <div className="min-w-0 flex-1"><div className="font-bold text-white">{i.title}</div>{i.text && <p className="text-sm text-slate-300 break-words">{i.text}</p>}<div className="text-[11px] text-slate-500">{i.author || 'Anonymous'}</div></div>
            {i.mine && <button type="button" aria-label="Delete my idea" onClick={async () => { await request('DELETE', `/api/ideas/${i.id}`); load(); }} className="text-slate-500 hover:text-red-400 text-xs">remove</button>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
