import confetti from 'canvas-confetti';
import { emojiImageUrl } from '@/icons/emojiUrl';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#facc15', '#fb923c'];
const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 200 };

const calm = () => document.body.classList.contains('calm') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);

function layer() {
  let el = document.getElementById('fun-icon-layer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fun-icon-layer';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:205';
    document.body.appendChild(el);
  }
  return el;
}

/** Cartoon icons (not OS emoji) that pop out of a point, or rain from the top. */
function icons(chars, { count = 14, origin = { x: 0.5, y: 0.7 }, spread = 320, rain = false, size = 38 } = {}) {
  if (calm()) return;
  const list = [].concat(chars).map(emojiImageUrl).filter(Boolean);
  if (!list.length) return;
  const host = layer();
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < count; i += 1) {
    const img = new Image();
    img.src = list[i % list.length];
    img.alt = '';
    const s = size * rand(0.8, 1.5);
    img.style.cssText = `position:absolute;width:${s}px;height:${s}px;will-change:transform,opacity;filter:drop-shadow(1px 2px 0 rgba(0,0,0,.35))`;
    const spin = rand(-260, 260);
    let from;
    let to;
    let mid = null;
    if (rain) {
      const x = rand(0.05, 0.95) * w;
      from = `translate(${x}px, ${-60}px) rotate(0deg)`;
      to = `translate(${x + rand(-60, 60)}px, ${h + 60}px) rotate(${spin}deg)`;
    } else {
      const x0 = origin.x * w;
      const y0 = origin.y * h;
      const dx = rand(-spread, spread);
      from = `translate(${x0}px, ${y0}px) scale(.3) rotate(0deg)`;
      mid = `translate(${x0 + dx * 0.6}px, ${y0 - rand(120, 280)}px) scale(1.1) rotate(${spin / 2}deg)`;
      to = `translate(${x0 + dx}px, ${y0 + rand(60, 200)}px) scale(.9) rotate(${spin}deg)`;
    }
    host.appendChild(img);
    const frames = mid ? [{ transform: from, opacity: 1 }, { transform: mid, opacity: 1, offset: 0.45 }, { transform: to, opacity: 0 }] : [{ transform: from, opacity: 1 }, { transform: to, opacity: 0.9 }];
    const anim = img.animate(frames, { duration: rain ? rand(1800, 3200) : rand(1100, 1700), delay: rain ? rand(0, 700) : rand(0, 120), easing: rain ? 'ease-in' : 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' });
    anim.onfinish = () => img.remove();
  }
}

/** Confetti flavours. All of them silently do nothing when the user prefers reduced motion. */
export const effects = {
  small: () => confetti({ ...base, particleCount: 35, spread: 55, startVelocity: 28, origin: { x: 0.5, y: 0.75 } }),
  emoji: (char) => icons(char, { count: 10 }),
  big: () => {
    confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 45, origin: { x: 0.1, y: 0.8 }, angle: 60 });
    confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 45, origin: { x: 0.9, y: 0.8 }, angle: 120 });
    icons(['🎉', '⭐', '✨'], { count: 14, origin: { x: 0.5, y: 0.6 } });
  },
  stars: () => icons(['⭐', '🌟', '✨'], { count: 22, origin: { x: 0.5, y: 0.5 }, spread: 420 }),
  fireworks: () => {
    let n = 0;
    const timer = setInterval(() => {
      confetti({ ...base, particleCount: 70, spread: 360, startVelocity: 30, ticks: 70, origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 } });
      n += 1;
      if (n >= 6) clearInterval(timer);
    }, 260);
  },
  rain: (char) => icons(char, { count: 18, rain: true, size: 42 }),
  poof: () => icons('💨', { count: 6, origin: { x: 0.5, y: 0.55 }, spread: 160, size: 44 }),
  /** A marble that flies from where you clicked into the done jar (or the level chip when no jar is on screen). */
  marble: (from) => {
    if (calm() || !from) return;
    const target = document.getElementById('done-jar') || document.querySelector('[data-fun-target="xp"]');
    if (!target) return;
    const r = target.getBoundingClientRect();
    if (!r.width) return;
    const tx = r.left + r.width / 2;
    const ty = r.top + r.height * 0.55;
    const el = document.createElement('div');
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.cssText = `position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;pointer-events:none;z-index:210;background:radial-gradient(circle at 35% 30%,#fff 0 12%,${color} 14%);border:2px solid #0b1220;box-shadow:2px 3px 0 rgba(0,0,0,.35)`;
    document.body.appendChild(el);
    const midX = (from.x + tx) / 2;
    const midY = Math.min(from.y, ty) - 90;
    const anim = el.animate([
      { transform: `translate(${from.x}px,${from.y}px) scale(.4)`, offset: 0 },
      { transform: `translate(${midX}px,${midY}px) scale(1.25,.85)`, offset: 0.45 },
      { transform: `translate(${tx}px,${ty}px) scale(.9,1.15)`, offset: 0.9 },
      { transform: `translate(${tx}px,${ty}px) scale(0)`, offset: 1 },
    ], { duration: 950, easing: 'cubic-bezier(.3,.6,.4,1)' });
    anim.onfinish = () => { el.remove(); target.classList.add('jar-wobble'); setTimeout(() => target.classList.remove('jar-wobble'), 700); };
  },
};
