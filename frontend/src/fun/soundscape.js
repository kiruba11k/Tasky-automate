// Calm background sounds made with the Web Audio API (no audio files). Starts only after a click, because browsers require that.
//
// Graph:  sources -> filters -> bus (one per sound, fades in and out) -> master (the volume) -> speakers.
// `master` is created once and never disconnected; each sound has its own `bus`, so switching or stopping can never cut the speakers off.
let ctx = null; let master = null; let bus = null; let nodes = []; let timers = []; let current = null;
const KEY = 'tasky_soundscape';
const FADE_IN = 0.8; const FADE_OUT = 0.35;

const audio = () => {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch { ctx = null; }
  return ctx;
};

/** Looping noise. The buffer is long and its end is blended into its start, so the loop has no click and no audible repeat. */
const noise = (c, kind) => {
  const seconds = 12; const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i += 1) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  const fade = Math.floor(c.sampleRate * 1.5); // cross-fade the last 1.5 s with the first 1.5 s
  for (let i = 0; i < fade; i += 1) { const t = i / fade; d[len - fade + i] = d[len - fade + i] * (1 - t) + d[i] * t; }
  const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = fade / c.sampleRate; s.loopEnd = (len - 0) / c.sampleRate; return s;
};
const chain = (...n) => { n.reduce((a, b) => { a.connect(b); return b; }); nodes.push(...n); };
const tick = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); };
const blip = (c, freq, dur, vol, type = 'sine') => {
  if (!bus) return;
  const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(bus); o.start(); o.stop(c.currentTime + dur + 0.02);
};

export const SOUNDS = [['rain', 'Rain'], ['ocean', 'Ocean'], ['fire', 'Fireplace'], ['cafe', 'Cafe'], ['focus', 'Brown noise']];

/** Fades the current sound out and tears it down (the speakers stay connected for the next one). */
export function stopSound() {
  timers.forEach(clearInterval); timers = [];
  const oldNodes = nodes; const oldBus = bus;
  nodes = []; bus = null; current = null;
  if (oldBus && ctx) { try { oldBus.gain.cancelScheduledValues(ctx.currentTime); oldBus.gain.setTargetAtTime(0.0001, ctx.currentTime, FADE_OUT / 3); } catch { /* ignore */ } }
  setTimeout(() => {
    oldNodes.forEach((n) => { try { n.stop?.(); n.disconnect(); } catch { /* ignore */ } });
    try { oldBus?.disconnect(); } catch { /* ignore */ }
  }, FADE_OUT * 1000 + 100);
}

export function startSound(kind, volume = 0.5) {
  const c = audio(); if (!c) return false;
  stopSound();
  if (c.state === 'suspended') c.resume().catch(() => {});
  master.gain.setTargetAtTime(volume, c.currentTime, 0.02);
  bus = c.createGain(); bus.gain.setValueAtTime(0.0001, c.currentTime); bus.gain.exponentialRampToValueAtTime(1, c.currentTime + FADE_IN); bus.connect(master);
  current = kind;
  if (kind === 'rain') {
    const n = noise(c, 'white'); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; const g = c.createGain(); g.gain.value = 0.7;
    chain(n, hp, lp, g, bus); n.start();
    const low = noise(c, 'brown'); const lg = c.createGain(); lg.gain.value = 0.35; chain(low, lg, bus); low.start(); // a soft rumble under the rain
    tick(() => blip(c, 1500 + Math.random() * 2500, 0.05, 0.05), 120);
  } else if (kind === 'ocean') {
    const n = noise(c, 'brown'); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; const g = c.createGain(); g.gain.value = 0.6;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11; const lg = c.createGain(); lg.gain.value = 0.45; lfo.connect(lg).connect(g.gain); lfo.start(); // the waves
    chain(n, lp, g, bus); nodes.push(lfo, lg); n.start();
  } else if (kind === 'fire') {
    const n = noise(c, 'brown'); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 450; const g = c.createGain(); g.gain.value = 0.55;
    chain(n, lp, g, bus); n.start();
    tick(() => { if (Math.random() < 0.7) blip(c, 200 + Math.random() * 900, 0.04 + Math.random() * 0.05, 0.12, 'square'); }, 150);
  } else if (kind === 'cafe') {
    const n = noise(c, 'brown'); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6; const g = c.createGain(); g.gain.value = 0.75;
    chain(n, bp, g, bus); n.start();
    tick(() => { if (Math.random() < 0.35) { blip(c, 1800 + Math.random() * 900, 0.18, 0.04); blip(c, 2400 + Math.random() * 700, 0.12, 0.025); } if (Math.random() < 0.3) blip(c, 140 + Math.random() * 60, 0.35, 0.08, 'triangle'); }, 900);
  } else {
    const n = noise(c, 'brown'); const g = c.createGain(); g.gain.value = 0.9; chain(n, g, bus); n.start();
  }
  try { localStorage.setItem(KEY, JSON.stringify({ kind, volume })); window.dispatchEvent(new Event('tasky:prefs')); } catch { /* ignore */ }
  return true;
}
export const setVolume = (v) => {
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
  try { if (current) localStorage.setItem(KEY, JSON.stringify({ kind: current, volume: v })); } catch { /* ignore */ }
};
export const currentSound = () => current;
export const savedSound = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
