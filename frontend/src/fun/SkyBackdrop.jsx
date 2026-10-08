import React, { useEffect, useState } from 'react';

/** Day/night sky for a card: the sun or moon travels across it with the clock, with stars at night and drifting clouds. */
export const daypart = (h) => (h < 5 || h >= 21 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : h < 21 ? 'dusk' : 'night');
const GRAD = {
  night: 'linear-gradient(120deg,#0b1030,#1e1b4b 60%,#312e81)',
  dawn: 'linear-gradient(120deg,#7c3aed55,#fb923c88 60%,#fde68a88)',
  day: 'linear-gradient(120deg,#0ea5e944,#38bdf877 60%,#bae6fd88)',
  dusk: 'linear-gradient(120deg,#4338ca88,#db277788 55%,#fb923c88)',
};

export default function SkyBackdrop({ className = '' }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const h = now.getHours() + now.getMinutes() / 60;
  const part = daypart(h);
  const sun = part === 'day' || part === 'dawn' || (part === 'dusk' && h < 19.5);
  // 6:00 -> left edge, 18:00 -> right edge for the sun; the moon travels 18:00 -> 6:00
  const prog = sun ? Math.min(1, Math.max(0, (h - 5.5) / 14)) : ((h >= 17 ? h - 17 : h + 7) / 13);
  const x = 8 + prog * 84;
  const y = 70 - Math.sin(Math.min(1, Math.max(0, prog)) * Math.PI) * 50;
  return (
    <div className={`sky ${className}`} style={{ background: GRAD[part] }} aria-hidden="true">
      {part === 'night' && [...Array(16)].map((_, i) => <span key={i} className="calm-star" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 19) % 60}%`, animationDelay: `${(i % 6) * 0.5}s` }} />)}
      <span className={sun ? 'sky-sun' : 'sky-moon'} style={{ left: `${x}%`, top: `${y}%` }} />
      <span className="sky-cloud a" /><span className="sky-cloud b" />
    </div>
  );
}
