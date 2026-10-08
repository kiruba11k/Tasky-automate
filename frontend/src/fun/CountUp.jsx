import React, { useEffect, useRef, useState } from 'react';

/** Number that counts up to its value (skipped for reduced motion / calm mode). */
export default function CountUp({ value, duration = 900, suffix = '' }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const calm = document.body.classList.contains('calm') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (calm) { setShown(target); from.current = target; return undefined; }
    const start = performance.now();
    const origin = from.current;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(origin + (target - origin) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}{suffix}</>;
}
