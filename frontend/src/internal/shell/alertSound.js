// Notification sounds for new alerts, made with the Web Audio API (nothing to download). Browsers only allow sound after the
// person has clicked or typed on the page once, so the audio context is unlocked on the first such gesture; before that alerts stay silent.

let ctx = null;
let unlocked = false;

function context() {
  if (ctx) return ctx;
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    unlocked = true;
    const c = context();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** One soft bell-like note. */
function note(c, freq, start, dur = 0.22, gain = 0.14, type = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
  // a quiet octave above gives the note a bell-like ring
  const h = c.createOscillator();
  const hg = c.createGain();
  h.type = 'sine';
  h.frequency.setValueAtTime(freq * 2, start);
  hg.gain.setValueAtTime(0.0001, start);
  hg.gain.exponentialRampToValueAtTime(gain * 0.25, start + 0.01);
  hg.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.7);
  h.connect(hg).connect(c.destination);
  h.start(start);
  h.stop(start + dur);
}

const C5 = 523.25; const E5 = 659.25; const G5 = 783.99; const A5 = 880; const D6 = 1174.66; const B5 = 987.77; const E4 = 329.63; const A4 = 440;
/** Each kind of alert has its own little tune: [frequency, seconds after the start, length]. */
const TUNES = {
  info: [[A5, 0, 0.18], [D6, 0.13, 0.28]], // a friendly two-note ding
  good: [[C5, 0, 0.16], [E5, 0.1, 0.16], [G5, 0.2, 0.34]], // approved: rising
  warn: [[G5, 0, 0.18], [E5, 0.13, 0.3]], // sent back: gently falling
  soon: [[B5, 0, 0.16], [B5, 0.2, 0.16], [B5, 0.4, 0.3]], // deadline coming: three beeps
  late: [[A4, 0, 0.2], [E4, 0.18, 0.2], [A4, 0.4, 0.2], [E4, 0.58, 0.34]], // overdue: urgent
  chat: [[E5, 0, 0.14]], // a soft pop
};

export function alertTune(kind) { return TUNES[kind] ? kind : 'info'; }

/** Plays the tune for an alert kind (info, good, warn, soon, late, chat). Quietly does nothing if the browser has not allowed sound yet. */
export function playAlert(kind = 'info') {
  const c = context();
  if (!c || !unlocked) return false;
  try {
    if (c.state === 'suspended') c.resume().catch(() => {});
    const t0 = c.currentTime + 0.02;
    for (const [freq, at, dur] of TUNES[alertTune(kind)]) note(c, freq, t0 + at, dur);
    return true;
  } catch { return false; }
}

/** The most important tune of several alerts that arrive together. */
const RANK = ['chat', 'info', 'good', 'warn', 'soon', 'late'];
export const loudest = (kinds) => kinds.reduce((a, b) => (RANK.indexOf(b) > RANK.indexOf(a) ? b : a), 'chat');
