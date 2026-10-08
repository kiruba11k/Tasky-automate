import React, { useEffect, useRef, useState } from 'react';
import { Emoji } from '@/icons/Emoji';
import { useFun } from '../FunProvider';
import { Cat, Mouse } from './Critters';

const HEAD_START = 0.12; // endowed progress: the mouse never starts on the very first step
const FINISH = 0.88; // where the mouse stands when it is one step from the hole
const HOLE = 1;
const lerp = (a, b, t) => a + (b - a) * t;

/** Plain bar, used when someone prefers the classic progress style. */
function ClassicBar({ pct, label, text, size }) {
  return (
    <div className="w-full">
      {(label || text) && <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{label}</span><span>{text}</span></div>}
      <div className={`${size === 'sm' ? 'h-2' : 'h-3'} rounded-full bg-slate-700 overflow-hidden`}>
        <div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-700" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * A target as a chase: the mouse runs for the cheese, the cat gives chase. The cat naps until you make progress, closes in
 * as the finish nears (goal-gradient), and when the target is hit the mouse escapes into its hole and the cat bonks the wall.
 * The chase is driven only by real progress, never by a deadline, so it motivates without adding pressure.
 */
export default function ChaseProgress({ value = 0, max = 1, label, text, size = 'lg', className = '', header = true }) {
  const { settings } = useFun();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const done = max > 0 && value >= max;
  const [moving, setMoving] = useState(false);
  const [bonked, setBonked] = useState(false);
  const first = useRef(true);
  const prev = useRef(pct);

  useEffect(() => {
    if (first.current) { first.current = false; setBonked(done); prev.current = pct; return undefined; }
    if (pct === prev.current) return undefined;
    prev.current = pct;
    setMoving(true);
    const t1 = setTimeout(() => setMoving(false), 1250);
    let t2;
    if (done) t2 = setTimeout(() => setBonked(true), 1500);
    else setBonked(false);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pct, done]);

  if (settings.progress === 'classic') return <ClassicBar pct={pct} label={label} text={text ?? `${value}/${max}`} size={size} />;

  const small = size === 'sm';
  const catSize = small ? 32 : 60;
  const mouseSize = small ? 20 : 38;
  const stageH = small ? 46 : 92;

  const mouseX = done ? HOLE : lerp(HEAD_START, FINISH, pct);
  const gap = lerp(0.27, 0.1, pct * pct); // the cat closes in as the finish nears
  const catX = pct === 0 ? 0 : done ? 0.86 : Math.max(0, mouseX - gap);
  const catPose = pct === 0 ? 'sleep' : done ? (bonked ? 'dizzy' : 'run') : moving ? 'run' : 'sit';
  const mousePose = done ? 'cheer' : moving ? (pct > 0.7 ? 'scared' : 'run') : 'sit';
  const crumbs = [0.25, 0.5, 0.75];

  return (
    <div className={`chase ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-label={label || 'Progress'} aria-valuetext={text ?? `${value} of ${max}`}>
      {header && (label || text !== null) && (
        <div className="flex items-baseline justify-between text-xs mb-0.5">
          <span className="font-bold text-slate-200">{label}</span>
          <span className="font-bold text-white">{text ?? `${value}/${max}`}{done && <span className="ml-1.5 text-emerald-300">Done!</span>}</span>
        </div>
      )}
      <div className="chase-stage" style={{ height: stageH }}>
        <div className="chase-ground" />
        <div className="chase-fill" style={{ width: `${(done ? HOLE : mouseX) * 100}%` }} />
        {crumbs.map((c) => {
          const at = lerp(HEAD_START, FINISH, c);
          return <span key={c} className={`chase-crumb ${pct >= c ? 'eaten' : ''}`} style={{ left: `${at * 100}%` }}><Emoji e="🧀" size={small ? '0.7rem' : '1rem'} /></span>;
        })}
        <div className="chase-track" style={{ left: small ? 30 : 52, right: small ? 30 : 52 }}>
        <div className="chase-hole" style={{ width: small ? 22 : 40, height: small ? 14 : 26, left: '100%', marginLeft: small ? -10 : -18 }} />
        <span className={`chase-cheese ${done ? 'won' : ''}`} style={{ left: '100%', marginLeft: small ? -8 : -14 }}><Emoji e="🧀" size={small ? '1.1rem' : '2rem'} /></span>

        <div className="chase-actor" style={{ left: `${catX * 100}%`, transitionDuration: '1.2s', transitionDelay: moving ? '140ms' : '0ms', zIndex: 3 }}>
          <Cat pose={catPose} size={catSize} />
        </div>
        <div className={`chase-actor ${done ? 'hidden-in-hole' : ''}`} style={{ left: `${mouseX * 100}%`, zIndex: 4 }}>
          <Mouse pose={mousePose} size={mouseSize} />
        </div>
        {done && bonked && !small && <span className="chase-bonk" aria-hidden="true">BONK!</span>}
        {done && (
          <div className="chase-peek" style={{ left: '100%', marginLeft: small ? -8 : -14 }} aria-hidden="true"><Mouse pose="cheer" size={small ? 16 : 30} /></div>
        )}
        {moving && !done && (
          <>
            <span className="chase-dust" style={{ left: `${(mouseX - 0.03) * 100}%` }} />
            <span className="chase-dust d2" style={{ left: `${(catX - 0.03) * 100}%` }} />
          </>
        )}
        </div>
        {pct === 0 && !small && <span className="chase-hint" aria-hidden="true">Shh… the cat is asleep. Tiptoe to the cheese!</span>}
      </div>
    </div>
  );
}
