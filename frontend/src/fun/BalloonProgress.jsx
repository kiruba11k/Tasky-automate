import React from 'react';

const COLORS = ['#f472b6', '#fb923c', '#facc15', '#34d399', '#60a5fa', '#a78bfa'];

/** A hot-air-balloon meter: the balloon rises through the sky as the goal gets closer. Driven only by real progress. */
export default function BalloonProgress({ value = 0, max = 1, label, text, className = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const done = max > 0 && value >= max;
  const color = COLORS[Math.min(COLORS.length - 1, Math.floor(pct * COLORS.length))];
  return (
    <div className={`balloon-meter ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={label || 'Progress'} aria-valuetext={text ?? `${value} of ${max}`}>
      <div className="flex items-baseline justify-between text-xs mb-0.5">
        <span className="font-bold text-slate-200">{label}</span>
        <span className="font-bold text-white">{text ?? `${value}/${max}`}{done && <span className="ml-1.5 text-emerald-300">Done!</span>}</span>
      </div>
      <div className="balloon-sky">
        <span className="sky-cloud a" /><span className="sky-cloud b" /><span className="sky-cloud c" />
        <div className="balloon-hill" />
        <div className="balloon-rider" style={{ bottom: `${8 + pct * 62}%` }}>
          <svg viewBox="0 0 60 84" width="44" height="62" className={done ? 'balloon-bob fast' : 'balloon-bob'}>
            <path d="M30 4 C8 4 4 26 12 40 C16 47 22 52 24 56 L36 56 C38 52 44 47 48 40 C56 26 52 4 30 4 Z" fill={color} stroke="#0b1220" strokeWidth="3" />
            <path d="M30 4 C22 14 22 40 26 56 M30 4 C38 14 38 40 34 56" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="2.5" />
            <path d="M24 56 L26 66 M36 56 L34 66" stroke="#0b1220" strokeWidth="2.5" />
            <rect x="22" y="66" width="16" height="12" rx="3" fill="#b45309" stroke="#0b1220" strokeWidth="3" />
          </svg>
        </div>
        {done && <span className="balloon-confetti" />}
      </div>
    </div>
  );
}
