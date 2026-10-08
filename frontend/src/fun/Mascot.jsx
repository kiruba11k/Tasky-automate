import React from 'react';

const MOUTHS = {
  happy: <path d="M42 52 Q50 60 58 52" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />,
  wave: <path d="M42 52 Q50 60 58 52" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />,
  wink: <path d="M41 51 Q50 62 59 51" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />,
  cheer: (
    <g>
      <path d="M40 49 Q50 68 60 49 Z" fill="#7f1d1d" stroke="#0b1220" strokeWidth="3" strokeLinejoin="round" />
      <path d="M45 58 Q50 54 55 58 Q50 63 45 58 Z" fill="#fb7185" />
    </g>
  ),
  think: <ellipse cx="54" cy="55" rx="3.2" ry="3.8" fill="#0b1220" />,
  oops: <path d="M43 57 Q50 49 57 57" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />,
  sleep: <path d="M45 54 Q50 58 55 54" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />,
};

/**
 * Tasky, the TaskFlow mascot. Moods: happy, wave, wink, cheer, think, oops, sleep.
 * Pure SVG + CSS animation (see index.css), so it costs nothing to render.
 */
export default function Mascot({ mood = 'happy', size = 80, className = '', title }) {
  const asleep = mood === 'sleep';
  const cheering = mood === 'cheer';
  const gaze = mood === 'think' ? { x: 1.8, y: -2 } : { x: 0, y: 0 };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title || `Tasky the mascot looks ${mood}`} className={`tasky ${className}`}>
      <defs>
        <linearGradient id="tasky-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--mascot-a, #34d399)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mascot-b, #3b82f6)' }} />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="95" rx="26" ry="4" fill="#000" opacity=".25" />
      {/* feet */}
      <ellipse cx="34" cy="90" rx="10" ry="5.5" fill="#0f766e" stroke="#0b1220" strokeWidth="3" />
      <ellipse cx="66" cy="90" rx="10" ry="5.5" fill="#0f766e" stroke="#0b1220" strokeWidth="3" />
      {/* antenna */}
      <path d="M50 22 Q47 12 52 7" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />
      <circle cx="52" cy="6" r="4.5" fill="#facc15" stroke="#0b1220" strokeWidth="3" className="tasky-glow" />
      {/* arms (behind body so hands peek out) */}
      <g className={cheering ? 'tasky-arm-up-l' : mood === 'wave' ? '' : 'tasky-arm-l'} style={{ transformOrigin: '18px 58px' }}>
        <path d="M18 58 Q6 60 5 70" fill="none" stroke="#0b1220" strokeWidth="9" strokeLinecap="round" />
        <path d="M18 58 Q6 60 5 70" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className={cheering ? 'tasky-arm-up-r' : mood === 'wave' ? 'tasky-wave' : 'tasky-arm-r'} style={{ transformOrigin: '82px 58px' }}>
        <path d="M82 58 Q94 60 95 70" fill="none" stroke="#0b1220" strokeWidth="9" strokeLinecap="round" />
        <path d="M82 58 Q94 60 95 70" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* body */}
      <rect x="16" y="20" width="68" height="68" rx="28" fill="url(#tasky-body)" stroke="#0b1220" strokeWidth="3.5" />
      <path d="M26 30 Q34 24 44 25" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".45" />
      {/* belly check */}
      <path d="M38 68 l9 9 l17 -19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      {/* eyes */}
      {asleep ? (
        <g fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round">
          <path d="M31 43 Q38 48 45 43" />
          <path d="M55 43 Q62 48 69 43" />
        </g>
      ) : (
        <g className="tasky-eyes">
          <circle cx="38" cy="42" r="8.5" fill="#fff" stroke="#0b1220" strokeWidth="3" />
          {mood === 'wink'
            ? <path d="M55 43 Q62 38 69 43" fill="none" stroke="#0b1220" strokeWidth="3" strokeLinecap="round" />
            : <circle cx="62" cy="42" r="8.5" fill="#fff" stroke="#0b1220" strokeWidth="3" />}
          <circle cx={39 + gaze.x} cy={43 + gaze.y} r="4" fill="#0b1220" />
          {mood !== 'wink' && <circle cx={63 + gaze.x} cy={43 + gaze.y} r="4" fill="#0b1220" />}
          <circle cx={40 + gaze.x} cy={41.5 + gaze.y} r="1.3" fill="#fff" />
        </g>
      )}
      {/* cheeks + mouth */}
      <circle cx="27" cy="53" r="4.5" fill="#fb7185" opacity=".55" />
      <circle cx="73" cy="53" r="4.5" fill="#fb7185" opacity=".55" />
      {MOUTHS[mood] || MOUTHS.happy}
      {mood === 'oops' && <path d="M78 30 q4 6 0 10 q-4 -4 0 -10 z" fill="#7dd3fc" stroke="#0b1220" strokeWidth="1.5" />}
      {asleep && (
        <g fontFamily="inherit" fontWeight="800" fill="#e0f2fe" stroke="#0b1220" strokeWidth=".8">
          <text x="74" y="22" fontSize="11" className="tasky-zzz">z</text>
          <text x="82" y="12" fontSize="8" className="tasky-zzz tasky-zzz-2">z</text>
        </g>
      )}
    </svg>
  );
}
