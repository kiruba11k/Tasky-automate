import React from 'react';

const OUT = '#0b1220';
const FUR = '#94a3b8';
const FUR_DARK = '#64748b';
const BELLY = '#e2e8f0';
const PINK = '#fda4af';

/**
 * Whiskers, an original cartoon cat (faces right). Poses: run | sit | sleep | dizzy | surprised.
 * Pure SVG + CSS (see index.css .crit-*), so it costs almost nothing to render.
 */
export function Cat({ pose = 'sit', size = 90, className = '', flip = false }) {
  const run = pose === 'run';
  const sleep = pose === 'sleep';
  return (
    <svg viewBox="0 0 140 100" width={size * 1.4} height={size} className={`crit ${run ? 'crit-run' : ''} ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <ellipse cx="68" cy="95" rx="46" ry="4.5" fill="#000" opacity=".22" />
      <g className={sleep ? '' : 'crit-body'}>
        {/* tail */}
        <g className={sleep ? '' : 'crit-tail'} style={{ transformOrigin: '26px 58px' }}>
          <path d="M26 60 C4 60 0 34 16 26 C26 22 31 30 23 35 C16 40 22 50 34 56" fill="none" stroke={OUT} strokeWidth="11" strokeLinecap="round" />
          <path d="M26 60 C4 60 0 34 16 26 C26 22 31 30 23 35 C16 40 22 50 34 56" fill="none" stroke={FUR} strokeWidth="5.5" strokeLinecap="round" />
        </g>
        {/* far legs */}
        {!sleep && (
          <g>
            <rect className="crit-leg-b" x="40" y="62" width="11" height="26" rx="5.5" fill={FUR_DARK} stroke={OUT} strokeWidth="3" />
            <rect className="crit-leg-a" x="84" y="62" width="11" height="26" rx="5.5" fill={FUR_DARK} stroke={OUT} strokeWidth="3" />
          </g>
        )}
        {/* body */}
        <path d={sleep ? 'M22 78 Q16 52 52 48 Q92 44 100 66 Q104 84 62 86 Q26 88 22 78 Z' : 'M24 62 Q20 34 54 31 Q92 29 98 52 Q101 72 64 74 Q28 76 24 62 Z'} fill={FUR} stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
        <path d={sleep ? 'M40 82 Q60 90 84 82 Q70 76 40 82 Z' : 'M40 68 Q62 78 86 68 Q70 62 40 68 Z'} fill={BELLY} opacity=".9" />
        <path d={sleep ? 'M44 52 l-3 9 M56 49 l-2 10 M68 48 l-1 10' : 'M44 34 l-3 10 M56 31 l-2 11 M68 30 l-1 11'} stroke={FUR_DARK} strokeWidth="4" strokeLinecap="round" />
        {/* near legs */}
        {!sleep && (
          <g>
            <rect className="crit-leg-a" x="32" y="62" width="12" height="27" rx="6" fill={FUR} stroke={OUT} strokeWidth="3.5" />
            <rect className="crit-leg-b" x="74" y="62" width="12" height="27" rx="6" fill={FUR} stroke={OUT} strokeWidth="3.5" />
            <ellipse cx="38" cy="89" rx="8" ry="4" fill={BELLY} stroke={OUT} strokeWidth="3" className="crit-leg-a" />
            <ellipse cx="80" cy="89" rx="8" ry="4" fill={BELLY} stroke={OUT} strokeWidth="3" className="crit-leg-b" />
          </g>
        )}
        {/* head */}
        <g transform={sleep ? 'translate(2 26) rotate(8 104 44)' : undefined}>
          <path d="M88 30 L90 6 L108 22 Z" fill={FUR} stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M92 24 L93 13 L101 21 Z" fill={PINK} />
          <path d="M106 22 L124 6 L126 32 Z" fill={FUR} stroke={OUT} strokeWidth="3.5" strokeLinejoin="round" className={run ? 'crit-ear' : ''} />
          <path d="M110 24 L121 14 L122 28 Z" fill={PINK} />
          <ellipse cx="105" cy="45" rx="23" ry="21" fill={FUR} stroke={OUT} strokeWidth="3.5" />
          <ellipse cx="114" cy="54" rx="12" ry="9" fill={BELLY} />
          {pose === 'dizzy' ? (
            <g stroke={OUT} strokeWidth="2.6" fill="none" strokeLinecap="round">
              <path d="M92 41 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" />
              <path d="M110 41 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" />
            </g>
          ) : sleep ? (
            <g fill="none" stroke={OUT} strokeWidth="3" strokeLinecap="round"><path d="M92 44 Q98 49 104 44" /><path d="M110 44 Q116 49 122 44" /></g>
          ) : (
            <g className="crit-eyes">
              <ellipse cx="97" cy="42" rx="6" ry={pose === 'surprised' ? 8 : 7} fill="#fff" stroke={OUT} strokeWidth="2.5" />
              <ellipse cx="115" cy="42" rx="6" ry={pose === 'surprised' ? 8 : 7} fill="#fff" stroke={OUT} strokeWidth="2.5" />
              <circle cx={run ? 100 : 99} cy="43" r={pose === 'surprised' ? 2.2 : 3.2} fill={OUT} />
              <circle cx={run ? 118 : 117} cy="43" r={pose === 'surprised' ? 2.2 : 3.2} fill={OUT} />
              <circle cx={run ? 101 : 100} cy="41.5" r="1" fill="#fff" />
              {run && <path d="M90 33 L104 38 M122 38 L108 33" stroke={OUT} strokeWidth="3" strokeLinecap="round" />}
            </g>
          )}
          <path d="M117 50 L125 50 L121 56 Z" fill="#f472b6" stroke={OUT} strokeWidth="2" strokeLinejoin="round" />
          <path d="M121 56 Q121 61 116 61 M121 56 Q121 61 127 60" fill="none" stroke={OUT} strokeWidth="2.2" strokeLinecap="round" />
          <g stroke={OUT} strokeWidth="1.8" strokeLinecap="round"><path d="M126 53 L139 49" /><path d="M126 56 L140 56" /><path d="M95 56 L83 53" /><path d="M95 59 L82 60" /></g>
        </g>
      </g>
      {sleep && <g fontFamily="inherit" fontWeight="800" fill="#e0f2fe" stroke={OUT} strokeWidth=".8"><text x="116" y="26" fontSize="14" className="tasky-zzz">z</text><text x="126" y="14" fontSize="10" className="tasky-zzz tasky-zzz-2">z</text></g>}
      {pose === 'dizzy' && (
        <g className="crit-stars" style={{ transformOrigin: '105px 14px' }}>
          {[0, 120, 240].map((a) => <text key={a} x="105" y="14" fontSize="14" textAnchor="middle" fill="#facc15" stroke={OUT} strokeWidth=".9" transform={`rotate(${a} 105 14) translate(0 -4)`}>★</text>)}
        </g>
      )}
    </svg>
  );
}

/** Squeak, an original cartoon mouse (faces right). Poses: run | sit | cheer | scared. */
export function Mouse({ pose = 'sit', size = 60, className = '', flip = false }) {
  const run = pose === 'run' || pose === 'scared';
  return (
    <svg viewBox="0 0 100 64" width={size * 1.5} height={size} className={`crit ${run ? 'crit-run' : ''} ${className}`} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden="true">
      <ellipse cx="46" cy="60" rx="30" ry="3.2" fill="#000" opacity=".2" />
      <g className="crit-body">
        <g className="crit-tail" style={{ transformOrigin: '20px 44px' }}>
          <path d="M20 44 C2 46 -2 26 10 20 C18 16 22 24 14 27" fill="none" stroke={OUT} strokeWidth="6" strokeLinecap="round" />
          <path d="M20 44 C2 46 -2 26 10 20 C18 16 22 24 14 27" fill="none" stroke="#f9a8d4" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <ellipse className="crit-leg-b" cx="34" cy="55" rx="6.5" ry="4" fill="#c08457" stroke={OUT} strokeWidth="2.5" />
        <ellipse className="crit-leg-a" cx="54" cy="55" rx="6.5" ry="4" fill="#c08457" stroke={OUT} strokeWidth="2.5" />
        <ellipse cx="42" cy="42" rx="28" ry="16" fill="#d4a373" stroke={OUT} strokeWidth="3" />
        <ellipse cx="46" cy="48" rx="17" ry="8" fill="#f3dcbc" />
        {pose === 'cheer' && (
          <g stroke={OUT} strokeWidth="2.5" strokeLinecap="round" fill="#d4a373">
            <path d="M58 34 L64 14" /><path d="M46 34 L40 14" />
            <circle cx="64" cy="12" r="4" /><circle cx="40" cy="12" r="4" />
          </g>
        )}
        <circle cx="68" cy="33" r="14" fill="#d4a373" stroke={OUT} strokeWidth="3" />
        <circle cx="61" cy="17" r="11" fill="#d4a373" stroke={OUT} strokeWidth="3" className={run ? 'crit-ear' : ''} />
        <circle cx="61" cy="17" r="6.2" fill={PINK} />
        <circle cx="75" cy="19" r="8.5" fill="#d4a373" stroke={OUT} strokeWidth="3" />
        <circle cx="75" cy="19" r="4.6" fill={PINK} />
        {pose === 'cheer'
          ? <g fill="none" stroke={OUT} strokeWidth="2.6" strokeLinecap="round"><path d="M67 32 Q71 27 75 32" /></g>
          : (
            <g className="crit-eyes">
              <circle cx="72" cy="31" r={pose === 'scared' ? 5.6 : 5} fill="#fff" stroke={OUT} strokeWidth="2.2" />
              <circle cx={pose === 'scared' ? 70.5 : 73.5} cy="32" r={pose === 'scared' ? 1.6 : 2.6} fill={OUT} />
              <circle cx="74.2" cy="30.5" r=".9" fill="#fff" />
            </g>
          )}
        <circle cx="81" cy="37" r="3.2" fill="#f472b6" stroke={OUT} strokeWidth="1.8" />
        <path d={pose === 'cheer' ? 'M72 41 Q76 48 80 41' : 'M72 42 Q76 44 79 42'} fill="none" stroke={OUT} strokeWidth="2" strokeLinecap="round" />
        <g stroke={OUT} strokeWidth="1.4" strokeLinecap="round"><path d="M82 36 L94 32" /><path d="M82 39 L95 40" /></g>
      </g>
    </svg>
  );
}
