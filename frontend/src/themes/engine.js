import { DEFAULTS, FAMILIES } from './tailwind-palette.generated.js';
import { contrast, hexToRgb, hslHex, hslTriplet, mix, rgbToHex, rgbToHsl, triplet } from './color.js';

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Lightness (%) of each neutral step. Dark themes follow Tailwind's slate; in light themes the same class names keep their *role*
// (950 = page, 900 = card, 800 = inset, 400 = muted text ...) so every existing `bg-slate-*` / `text-slate-*` class re-themes itself.
const L_DARK = { 50: 97, 100: 94, 200: 89, 300: 80, 400: 63, 500: 47, 600: 35, 700: 25, 800: 17, 900: 11, 950: 6 };
const L_LIGHT = { 50: 8, 100: 12, 200: 17, 300: 25, 400: 33, 500: 50, 600: 70, 700: 84, 800: 92, 900: 100, 950: 96 };

const neutralScale = (mode, hue, sat) => Object.fromEntries(STEPS.map((s) => {
  const l = (mode === 'light' ? L_LIGHT : L_DARK)[s];
  // keep very light tints subtle, and text shades of light themes nearly neutral so they stay legible on tinted surfaces
  const k = l > 88 ? 0.55 : mode === 'light' && s <= 400 ? 0.5 : 1;
  return [s, hslHex(hue, Math.min(100, sat * k), l)];
}));

/**
 * 11-stop scale from one base colour (placed at 500). The 600+ shades are darkened automatically until white text on
 * bg-*-600 reaches WCAG AA, whatever base colour a theme (or a user's custom theme) picks.
 */
export function scaleFrom(base) {
  const lights = [0.93, 0.85, 0.7, 0.5, 0.25];
  const out = {};
  [50, 100, 200, 300, 400].forEach((s, i) => { out[s] = mix(base, '#ffffff', lights[i]); });
  out[500] = base;
  let t = 0.18;
  while (t < 0.9 && contrast('#ffffff', mix(base, '#000000', t)) < 4.5) t += 0.02;
  [600, 700, 800, 900, 950].forEach((s, i) => { out[s] = mix(base, '#000000', Math.min(0.96, t + [0, 0.14, 0.28, 0.42, 0.56][i])); });
  return out;
}

// In light themes the pale shades (used for text on dark backgrounds) are swapped for their dark counterparts.
const LIGHT_SWAP = { 50: 950, 100: 900, 200: 800, 300: 800, 400: 600 };
const lightSwap = (scale) => Object.fromEntries(STEPS.map((s) => [s, scale[LIGHT_SWAP[s] ?? s]]));

const hex = (rgb) => rgbToHex(rgb);
const withAlpha = (h, a) => `rgb(${triplet(h)} / ${a})`;

/**
 * Turns a theme definition into everything the app needs:
 *  vars   – CSS custom properties to set on <html>
 *  tokens – resolved hex colours (previews and contrast tests)
 */
