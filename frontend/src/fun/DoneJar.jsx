import React, { useEffect, useRef, useState } from 'react';
import { useFun } from './FunProvider';
import { Emoji } from '@/icons/Emoji';

const COLORS = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#a78bfa', '#fb923c'];
const MAX = 21;

/** A glass jar: one marble per task finished today. Dashboard card; also the target of the flying marbles. */
export function Jar({ count, planned = 0, id, hot = false, className = '' }) {
  const shown = Math.min(count, MAX);
  const prev = useRef(shown);
  const marbles = Array.from({ length: shown }, (_, i) => {
    const row = Math.floor(i / 3); const col = i % 3;
    return { i, x: 24 + col * 17 + (row % 2 ? 8 : 0), y: 112 - row * 15, c: COLORS[i % COLORS.length] };
  });
  useEffect(() => { prev.current = shown; });
  return (
    <svg id={id} viewBox="0 0 100 130" className={`${className} ${hot ? 'jar-hot' : ''}`} role="img" aria-label={`${count} tasks finished today`}>
      <defs><clipPath id={`jc-${id || 'x'}`}><path d="M22 28 Q20 30 20 36 L18 112 Q18 122 28 122 L72 122 Q82 122 82 112 L80 36 Q80 30 78 28 Z" /></clipPath></defs>
      <path d="M22 28 Q20 30 20 36 L18 112 Q18 122 28 122 L72 122 Q82 122 82 112 L80 36 Q80 30 78 28 Z" fill="rgba(186,230,253,.12)" />
      <g clipPath={`url(#jc-${id || 'x'})`}>
        {marbles.map((m) => (
          <g key={m.i} className={m.i >= prev.current ? 'marble-drop' : ''}>
            <circle cx={m.x} cy={m.y} r="7.6" fill={m.c} stroke="#0b1220" strokeWidth="1.6" />
            <circle cx={m.x - 2.4} cy={m.y - 2.6} r="2" fill="#fff" opacity=".7" />
          </g>
        ))}
      </g>
      <path d="M22 28 Q20 30 20 36 L18 112 Q18 122 28 122 L72 122 Q82 122 82 112 L80 36 Q80 30 78 28" fill="none" stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 44 L25 96" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".45" />
      <rect x="24" y="16" width="52" height="12" rx="5" fill="#fbbf24" stroke="#0b1220" strokeWidth="2.5" />
      <rect x="28" y="10" width="44" height="8" rx="4" fill="#f59e0b" stroke="#0b1220" strokeWidth="2.5" />
      {planned > 0 && <line x1="20" x2="80" y1={122 - Math.min(1, planned / MAX) * 90} y2={122 - Math.min(1, planned / MAX) * 90} stroke="#fde047" strokeWidth="1.5" strokeDasharray="4 3" opacity=".8" />}
    </svg>
  );
}

export default function DoneJar() {
  const { stats } = useFun();
  const [bump, setBump] = useState(0);
  const last = useRef(null);
  const done = stats?.completed_today || 0;
  useEffect(() => { if (last.current !== null && done > last.current) setBump((b) => b + 1); last.current = done; }, [done]);
  return (
    <div className="glass-effect-enhanced rounded-2xl p-5 flex items-center gap-4">
      <div key={bump} className={bump ? 'jar-wobble' : ''}><Jar id="done-jar" count={done} planned={stats?.planned_today || 0} className="w-24 h-28" /></div>
      <div>
        <h3 className="text-xl font-extrabold text-white">Done jar <Emoji e="🫙" size="1.2em" /></h3>
        <p className="text-sm text-slate-300">{done === 0 ? 'Empty so far. Finish a task and drop in the first marble!' : `${done} marble${done === 1 ? '' : 's'} today${stats?.planned_today ? ` of ${stats.planned_today} planned` : ''}.`}</p>
        <p className="text-[11px] text-slate-500 mt-1">Tip: on Daily Tasks, drag a task card's grip onto the jar to finish it.</p>
      </div>
    </div>
  );
}
