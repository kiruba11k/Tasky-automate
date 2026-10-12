import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFun } from '@/fun/FunProvider';

const SEEN = 'tasky_knight_kicked';

/** Cutscene: the person's own buddy bursts into the corner and boots the Lead Strategus knight out of the screen. Plays once per device, and every time they switch buddy. */
export function KnightKick() {
  const { settings } = useFun();
  const [play, setPlay] = useState(0);

  useEffect(() => {
    if (!settings.mascot) return undefined;
    let seen = false;
    try { seen = localStorage.getItem(SEEN) === '1'; } catch { /* ignore */ }
    let t;
    if (!seen) {
      t = setTimeout(() => { setPlay((n) => n + 1); try { localStorage.setItem(SEEN, '1'); } catch { /* ignore */ } }, 1500);
    }
    const again = () => { if (!document.hidden) setPlay((n) => n + 1); };
    window.addEventListener('tasky:kick', again);
    return () => { clearTimeout(t); window.removeEventListener('tasky:kick', again); };
  }, [settings.mascot]);

  useEffect(() => {
    if (!play) return undefined;
    const t = setTimeout(() => setPlay(0), 2600);
    return () => clearTimeout(t);
  }, [play]);

  if (!play || !settings.mascot) return null;
  return createPortal(
    <div className="fun-scope" aria-hidden="true">
      <div key={play} className="knight-kick pointer-events-none fixed inset-0 z-[95] overflow-hidden">
        <img src="/mascot.webp" alt="" className="knight-kick-knight" />
        <span className="knight-kick-boom">KICK!</span>
        <span className="knight-kick-foot">🦶</span>
      </div>
    </div>,
    document.body,
  );
}
