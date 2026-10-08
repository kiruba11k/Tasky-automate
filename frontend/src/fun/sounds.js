// Tiny synthesized sound effects (no audio files). Browsers only allow audio after a user gesture; before that these are silent no-ops.
let ctx = null;

function audio() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

function tone(c, { freq, at = 0, dur = 0.15, type = 'sine', vol = 0.12, to }) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const recipes = {
  pop: (c) => tone(c, { freq: 420, to: 880, dur: 0.12, type: 'triangle' }),
  blip: (c) => tone(c, { freq: 988, dur: 0.1, vol: 0.07 }),
  ding: (c) => { tone(c, { freq: 880, dur: 0.25 }); tone(c, { freq: 1318, at: 0.09, dur: 0.35 }); },
  fanfare: (c) => [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, at: i * 0.11, dur: 0.28, type: 'square', vol: 0.07 })),
  whoosh: (c) => tone(c, { freq: 300, to: 1400, dur: 0.3, type: 'sawtooth', vol: 0.05 }),
  boing: (c) => tone(c, { freq: 200, to: 620, dur: 0.28, type: 'sine', vol: 0.14 }),
  womp: (c) => { tone(c, { freq: 330, dur: 0.2, type: 'triangle' }); tone(c, { freq: 247, at: 0.2, dur: 0.35, type: 'triangle' }); },
  stamp: (c) => { tone(c, { freq: 120, to: 50, dur: 0.18, type: 'square', vol: 0.18 }); },
  poof: (c) => tone(c, { freq: 700, to: 120, dur: 0.22, type: 'sawtooth', vol: 0.05 }),
  levelUp: (c) => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { freq: f, at: i * 0.09, dur: 0.22, type: 'triangle', vol: 0.1 })),
};

export function play(name, enabled = true) {
  if (!enabled) return;
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  if (c.state !== 'running') return;
  try { recipes[name]?.(c); } catch { /* audio is a bonus, never an error */ }
}
