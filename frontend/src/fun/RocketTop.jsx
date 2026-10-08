import React, { useEffect, useState } from 'react';
import { Emoji } from '@/icons/Emoji';
import { useFun } from './FunProvider';

/** Appears once you have scrolled a while: click it and the rocket blasts you back to the top. */
export default function RocketTop() {
  const { settings } = useFun();
  const [show, setShow] = useState(false);
  const [fly, setFly] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 600);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const go = () => {
    const reduce = settings.anim !== 'full';
    if (reduce) { window.scrollTo({ top: 0 }); return; }
    setFly(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setFly(false), 1100);
  };
  if (!show && !fly) return null;
  return (
    <button type="button" onClick={go} aria-label="Back to top" title="Back to top" className={`rocket-top ${fly ? 'launch' : ''}`}>
      <Emoji e="🚀" size="1.8rem" />
      {fly && <span className="rocket-flame" />}
    </button>
  );
}
