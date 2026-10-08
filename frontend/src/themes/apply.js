import { resolveTheme } from './engine.js';

/** Sets the theme's CSS variables on <html>. Cheap enough to run on every switch; no reload needed. */
export function applyTheme(def) {
  const { vars } = resolveTheme(def);
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.setProperty('--page-pattern-size', def.patternSize || 'auto');
  root.dataset.theme = def.id;
  root.dataset.mode = def.mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolveTheme(def).tokens.page);
}
