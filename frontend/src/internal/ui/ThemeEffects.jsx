import { useEffect } from 'react';
import { Se as useStore } from '@/internal/min';
import { useTheme, hexToRgbChannels } from './theme';

/** Applies the theme to <html> data attributes / CSS variables; renders nothing (original: `vU`). */
export function ThemeEffects() {
  const theme = useTheme();
  const accent = useStore((s) => s.profiles[s.me]?.accent);
  useEffect(() => {
    const root = document.documentElement;
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
  }, [theme, accent]);
  return null;
}

export default ThemeEffects;