export function resolveTheme(def) {
  const light = def.mode === 'light';
  const native = def.native === true; // "Midnight": exactly the original Tailwind look
  const slate = native ? DEFAULTS.slate : neutralScale(def.mode, def.neutral?.hue ?? 222, def.neutral?.sat ?? 25);
  const primaryRaw = native ? DEFAULTS.blue : scaleFrom(def.primary);
  const secondaryRaw = native ? DEFAULTS.purple : scaleFrom(def.secondary);

  const families = {};
  for (const f of FAMILIES) {
    if (f === 'slate' || f === 'gray') families[f] = slate;
    else if (f === 'blue') families[f] = light ? lightSwap(primaryRaw) : primaryRaw;
    else if (f === 'purple') families[f] = light ? lightSwap(secondaryRaw) : secondaryRaw;
    else families[f] = light ? lightSwap(DEFAULTS[f]) : DEFAULTS[f];
  }

  const ink = light ? hslHex(def.neutral?.hue ?? 222, Math.min(40, (def.neutral?.sat ?? 25) + 10), 8) : '#ffffff';
  const t = {
    page: slate[950], card: slate[900], inset: slate[800], border: slate[700], text: ink,
    text2: slate[300], muted: slate[400], primary: primaryRaw[500], primary600: primaryRaw[600], primary700: primaryRaw[700],
    primaryText: families.blue[400], secondary: secondaryRaw[500], families,
  };

  const vars = { '--c-white': triplet(ink) };
  for (const f of FAMILIES) for (const s of STEPS) vars[`--${f}-${s}`] = triplet(families[f][s]);

  const accentA = def.accent || '#10b981';
  Object.assign(vars, {
    '--accent-green': accentA, '--accent-green-rgb': triplet(accentA),
    '--accent-blue': primaryRaw[500], '--accent-blue-rgb': triplet(primaryRaw[500]),
    '--accent-purple': secondaryRaw[500], '--accent-purple-rgb': triplet(secondaryRaw[500]),
    '--accent-pink': def.accent2 || '#ec4899', '--accent-pink-rgb': triplet(def.accent2 || '#ec4899'),
    '--line-a': triplet(accentA), '--line-b': triplet(primaryRaw[500]),
    '--mascot-a': def.mascot?.[0] || accentA, '--mascot-b': def.mascot?.[1] || primaryRaw[500],
    '--bg-tertiary': slate[700],
    '--ink': light ? '#1e293b' : '#0b1220',
    '--outline': light ? hslHex(def.neutral?.hue ?? 222, 30, 16) : slate[950],
    '--hard-shadow': light ? withAlpha(hslHex(def.neutral?.hue ?? 222, 30, 16), 0.28) : 'rgba(0, 0, 0, 0.45)',
    '--page-bg': def.pageBg || (light ? `linear-gradient(135deg, ${slate[950]}, ${mix(slate[950], primaryRaw[500], 0.08)}, ${slate[950]})` : native
      ? 'linear-gradient(135deg, #000000, #050507, #0a0a0e, #0f0f15, #0a0a0e, #050507, #000000)'
      : `linear-gradient(135deg, ${mix(slate[950], '#000000', 0.5)}, ${slate[950]}, ${mix(slate[900], '#000000', 0.2)}, ${slate[950]}, ${mix(slate[950], '#000000', 0.5)})`),
    '--page-pattern': def.pattern || 'none',
    '--glass-bg': light ? withAlpha(slate[900], 0.82) : native ? 'rgba(15, 23, 42, 0.65)' : withAlpha(slate[900], 0.7),
    '--glass-border': light ? withAlpha(slate[600], 0.55) : native ? 'rgba(16, 185, 129, 0.3)' : withAlpha(accentA, 0.3),
    '--glass-shadow': light ? `0 6px 22px 0 ${withAlpha(slate[500], 0.18)}` : native ? '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.1)' : `0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 15px ${withAlpha(accentA, 0.12)}`,
    '--nav-bg': light ? withAlpha(slate[900], 0.86) : native ? 'rgba(0, 0, 0, 0.8)' : withAlpha(mix(slate[950], '#000000', 0.4), 0.85),
    '--line-opacity': light ? '0.35' : '1',
  });

  // shadcn/ui tokens (HSL triplets without the hsl() wrapper)
  const h = hslTriplet;
  Object.assign(vars, {
    '--background': h(slate[950]), '--foreground': h(ink),
    '--card': h(slate[900]), '--card-foreground': h(ink),
    '--popover': h(slate[900]), '--popover-foreground': h(ink),
    '--primary': h(primaryRaw[600]), '--primary-foreground': h('#ffffff'),
    '--secondary': h(slate[800]), '--secondary-foreground': h(ink),
    '--muted': h(slate[800]), '--muted-foreground': h(slate[400]),
    '--accent': h(slate[800]), '--accent-foreground': h(ink),
    '--destructive': light ? h(DEFAULTS.red[600]) : h(DEFAULTS.red[900]), '--destructive-foreground': h('#ffffff'),
    '--border': h(slate[700]), '--input': h(slate[700]), '--ring': h(primaryRaw[500]),
  });

  return { vars, tokens: t, mode: def.mode };
}

export { hexToRgb, rgbToHsl };
