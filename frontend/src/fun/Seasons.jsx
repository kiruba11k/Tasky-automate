import React, { useMemo } from 'react';
import { emojiImageUrl } from '@/icons/emojiUrl';
import { useFun } from './FunProvider';

/** The calendar decides the weather: autumn leaves, winter snow, spring petals, summer sparkles. Light, decorative, and off in calm mode. */
export const seasonOf = (d = new Date()) => {
  const m = d.getMonth() + 1;
  return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
};
const ICONS = { autumn: ['🍂', '🍁'], winter: ['❄'] };
const rnd = (i, k) => { const x = Math.sin(i * 97.13 + k * 31.7) * 10000; return x - Math.floor(x); };

export default function Seasons() {
  const { settings } = useFun();
  const season = seasonOf();
  const items = useMemo(() => Array.from({ length: season === 'summer' ? 14 : 18 }, (_, i) => ({
    i, left: rnd(i, 1) * 100, size: 14 + rnd(i, 2) * 16, dur: 9 + rnd(i, 3) * 10, delay: -rnd(i, 4) * 18, sway: 20 + rnd(i, 5) * 60,
    src: (ICONS[season] || []).map(emojiImageUrl).filter(Boolean)[i % (ICONS[season]?.length || 1)],
  })), [season]);
  if (settings.season === false || settings.anim !== 'full') return null;
  return (
    <div className={`season-layer season-${season}`} aria-hidden="true">
      {items.map((it) => (
        <span key={it.i} className="season-bit" style={{ left: `${it.left}%`, width: it.size, height: it.size, animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s`, '--sway': `${it.sway}px` }}>
          {it.src ? <img src={it.src} alt="" width={it.size} height={it.size} /> : null}
        </span>
      ))}
    </div>
  );
}
