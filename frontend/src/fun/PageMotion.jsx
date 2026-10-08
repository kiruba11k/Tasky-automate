import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const calm = () => document.body.classList.contains('calm') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Page-wide entrance choreography: every card on a page springs in one after another, and cards below the fold
 * rise into view as you scroll to them. Runs on every route change (and for content that loads a moment later).
 * Skipped in calm mode.
 */
export default function PageMotion() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;
    let index = 0;
    const seen = new WeakSet();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target;
        io.unobserve(el);
        el.classList.add('reveal-go');
        setTimeout(() => el.classList.remove('reveal-wait', 'reveal-go'), 700);
      }
    }, { threshold: 0.08 });

    const enhance = (root) => {
      if (calm()) return;
      root.querySelectorAll?.('.glass-effect-enhanced').forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const top = el.getBoundingClientRect().top;
        if (top > window.innerHeight * 0.92) { el.classList.add('reveal-wait'); io.observe(el); return; }
        el.style.setProperty('--i', String(Math.min(index, 10)));
        index += 1;
        el.classList.add('stagger-in');
        setTimeout(() => el.classList.remove('stagger-in'), 1400);
      });
    };
    enhance(main);
    const start = Date.now();
    const popRows = (n) => { if (calm() || Date.now() - start < 1500) return; (n.matches?.('tr') ? [n] : [...(n.querySelectorAll?.('tbody tr') || [])].slice(0, 3)).forEach((tr) => { tr.classList.add('row-pop'); setTimeout(() => tr.classList.remove('row-pop'), 1600); }); };
    const mo = new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches?.('.glass-effect-enhanced')) enhance(n.parentElement); enhance(n); popRows(n); } })));
    mo.observe(main, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, [pathname]);

  return null;
}
