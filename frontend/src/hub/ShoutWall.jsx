import React, { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Trash2 } from 'lucide-react';
import { request } from '@/api/client';
import { effects } from '@/fun/effects';
import { Err, Panel, field, primary } from './ui';

/** Shout-out wall: public, named thank-yous. It celebrates kindness, so there is no ranking. */
export default function ShoutWall() {
  const [data, setData] = useState({ items: [], week_count: 0 });
  const [people, setPeople] = useState([]);
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => request('GET', '/api/shoutouts').then(setData).catch(() => {}), []);
  useEffect(() => { load(); request('GET', '/api/birds/recipients').then(setPeople).catch(() => {}); const t = setInterval(() => { if (!document.hidden) load(); }, 45000); return () => clearInterval(t); }, [load]);
  const send = async () => {
    setBusy(true); setErr('');
    try { await request('POST', '/api/shoutouts', { to_user_id: to, text }); setText(''); effects.stars(); load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Panel title="Shout-out wall" hint={`${data.week_count} thank-you${data.week_count === 1 ? '' : 's'} shared this week. Everyone can see these, so keep them kind.`}>
      <div className="grid sm:grid-cols-[12rem_1fr_auto] gap-2 mb-3">
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Who do you appreciate?" className={field}>
          <option value="">Who?</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input value={text} onChange={(e) => setText(e.target.value.slice(0, 140))} placeholder="Thanks for…" aria-label="Your shout-out" className={field} />
        <button type="button" onClick={send} disabled={!to || !text.trim() || busy} className={primary}>Shout!</button>
      </div>
      <Err text={err} />
      <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {data.items.length === 0 && <li className="text-sm text-slate-500 py-4 text-center">No shout-outs yet. Be the first to say thanks!</li>}
        {data.items.map((s) => (
          <li key={s.id} className="win-item flex items-start gap-2 rounded-xl bg-slate-800/60 px-3 py-2 text-sm">
            <Heart className="w-4 h-4 mt-0.5 text-pink-400 shrink-0" />
            <span className="flex-1 min-w-0"><b className="text-white">{s.from}</b> <span className="text-slate-300">to</span> <b className="text-yellow-300">{s.to}</b>: <span className="text-slate-200 break-words">{s.text}</span> <span className="text-[11px] text-slate-500 whitespace-nowrap">{formatDistanceToNow(new Date(s.created_date), { addSuffix: true })}</span></span>
            {s.mine && <button type="button" aria-label="Delete my shout-out" onClick={async () => { await request('DELETE', `/api/shoutouts/${s.id}`); load(); }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
