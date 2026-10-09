// Calm background sounds made with the Web Audio API (no audio files). Starts only after a click, because browsers require that.
let ctx = null; let master = null; let nodes = []; let timers = []; let current = null;
const KEY = 'tasky_soundscape';

const audio = () => {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch { ctx = null; }
  return ctx;
};
const noise = (c, kind) => {
  const len = c.sampleRate * 3; const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i += 1) { const w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  const s = c.createBufferSource(); s.buffer = buf; s.loop = true; return s;
};
const chain = (...n) => { n.reduce((a, b) => { a.connect(b); return b; }); nodes.push(...n); };
const tick = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); };
const blip = (c, freq, dur, vol, type = 'sine') => { const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.connect(g).connect(master); o.start(); o.stop(c.currentTime + dur + 0.02); };

export const SOUNDS = [['rain', 'Rain'], ['ocean', 'Ocean'], ['fire', 'Fireplace'], ['cafe', 'Cafe'], ['focus', 'Brown noise']];

export function stopSound() {
  timers.forEach(clearInterval); timers = [];
  nodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch { /* ignore */ } }); nodes = [];
  current = null;
}

export function startSound(kind, volume = 0.5) {
  const c = audio(); if (!c) return false;
  stopSound(); if (c.state === 'suspended') c.resume().catch(() => {});
  master.gain.value = volume; current = kind;
  if (kind === 'rain') {
    const n = noise(c, 'white'); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; const g = c.createGain(); g.gain.value = 0.35;
    chain(n, hp, lp, g, master); n.start();
    tick(() => blip(c, 1500 + Math.random() * 2500, 0.05, 0.03), 140);
  } else if (kind === 'ocean') {
    const n = noise(c, 'brown'); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; const g = c.createGain(); g.gain.value = 0.3;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.12; const lg = c.createGain(); lg.gain.value = 0.25; lfo.connect(lg).connect(g.gain); lfo.start();
    chain(n, lp, g, master); nodes.push(lfo); n.start();
  } else if (kind === 'fire') {
    const n = noise(c, 'brown'); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = c.createGain(); g.gain.value = 0.22;
    chain(n, lp, g, master); n.start();
    tick(() => { if (Math.random() < 0.7) blip(c, 200 + Math.random() * 900, 0.04 + Math.random() * 0.05, 0.08, 'square'); }, 160);
  } else if (kind === 'cafe') {
    const n = noise(c, 'brown'); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6; const g = c.createGain(); g.gain.value = 0.35;
    chain(n, bp, g, master); n.start();
    tick(() => { if (Math.random() < 0.35) { blip(c, 1800 + Math.random() * 900, 0.18, 0.025); blip(c, 2400 + Math.random() * 700, 0.12, 0.015); } if (Math.random() < 0.3) blip(c, 140 + Math.random() * 60, 0.35, 0.05, 'triangle'); }, 900);
  } else {
    const n = noise(c, 'brown'); const g = c.createGain(); g.gain.value = 0.45; chain(n, g, master); n.start();
  }
  try { localStorage.setItem(KEY, JSON.stringify({ kind, volume })); } catch { /* ignore */ }
  return true;
}
export const setVolume = (v) => { if (master) master.gain.value = v; };
export const currentSound = () => current;
export const savedSound = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
