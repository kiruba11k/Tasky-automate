import React, { useCallback, useEffect, useRef, useState } from 'react';
import { emojiImageUrl } from '@/icons/emojiUrl';

const W = 420; const H = 150; const GROUND = 120;
const BEST = 'tasky_cheese_dash_best';

const img = (e) => { const i = new Image(); const u = emojiImageUrl(e); if (u) i.src = u; return i; };

/** Cheese Dash: a tiny one-button runner. Jump (space, up arrow, click or tap) over the cacti and grab the cheese. */
export default function ArcadeGame({ onClose }) {
  const canvas = useRef(null);
  const state = useRef(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } });
  const [over, setOver] = useState(false);
  const imgs = useRef(null);

  const reset = useCallback(() => {
    state.current = { y: 0, vy: 0, obstacles: [], cheese: [], t: 0, speed: 3.2, score: 0, dead: false, spawn: 60 };
    setOver(false); setScore(0);
  }, []);

  const jump = useCallback(() => {
    const s = state.current;
    if (!s) return;
    if (s.dead) { reset(); return; }
    if (s.y === 0) s.vy = 10.5;
  }, [reset]);

  useEffect(() => {
    imgs.current = { cheese: img('🧀'), cactus: img('🌵'), tomato: img('🍅') };
    reset();
    const c = canvas.current; const ctx = c.getContext('2d');
    let raf; let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(2.2, (now - last) / 16.67); last = now;
      const s = state.current;
      if (!s.dead) {
        s.t += dt; s.speed = 3.2 + s.t / 900;
        s.vy -= 0.62 * dt; s.y = Math.max(0, s.y + s.vy * dt); if (s.y === 0) s.vy = 0;
        s.spawn -= dt * s.speed / 3.2;
        if (s.spawn <= 0) {
          const tall = Math.random() < 0.35;
          s.obstacles.push({ x: W + 20, w: 22, h: tall ? 40 : 28, kind: tall ? 'cactus' : 'tomato' });
          if (Math.random() < 0.55) s.cheese.push({ x: W + 20 + 90, y: 30 + Math.random() * 50, got: false });
          s.spawn = 55 + Math.random() * 55;
        }
        s.obstacles.forEach((o) => { o.x -= s.speed * dt; });
        s.cheese.forEach((q) => { q.x -= s.speed * dt; });
        s.obstacles = s.obstacles.filter((o) => o.x > -40); s.cheese = s.cheese.filter((q) => q.x > -30 && !q.got);
        const mx = 60; const my = s.y;
        for (const o of s.obstacles) if (o.x < mx + 12 && o.x + o.w > mx - 12 && my < o.h - 6) { s.dead = true; }
        for (const q of s.cheese) if (!q.got && Math.abs(q.x - mx) < 18 && Math.abs(q.y - my - 14) < 22) { q.got = true; s.score += 5; }
        s.score += 0.12 * dt * s.speed / 3.2;
        if (Math.floor(s.score) !== s.shown) { s.shown = Math.floor(s.score); setScore(s.shown); }
        if (s.dead) {
          const final = Math.floor(s.score);
          setOver(true);
          setBest((b) => { const nb = Math.max(b, final); try { localStorage.setItem(BEST, String(nb)); } catch { /* ignore */ } return nb; });
        }
      }
      // draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(56,189,248,.14)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      [[(80 - s.t * 0.3) % (W + 80), 24], [(250 - s.t * 0.45) % (W + 80), 40], [(380 - s.t * 0.25) % (W + 80), 18]].forEach(([x, y]) => { const xx = x < -40 ? x + W + 80 : x; ctx.beginPath(); ctx.ellipse(xx, y, 22, 8, 0, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#16a34a55'; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.strokeStyle = '#4ade80'; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -s.t * s.speed; ctx.beginPath(); ctx.moveTo(0, GROUND + 0.5); ctx.lineTo(W, GROUND + 0.5); ctx.stroke(); ctx.setLineDash([]);
      s.obstacles.forEach((o) => { const im = imgs.current[o.kind]; ctx.drawImage(im, o.x - 4, GROUND - o.h - 2, o.w + 8, o.h + 8); });
      s.cheese.forEach((q) => { ctx.drawImage(imgs.current.cheese, q.x - 11, GROUND - q.y - 11, 22, 22); });
      // the mouse
      const mx = 60; const my = GROUND - s.y; const run = Math.sin(s.t * 0.7) * 3;
      ctx.save(); ctx.translate(mx, my);
      ctx.strokeStyle = '#f4b5b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -8); ctx.quadraticCurveTo(-26, -14 + run, -30, -4); ctx.stroke();
      ctx.fillStyle = '#c9b8a6'; ctx.strokeStyle = '#141225'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(0, -12, 15, 11, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(10, -20, 8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f9a8c0'; ctx.beginPath(); ctx.arc(8, -29, 5.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#141225'; ctx.beginPath(); ctx.arc(13, -21, 1.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#f48fb1'; ctx.beginPath(); ctx.arc(18, -18, 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9a9a0'; ctx.fillRect(-8, -3 + (s.y ? 0 : run / 2), 5, 4); ctx.fillRect(4, -3 - (s.y ? 0 : run / 2), 5, 4);
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e) => { if (['Space', 'ArrowUp'].includes(e.code)) { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); };
  }, [jump, reset]);

  return (
    <div className="arcade" onPointerDown={jump} role="application" aria-label="Cheese Dash mini game. Press space or tap to jump.">
      <div className="flex justify-between text-xs font-bold text-slate-200 px-1 mb-1"><span>Cheese Dash</span><span>Score {score} · Best {best}</span></div>
      <canvas ref={canvas} width={W} height={H} className="w-full rounded-xl border-2 border-slate-900" style={{ maxWidth: W, imageRendering: 'auto', touchAction: 'manipulation' }} />
      <div className="text-center text-[11px] text-slate-400 mt-1">{over ? 'Oops! Tap or press space to try again.' : 'Space / tap to jump. Grab the cheese!'}{onClose && <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-2 underline">close</button>}</div>
    </div>
  );
}
