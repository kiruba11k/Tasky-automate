import confetti from 'canvas-confetti';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#facc15', '#fb923c'];
const base = { colors: COLORS, disableForReducedMotion: true, zIndex: 200 };
const emoji = (text, scalar = 2) => confetti.shapeFromText({ text, scalar });

/** Confetti flavours. All of them silently do nothing when the user prefers reduced motion. */
export const effects = {
  small: () => confetti({ ...base, particleCount: 35, spread: 55, startVelocity: 28, origin: { x: 0.5, y: 0.75 } }),
  emoji: (text) => confetti({ ...base, particleCount: 14, spread: 70, startVelocity: 32, scalar: 2, shapes: [emoji(text)], origin: { x: 0.5, y: 0.7 } }),
  big: () => {
    confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 45, origin: { x: 0.1, y: 0.8 }, angle: 60 });
    confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 45, origin: { x: 0.9, y: 0.8 }, angle: 120 });
    confetti({ ...base, particleCount: 24, spread: 100, scalar: 2, shapes: [emoji('🎉'), emoji('⭐'), emoji('✨')], origin: { x: 0.5, y: 0.6 } });
  },
  stars: () => confetti({ ...base, particleCount: 40, spread: 100, startVelocity: 35, scalar: 2.2, shapes: [emoji('⭐'), emoji('🌟')], origin: { x: 0.5, y: 0.5 } }),
  fireworks: () => {
    let n = 0;
    const timer = setInterval(() => {
      confetti({ ...base, particleCount: 70, spread: 360, startVelocity: 30, ticks: 70, origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 } });
      n += 1;
      if (n >= 6) clearInterval(timer);
    }, 260);
  },
  rain: (text) => {
    const shapes = [emoji(text, 2.4)];
    confetti({ ...base, particleCount: 26, spread: 160, gravity: 0.7, ticks: 220, startVelocity: 12, shapes, scalar: 2.4, origin: { x: 0.5, y: -0.1 } });
  },
  poof: () => confetti({ ...base, particleCount: 18, spread: 360, startVelocity: 12, gravity: 0.4, ticks: 60, scalar: 1.6, shapes: [emoji('💨', 2)], colors: ['#94a3b8'], origin: { x: 0.5, y: 0.55 } }),
};
