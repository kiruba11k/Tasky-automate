import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BIRDS } from '@/fun/three/Bird3D';
import { Panel } from './ui';

const W = 360; const H = 420; const BEST = 'tasky_flappy_best';

/** Flappy messenger: tap, click or press space to flap through the gaps. */
export default function Flappy() {
  const ref = useRef(null); const st = useRef(null);
  const [score, setScore] = useState(0); const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } });
  const [over, setOver] = useState(false); const [started, setStarted] = useState(false);
  const color = useRef(BIRDS[Object.keys(BIRDS)[Math.floor(Math.random() * 12)]]);
  const reset = useCallback(() => { st.current = { y: H / 2, vy: 0, pipes: [], t: 0, score: 0, dead: false, go: false }; setScore(0); setOver(false); setStarted(false); }, []);
  const flap = useCallback(() => { const s = st.current; if (!s) return; if (s.dead) { reset(); return; } s.go = true; setStarted(true); s.vy = -6.4; }, [reset]);
  useEffect(() => {
    reset();
    const ctx = ref.current.getContext('2d'); let raf; let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(2.2, (now - last) / 16.67); last = now; const s = st.current;
      if (s.go && !s.dead) {
        s.t += dt; s.vy += 0.38 * dt; s.y += s.vy * dt;
        if (s.t % 95 < dt || !s.pipes.length) s.pipes.push({ x: W + 20, gap: 120 + Math.random() * 140, passed: false });
        s.pipes.forEach((p) => { p.x -= 2.4 * dt; if (!p.passed && p.x + 30 < 70) { p.passed = true; s.score += 1; setScore(s.score); } });
        s.pipes = s.pipes.filter((p) => p.x > -60);
        if (s.y < 12 || s.y > H - 12) s.dead = true;
        for (const p of s.pipes) if (70 + 12 > p.x && 70 - 12 < p.x + 52 && (s.y - 12 < p.gap - 56 || s.y + 12 > p.gap + 56)) s.dead = true;
        if (s.dead) { setOver(true); setBest((b) => { const nb = Math.max(b, s.score); try { localStorage.setItem(BEST, String(nb)); } catch { /* ignore */ } return nb; }); }
      }
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7dd3fc'); g.addColorStop(1, '#e0f2fe'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(0, H - 14, W, 14);
      s.pipes.forEach((p) => { ctx.fillStyle = '#16a34a'; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 3; ctx.fillRect(p.x, 0, 52, p.gap - 56); ctx.strokeRect(p.x, 0, 52, p.gap - 56); ctx.fillRect(p.x, p.gap + 56, 52, H); ctx.strokeRect(p.x, p.gap + 56, 52, H); });
      const c = color.current; const wing = Math.sin(now / 70) * 7;
      ctx.save(); ctx.translate(70, s.y); ctx.rotate(Math.max(-0.5, Math.min(0.8, s.vy * 0.07)));
      ctx.fillStyle = c.body; ctx.strokeStyle = '#141225'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 17, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.chest; ctx.beginPath(); ctx.ellipse(4, 5, 10, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c.wing[1]; ctx.beginPath(); ctx.ellipse(-4, wing, 9, 5, -0.4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, 5.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#17142a'; ctx.beginPath(); ctx.arc(9.5, -5, 2.6, 0, 7); ctx.fill();
      ctx.fillStyle = c.beak; ctx.beginPath(); ctx.moveTo(15, -2); ctx.lineTo(24, 1); ctx.lineTo(15, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const key = (e) => { if (e.code === 'Space' && !/input|textarea|select|button/i.test(e.target.tagName)) { e.preventDefault(); flap(); } };
    window.addEventListener('keydown', key);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); };
  }, [flap, reset]);
  return (
    <Panel title="Flappy messenger" hint="Tap, click or press space to flap. Fly through the gaps!" right={<span className="text-xs font-bold text-emerald-300">Score {score} · Best {best}</span>}>
      <canvas ref={ref} width={W} height={H} onPointerDown={flap} className="mx-auto rounded-xl border-2 border-slate-900 max-w-full touch-none cursor-pointer" aria-label="Flappy messenger game" />
      <p className="text-center text-xs text-slate-400 mt-1">{over ? 'Oops! Tap to try again.' : started ? '' : 'Tap to start'}</p>
    </Panel>
  );
}
