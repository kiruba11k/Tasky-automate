import React, { useEffect, useRef, useState } from 'react';
import { Emoji } from '@/icons/Emoji';

/** Appears once you have scrolled down a while. Press it and the rocket shakes, fires up its flame, trails smoke and blasts you to the top. */
export default function ScrollRocket() {
  const [show, setShow] = useState(false);
  const [fly, setFly] = useState(0);
  const timer = useRef(null);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 500);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); clearTimeout(timer.current); };
  }, []);
  const go = () => {
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (calm) { window.scrollTo({ top: 0 }); return; }
    setFly((n) => n + 1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 350); // lets the rocket warm up first
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFly(0), 1700);
  };
  if (!show && !fly) return null;
  return (
    <button type="button" onClick={go} aria-label="Back to top" title="Back to top" className={`scroll-rocket ${fly ? 'scroll-rocket-go' : ''}`} key={fly ? `go${fly}` : 'idle'}>
      <span className="scroll-rocket-body"><Emoji e="🚀" size="1.9rem" /></span>
      <span className="scroll-rocket-flame" aria-hidden="true" />
      {fly > 0 && <span className="scroll-rocket-smoke" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
    </button>
  );
}
