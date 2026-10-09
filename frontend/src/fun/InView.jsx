import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders its children only while they are near the viewport. Browsers keep a limited number of WebGL contexts alive,
 * so pages with many 3D canvases (the cast grid) mount them as you scroll and free them when they leave.
 */
export default function InView({ children, height = 200, margin = '250px', className = '' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return <div ref={ref} className={className} style={{ minHeight: height }}>{on ? children : null}</div>;
}
