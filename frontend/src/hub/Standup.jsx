import React, { useCallback, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { emitFun } from '@/fun/bus';
import { Err, Panel, field, primary, today } from './ui';

/** Standup bird: three short lines, delivered to the team by a bird. */
export default function Standup() {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ yesterday: '', today: '', blockers: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => request('GET', `/api/standups?today=${today()}`).then((l) => { setList(l); const mine = l.find((s) => s.mine); if (mine) setF({ yesterday: mine.yesterday, today: mine.today, blockers: mine.blockers }); }).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const send = async () => {
    setBusy(true); setErr('');
    try { await request('POST', '/api/standups', { yesterday: f.yesterday, today: f.today, blockers: f.blockers }); emitFun({ type: 'birdFlyby', banner: 'Standup delivered!', style: 'cross' }); load(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const rows = [['yesterday', 'Yesterday I…'], ['today', 'Today I will…'], ['blockers', 'Blocked by… (optional)']];
  return (
    <Panel title="Standup bird" hint="Three short lines. A bird delivers them to the whole team.">
      <div className="grid md:grid-cols-3 gap-2">
        {rows.map(([k, label]) => <label key={k} className="text-xs font-bold text-slate-300">{label}<textarea value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.slice(0, 300) })} rows={3} className={`${field} mt-1 font-normal`} /></label>)}
      </div>
      <div className="mt-2"><button type="button" onClick={send} disabled={busy || !(f.yesterday || f.today || f.blockers)} className={primary}>{list.some((s) => s.mine) ? 'Update my standup' : 'Send by bird'}</button></div>
      <Err text={err} />
      <ul className="mt-4 grid md:grid-cols-2 gap-2">
        {list.length === 0 && <li className="text-sm text-slate-500">Nobody has posted yet today.</li>}
        {list.map((s) => (
          <li key={s.id} className="rounded-xl bg-slate-800/60 p-3 text-sm">
            <div className="font-extrabold text-white mb-1">{s.name}{s.mine ? ' (you)' : ''}</div>
            {s.yesterday && <p className="text-slate-300"><b className="text-slate-400">Yesterday:</b> {s.yesterday}</p>}
            {s.today && <p className="text-slate-300"><b className="text-slate-400">Today:</b> {s.today}</p>}
            {s.blockers && <p className="text-amber-300"><b>Blocked:</b> {s.blockers}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
