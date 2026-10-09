import React, { useCallback, useEffect, useState } from 'react';
import { request } from '@/api/client';
import { effects } from '@/fun/effects';
import { Err, Panel, today } from './ui';

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const COLORS = { g: 'bg-emerald-500 text-white', y: 'bg-amber-400 text-ink', b: 'bg-slate-600 text-white' };

/** Daily word: guess the five-letter word in six tries. The same word for everyone, every day. */
export default function WordGame() {
  const [s, setS] = useState(null); const [cur, setCur] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(() => request('GET', `/api/word/today?today=${today()}`).then(setS).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const submit = useCallback(async () => {
    if (cur.length !== 5) return;
    setErr('');
    try { const r = await request('POST', '/api/word/guess', { word: cur, today: today() }); setS(r); setCur(''); if (r.solved) effects.big(); } catch (e) { setErr(e.message); }
  }, [cur]);
  const type = useCallback((k) => { if (!s || s.done) return; if (k === 'enter') submit(); else if (k === 'back') setCur((c) => c.slice(0, -1)); else if (/^[a-z]$/.test(k)) setCur((c) => (c.length < 5 ? c + k : c)); }, [s, submit]);
  useEffect(() => {
    const on = (e) => { if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return; const k = e.key === 'Enter' ? 'enter' : e.key === 'Backspace' ? 'back' : e.key.toLowerCase(); if (k === 'enter' || k === 'back' || /^[a-z]$/.test(k)) type(k); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [type]);
  const used = {}; (s?.guesses || []).forEach((g) => [...g.word].forEach((ch, i) => { const m = g.marks[i]; if (!used[ch] || m === 'g' || (m === 'y' && used[ch] === 'b')) used[ch] = m; }));
  const rows = Array.from({ length: 6 }, (_, r) => (s?.guesses[r] ? { word: s.guesses[r].word, marks: s.guesses[r].marks } : r === (s?.guesses.length || 0) && !s?.done ? { word: cur.padEnd(5, ' '), marks: null } : { word: '     ', marks: null }));
  return (
    <Panel title="Daily word" hint={s ? `${s.team_solved} teammate${s.team_solved === 1 ? '' : 's'} solved today's word.` : ''}>
      <div className="grid gap-1.5 w-fit mx-auto" aria-label="Word grid">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-1.5">
            {[...r.word].map((ch, k) => <div key={k} className={`word-tile ${r.marks ? `${COLORS[r.marks[k]]} word-flip` : 'bg-slate-800 text-white'}`} style={{ animationDelay: `${k * 120}ms` }}>{ch.trim().toUpperCase()}</div>)}
          </div>
        ))}
      </div>
      {s?.done && <p className="text-center text-sm text-slate-200 mt-2">{s.solved ? 'You solved it! Come back tomorrow for a new word.' : `The word was ${s.answer.toUpperCase()}. Try again tomorrow!`}</p>}
      <Err text={err} />
      <div className="mt-3 space-y-1.5" aria-label="Keyboard">
        {ROWS.map((row, ri) => (
          <div key={row} className="flex justify-center gap-1">
            {ri === 2 && <button type="button" onClick={() => type('enter')} className="word-key px-2 bg-emerald-500 text-ink">Enter</button>}
            {[...row].map((k) => <button key={k} type="button" onClick={() => type(k)} className={`word-key ${used[k] ? COLORS[used[k]] : 'bg-slate-700 text-white'}`}>{k.toUpperCase()}</button>)}
            {ri === 2 && <button type="button" onClick={() => type('back')} aria-label="Backspace" className="word-key px-2 bg-slate-600 text-white">⌫</button>}
          </div>
        ))}
      </div>
    </Panel>
  );
}
