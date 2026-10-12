import { useEffect } from 'react';
import { Se as useStore } from '@/internal/min';
import { useTheme, hexToRgbChannels } from './theme';
import { resolveTheme } from '@/themes/engine';
import { applyTheme } from '@/themes/apply';
import { mix, triplet } from '@/themes/color';

let packKeys = [];
/** Paints a theme from the earlier app onto the tracker's colour tokens (and the fun layer's palette). */
function paintPack(root, def) {
  applyTheme(def);
  const { vars, tokens: t, mode } = resolveTheme(def);
  const dark = mode === 'dark';
  const own = {
    '--c-bg': triplet(t.page), '--c-surface': triplet(t.card), '--c-surface-2': triplet(t.inset), '--c-line': triplet(t.border),
    '--c-ink': triplet(t.text), '--c-muted': triplet(t.muted), '--c-faint': triplet(mix(t.muted, t.page, 0.25)),
    '--c-accent': triplet(t.primary600), '--c-on-accent': '255 255 255',
    '--c-accent-soft': triplet(mix(t.primary, dark ? t.card : '#ffffff', dark ? 0.78 : 0.86)),
    '--c-accent-ink': triplet(dark ? t.families.blue[300] : t.primary700),
  };
  Object.entries(own).forEach(([k, v]) => root.style.setProperty(k, v));
  packKeys = [...Object.keys(vars), '--page-pattern-size', ...Object.keys(own)];
  root.style.setProperty('--page-pattern', def.pattern || 'none');
  packKeys.push('--page-pattern');
}
function clearPack(root) {
  packKeys.forEach((k) => root.style.removeProperty(k));
  packKeys = [];
}

/** Applies the theme to <html> data attributes / CSS variables; renders nothing (original: `vU`). */
export function ThemeEffects() {
  const theme = useTheme();
  const accent = useStore((s) => s.profiles[s.me]?.accent);
  useEffect(() => {
    const root = document.documentElement;
    clearPack(root);
    if (theme.pack) paintPack(root, theme.pack);
    root.dataset.theme = theme.mode;
    root.dataset.accent = theme.fun ? 'brand' : (accent ?? 'brand');
    if (theme.fun) root.dataset.fun = theme.fun;
    else delete root.dataset.fun;
    root.dataset.bg = theme.bg;
    root.dataset.font = theme.font;
    root.dataset.cards = theme.cards;
    if (theme.fun === 'custom') {
      root.style.setProperty('--custom-accent', hexToRgbChannels(theme.custom.accent));
      root.style.setProperty('--custom-accent-soft', theme.mode === 'dark' ? '40 40 70' : '237 233 254');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.theme, theme.mode, theme.bg, theme.font, theme.cards, theme.fun, JSON.stringify(theme.custom), accent]);
  return null;
}

export default ThemeEffects;
