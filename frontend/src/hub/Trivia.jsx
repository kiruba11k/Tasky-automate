import React, { useCallback, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { effects } from '@/fun/effects';
import { Err, Panel, today } from './ui';

/** One trivia question a day. */
export default function Trivia() {
  const [q, setQ] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => request('GET', `/api/trivia/today?today=${today()}`).then(setQ).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const answer = async (i) => {
    try { const r = await request('POST', '/api/trivia/answer', { choice: i, today: today() }); setQ((x) => ({ ...x, answered: true, choice: i, correct_index: r.correct_index })); if (r.correct) effects.stars(); } catch (e) { setErr(e.message); }
  };
  return (
    <Panel title="Trivia of the day" hint="One question, one try. Just for fun.">
      {q && (
        <>
          <p className="font-bold text-white mb-2">{q.question}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {q.options.map((o, i) => {
              const right = q.answered && i === q.correct_index; const wrong = q.answered && q.choice === i && i !== q.correct_index;
              return <button key={o} type="button" disabled={q.answered} onClick={() => answer(i)} className={`rounded-xl border-2 border-slate-900 px-3 py-2 text-left text-sm font-bold ${right ? 'bg-emerald-400 text-ink' : wrong ? 'bg-red-400 text-ink' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'}`}>{o}</button>;
            })}
          </div>
          {q.answered && <p className="text-sm text-slate-300 mt-2">{q.choice === q.correct_index ? 'Correct! Nicely done.' : 'Not this time. A new question arrives tomorrow.'}</p>}
        </>
      )}
      <Err text={err} />
    </Panel>
  );
}
