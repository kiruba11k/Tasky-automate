import { buildCustomTheme, validateCustomSpec } from './custom.js';
import { DEFAULT_THEME_ID, getTheme } from './registry.js';

const KEY = 'tasky_theme_prefs';
const DEFAULTS = { id: DEFAULT_THEME_ID, auto: false, light: 'sunny-day', dark: DEFAULT_THEME_ID, custom: null };

export function loadPrefs() {
  try {
    const p = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (p.custom && validateCustomSpec(p.custom)) p.custom = null;
    return p;
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the choice still applies for this session */ }
}

const systemDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Which theme definition the preferences select right now (falls back to the default if a theme pack disappeared). */
export function pickDefinition(p) {
  const id = p.auto ? (systemDark() ? p.dark : p.light) : p.id;
  if (id === 'custom' && p.custom) return buildCustomTheme(p.custom);
  return getTheme(id) || getTheme(DEFAULT_THEME_ID);
}
