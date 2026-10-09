import React, { useEffect, useMemo, useState } from 'react';
import { effects } from '@/fun/effects';
import { Panel, subtle } from './ui';

const ITEMS = ['A meeting that could have been an email', 'Someone is on mute', '"Can you see my screen?"', 'Coffee refill number three', 'A surprise deadline', 'Someone says "circle back"', 'Lost a tab among 40', 'Camera is off for everyone', 'Tried turning it off and on again', 'Someone says "quick question"', 'A great idea in the shower', 'Typo found after sending', 'Snack run', 'Unread messages: lots', 'Someone shares a pet photo', '"Let\'s take this offline"', 'Wi-Fi hiccup', 'A very long to-do list', 'Finished early (!)', 'Someone brings sweets', 'Sticky note rescue', 'Lunch debate: where?', 'A friendly high-five', 'Calendar double-booked'];
const KEY = 'tasky_bingo';
const LINES = [...Array(5)].flatMap((_, i) => [[0, 1, 2, 3, 4].map((k) => i * 5 + k), [0, 1, 2, 3, 4].map((k) => k * 5 + i)]).concat([[0, 6, 12, 18, 24], [4, 8, 12, 16, 20]]);
const deal = () => { const a = [...ITEMS].sort(() => Math.random() - 0.5).slice(0, 24); a.splice(12, 0, 'FREE'); return a; };

/** Work bingo: tick the light-hearted office moments you spot this week. */
export default function Bingo() {
  const [card, setCard] = useState(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v?.card?.length === 25 ? v : { card: deal(), marked: [12] }; } catch { return { card: deal(), marked: [12] }; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(card)); } catch { /* ignore */ } }, [card]);
  const wins = useMemo(() => LINES.filter((l) => l.every((i) => card.marked.includes(i))), [card.marked]);
  const [seen, setSeen] = useState(wins.length);
  useEffect(() => { if (wins.length > seen) effects.big(); setSeen(wins.length); }, [wins.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (i) => i !== 12 && setCard((c) => ({ ...c, marked: c.marked.includes(i) ? c.marked.filter((x) => x !== i) : [...c.marked, i] }));
  return (
    <Panel title="Work bingo" hint="Tick what you spot. Five in a row is a bingo." right={<button type="button" onClick={() => setCard({ card: deal(), marked: [12] })} className={subtle}>New card</button>}>
      <div className="grid grid-cols-5 gap-1.5" role="grid" aria-label="Bingo card">
        {card.card.map((t, i) => {
          const on = card.marked.includes(i); const win = wins.some((l) => l.includes(i));
          return <button key={i} type="button" role="gridcell" aria-pressed={on} onClick={() => toggle(i)} className={`aspect-square rounded-lg border-2 border-slate-900 p-1 text-[10px] sm:text-[11px] leading-tight font-bold flex items-center justify-center text-center ${win ? 'bg-yellow-300 text-ink bingo-win' : on ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>{t}</button>;
        })}
      </div>
      {wins.length > 0 && <p className="text-center font-extrabold text-yellow-300 mt-2">BINGO! {wins.length > 1 ? `${wins.length} lines!` : ''}</p>}
    </Panel>
  );
}
