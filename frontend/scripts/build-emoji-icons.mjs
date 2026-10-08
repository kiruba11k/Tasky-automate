// Builds src/icons/emojiIcons.generated.js: cartoon icon artwork for every pictograph character used in the app's data/copy.
// The app never shows the emoji glyph itself: <Emoji>/<Rich> swap each character for one of these icons.
// Sources (all from the Iconify catalogue):
//   P = Streamline Plump Color (CC BY 4.0)   F = Streamline Flex Color (CC BY 4.0)   G = Game-Icons.net (CC BY 3.0, tinted)
// Run: npm run build:icons   (only needed when a new character is introduced)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sets = {
  P: require('@iconify-json/streamline-plump-color/icons.json'),
  F: require('@iconify-json/streamline-flex-color/icons.json'),
  G: require('@iconify-json/game-icons/icons.json'),
};
const root = path.resolve(import.meta.dirname, '..', '..');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) return e.name === 'node_modules' || e.name === 'dist' ? [] : walk(p);
  return /\.(jsx?|json)$/.test(e.name) && !e.name.includes('generated') ? [p] : [];
});
const pat = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|\p{Emoji_Modifier})*/gu;
const strip = (e) => e.replace(/️/g, '');
const found = new Set();
for (const f of [...walk(path.join(root, 'frontend/src')), ...walk(path.join(root, 'backend/src'))]) {
  for (const m of fs.readFileSync(f, 'utf8').match(pat) || []) found.add(strip(m));
}

// character -> [set, icon name, tint (G only; "a,b" = top→bottom gradient)]  |  ['T', text, colour] for a lettered badge
const MAP = {
  '⏰': ['P', 'notification-alarm-snooze'], '⏱': ['P', 'stopwatch-half'], '⏳': ['P', 'hourglass'],
  '☀': ['P', 'sun'], '☁': ['F', 'cloud'], '☕': ['P', 'coffee-mug'], '⚙': ['P', 'cog'], '⚠': ['P', 'warning-diamond'],
  '⚡': ['P', 'flash-1'], '✅': ['P', 'check-thick'], '✈': ['P', 'airplane-enabled'], '✏': ['P', 'pencil-square'],
  '✨': ['P', 'multiple-stars'], '❤': ['F', 'heart'], '⭐': ['P', 'star-circle'], '🃏': ['P', 'card-game-diamond'],
  '🌈': ['G', 'rainbow-star', '#ec4899,#6366f1'], '🌋': ['G', 'volcano', '#f97316,#dc2626'], '🌕': ['G', 'moon', '#facc15'],
  '🌙': ['P', 'moon-stars'], '🌟': ['F', 'star-badge'], '🌱': ['G', 'sprout', '#4ade80,#16a34a'], '🌲': ['P', 'tree-1'],
  '🌵': ['G', 'cactus', '#4ade80,#15803d'], '🌿': ['P', 'leaf-protect'], '🍅': ['G', 'tomato', '#f87171,#dc2626'],
  '🍉': ['P', 'water-melon'], '🍒': ['P', 'cherries'], '🍕': ['G', 'pizza-slice', '#fbbf24,#ea580c'],
  '🍩': ['G', 'donut', '#f472b6,#be185d'], '🍬': ['G', 'candy-canes', '#f87171,#be123c'], '🎁': ['P', 'gift'],
  '🎉': ['G', 'party-popper', '#fbbf24,#ec4899'], '🎤': ['G', 'microphone', '#a78bfa,#6d28d9'], '🎧': ['G', 'headphones', '#60a5fa,#2563eb'],
  '🎨': ['P', 'paint-palette'], '🎩': ['F', 'tall-hat'], '🎯': ['P', 'target-3'], '🎸': ['G', 'guitar', '#fb923c,#c2410c'],
  '🏅': ['P', 'star-medal'], '🏆': ['F', 'trophy'], '🏎': ['G', 'race-car', '#f87171,#b91c1c'],
  '🏰': ['G', 'castle', '#818cf8,#4338ca'], '🐉': ['G', 'dragon-head', '#4ade80,#15803d'], '🐔': ['G', 'chicken', '#fbbf24,#d97706'],
  '🐙': ['G', 'octopus', '#c084fc,#7e22ce'], '🐝': ['G', 'bee', '#facc15,#ca8a04'], '🐧': ['G', 'penguin', '#38bdf8,#0369a1'],
  '🐱': ['F', 'cat-2'], '🐶': ['P', 'dog-1'], '🐸': ['G', 'frog', '#4ade80,#15803d'], '🐼': ['G', 'panda', '#94a3b8,#334155'],
  '👀': ['P', 'eye-optic'], '👋': ['P', 'waving-hand'], '👍': ['G', 'thumb-up', '#60a5fa,#1d4ed8'],
  '👏': ['G', 'high-five', '#fbbf24,#d97706'], '👑': ['F', 'crown'], '💛': ['G', 'crowned-heart', '#facc15,#ca8a04'],
  '💥': ['G', 'explosion-rays', '#fde047,#f97316'], '💧': ['G', 'water-drop', '#38bdf8,#0369a1'], '💨': ['G', 'wind-slap', '#94a3b8,#475569'],
  '💪': ['G', 'muscle-up', '#fbbf24,#d97706'], '💯': ['T', '100', '#ef4444'], '💰': ['P', 'dollar-coin'], '📅': ['P', 'calendar-mark'],
  '📣': ['P', 'announcement-megaphone'], '📥': ['P', 'inbox-content'], '📦': ['P', 'shipping-box-1'], '📨': ['P', 'mail-send-email-message'],
  '📬': ['P', 'inbox-post'], '🔔': ['P', 'bell'], '🔟': ['T', '10', '#6366f1'], '🔥': ['G', 'flame', '#fbbf24,#ef4444'],
  '🔧': ['P', 'wrench-circle'], '🕹': ['G', 'joystick', '#a78bfa,#6d28d9'], '🕺': ['P', 'man-arm-raises-2-alternate'],
  '🗓': ['P', 'calendar-check'], '🗺': ['P', 'map-fold'], '😄': ['P', 'smiley-laughing-1'], '🙈': ['G', 'monkey', '#d6a35c,#92400e'],
  '🙌': ['P', 'ok-hand'], '🚀': ['F', 'rocket'], '🚨': ['G', 'siren', '#f87171,#b91c1c'], '🚫': ['P', 'block-1'],
  '🛠': ['P', 'tool-box'], '🛡': ['P', 'shield-1'], '🛸': ['G', 'ufo', '#818cf8,#4338ca'], '🤝': ['G', 'shaking-hands', '#fbbf24,#d97706'],
  '🤞': ['G', 'clover', '#4ade80,#15803d'], '🥂': ['F', 'champagne-party-alcohol'], '🥇': ['G', 'medallist', '#fde047,#ca8a04'],
  '🦄': ['G', 'unicorn', '#f472b6,#a21caf'], '🦉': ['G', 'owl', '#d6a35c,#92400e'], '🦊': ['G', 'fox-head', '#fb923c,#c2410c'],
  '🦖': ['G', 'dinosaur-rex', '#4ade80,#15803d'], '🧀': ['P', 'cheese'], '🧈': ['G', 'butter-toast', '#fde047,#ca8a04'],
  '🧐': ['P', 'search-visual'], '🧑‍🏫': ['G', 'teacher', '#60a5fa,#1d4ed8'], '🧘': ['G', 'meditation', '#a78bfa,#6d28d9'],
  '🧠': ['G', 'brain', '#f9a8d4,#be185d'], '🪐': ['G', 'ringed-planet', '#c084fc,#6d28d9'], '🪴': ['P', 'potted-flower'],
  '🫣': ['P', 'invisible-2'],
  '🥚': ['G', 'big-egg', '#fde68a,#f59e0b'], '🎈': ['P', 'balloon'], '🎒': ['G', 'backpack', '#fbbf24,#d97706'], '🫙': ['G', 'mason-jar', '#7dd3fc,#0284c7'],
  '🥪': ['G', 'sandwich', '#fbbf24,#b45309'], '🍽': ['P', 'fork-plate'], '🏁': ['G', 'checkered-flag', '#e2e8f0,#475569'], '🎮': ['G', 'gamepad', '#818cf8,#4338ca'],
  '🍂': ['G', 'falling-leaf', '#fb923c,#b45309'], '🍁': ['G', 'maple-leaf', '#f87171,#b91c1c'], '❄': ['G', 'snowflake-1', '#bae6fd,#38bdf8'],
};

