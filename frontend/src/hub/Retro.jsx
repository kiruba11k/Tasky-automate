import React, { useCallback, useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { Err, Panel, field, primary } from './ui';

const COLS = [['well', 'Went well', 'bg-emerald-200', 'text-emerald-900'], ['improve', 'Could be better', 'bg-amber-200', 'text-amber-900'], ['thanks', 'Thank-yous', 'bg-pink-200', 'text-pink-900']];

/** Retro board: anonymous sticky notes that fly in; drop a heart on the ones you agree with. */
export default function Retro() {
  const ws = mondayOf();
  const [cols, setCols] = useState({ well: [], improve: [], thanks: [] });
  const [draft, setDraft] = useState({ well: '', improve: '', thanks: '' });
  const [err, setErr] = useState('');
  const load = useCallback(() => request('GET', `/api/retro?week_start=${ws}`).then((r) => setCols(r.columns)).catch(() => {}), [ws]);
  useEffect(() => { load(); const t = setInterval(() => { if (!document.hidden) load(); }, 30000); return () => clearInterval(t); }, [load]);
  const add = async (column) => {
    setErr('');
    try { await request('POST', '/api/retro', { week_start: ws, column, text: draft[column] }); setDraft((d) => ({ ...d, [column]: '' })); load(); } catch (e) { setErr(e.message); }
  };
  const vote = async (id) => { await request('POST', `/api/retro/${id}/vote`); load(); };
  return (
    <Panel title="Retro board" hint="This week's notes. Nobody's name is shown on a note.">
      <Err text={err} />
      <div className="grid md:grid-cols-3 gap-3">
        {COLS.map(([id, label, bg, fg]) => (
          <div key={id} className="rounded-xl bg-slate-800/50 p-2.5">
            <div className="font-extrabold text-white text-sm mb-2">{label}</div>
            <div className="space-y-2 min-h-[4rem]">
              {cols[id].map((n, i) => (
                <div key={n.id} className={`sticky-note ${bg} ${fg}`} style={{ '--tilt': `${((i * 7) % 5) - 2}deg` }}>
                  <p className="text-sm font-semibold break-words">{n.text}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <button type="button" onClick={() => vote(n.id)} aria-pressed={n.voted} aria-label={`Heart this note (${n.votes})`} className={`flex items-center gap-1 text-xs font-bold ${n.voted ? 'text-red-600' : 'opacity-70 hover:opacity-100'}`}><Heart className={`w-3.5 h-3.5 ${n.voted ? 'fill-current heart-pop' : ''}`} />{n.votes}</button>
                    {n.mine && <button type="button" aria-label="Delete my note" onClick={async () => { await request('DELETE', `/api/retro/${n.id}`); load(); }} className="opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input value={draft[id]} onChange={(e) => setDraft({ ...draft, [id]: e.target.value.slice(0, 200) })} onKeyDown={(e) => e.key === 'Enter' && draft[id].trim() && add(id)} placeholder="Add a note…" aria-label={`Add a note to ${label}`} className={`${field} py-1.5`} />
              <button type="button" onClick={() => add(id)} disabled={!draft[id].trim()} className={`${primary} px-2`}>+</button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
