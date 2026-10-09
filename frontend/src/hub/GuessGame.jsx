import React, { useState } from 'react';
import { request } from '@/api/client';
import { effects } from '@/fun/effects';
import { Err, Panel, primary, subtle } from './ui';

/** Guess the colleague: who shared this fun fact? (Add yours in the level chip's settings.) */
export default function GuessGame() {
  const [round, setRound] = useState(null); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [score, setScore] = useState(0);
  const start = async () => { setErr(''); setRes(null); try { setRound(await request('GET', '/api/guess/round')); } catch (e) { setErr(e.message); } };
  const pick = async (id) => {
    try { const r = await request('POST', '/api/guess/answer', { token: round.token, choice: id, options: round.options.map((o) => o.id) }); setRes({ ...r, choice: id }); if (r.correct) { setScore((s) => s + 1); effects.stars(); } } catch (e) { setErr(e.message); }
  };
  return (
    <Panel title="Guess the colleague" hint="Fun facts shared by teammates. Who is it?" right={<span className="text-xs font-bold text-emerald-300">Score {score}</span>}>
      {!round ? <button type="button" onClick={start} className={primary}>Play a round</button>
        : round.available === false ? <p className="text-sm text-slate-400">Not enough fun facts yet. Add yours in the level chip settings and ask teammates to add theirs.</p>
        : (
          <>
            <blockquote className="rounded-xl bg-slate-800/70 p-3 text-white font-semibold mb-2">“{round.fact}”</blockquote>
            <div className="grid grid-cols-2 gap-2">
              {round.options.map((o) => <button key={o.id} type="button" disabled={Boolean(res)} onClick={() => pick(o.id)} className={`rounded-xl border-2 border-slate-900 px-3 py-2 text-sm font-bold ${res && o.name === res.answer ? 'bg-emerald-400 text-ink' : res && res.choice === o.id ? 'bg-red-400 text-ink' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}>{o.name}</button>)}
            </div>
            {res && <div className="mt-2 flex items-center gap-3"><span className="text-sm text-slate-200">{res.correct ? 'You got it!' : `It was ${res.answer}.`}</span><button type="button" onClick={start} className={subtle}>Next round</button></div>}
          </>
        )}
      <Err text={err} />
    </Panel>
  );
}