const ICON = 32;
const out = {};
const missing = [];
const wrap = (prefix, size, body) => `<g transform="scale(${(ICON / size).toFixed(5)})">${body}</g>`;
const tag = (n, s) => s.replace(/\bid="([^"]+)"/g, `id="i${n}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#i${n}-$1)`).replace(/(xlink:)?href="#([^"]+)"/g, `$1href="#i${n}-$2"`);

let n = 0;
for (const ch of [...found].sort()) {
  const spec = MAP[ch];
  if (!spec) { missing.push(ch); continue; }
  const [src, name, tint] = spec;
  n += 1;
  if (src === 'T') {
    out[ch] = `<rect x="2" y="5" width="28" height="22" rx="7" fill="${tint}"/><text x="16" y="21" text-anchor="middle" font-family="Nunito,system-ui,sans-serif" font-weight="900" font-size="${name.length > 2 ? 11 : 14}" fill="#fff">${name}</text>`;
    continue;
  }
  const set = sets[src];
  const icon = set.icons[name];
  if (!icon) { missing.push(`${ch} (${src}:${name})`); continue; }
  const size = set.width || icon.width || 24;
  if (src === 'G') {
    const [top, bottom = top] = tint.split(',');
    const grad = `<defs><linearGradient id="i${n}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`;
    const body = icon.body.replace(/currentColor/g, `url(#i${n}-g)`);
    // soft tinted disc behind the silhouette so these read as stickers next to the colour icons
    out[ch] = `${grad}<circle cx="16" cy="16" r="15" fill="${bottom}" opacity=".16"/><g transform="translate(3.5 3.5) scale(${(25 / size).toFixed(5)})">${body}</g>`;
  } else {
    out[ch] = wrap(src, size, tag(n, icon.body));
  }
}

const header = '// GENERATED by scripts/build-emoji-icons.mjs. Artwork: Streamline Plump/Flex Color (CC BY 4.0, streamlinehq.com) and Game-Icons.net (CC BY 3.0).\n';
fs.writeFileSync(path.join(root, 'frontend/src/icons/emojiIcons.generated.js'), `${header}export const ICON_SIZE = ${ICON};\nexport const ICONS = ${JSON.stringify(out)};\n`);
console.log(`icons: ${Object.keys(out).length}/${found.size}`);
if (missing.length) console.log('no mapping / missing:', missing.join(', '));
