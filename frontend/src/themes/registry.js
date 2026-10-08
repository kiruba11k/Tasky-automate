// Theme registry. A theme is a plain object; built-ins live in ./packs/*.js and are discovered automatically,
// so adding a theme means dropping one file in that folder (or calling registerTheme at runtime).
const packs = import.meta.glob('./packs/*.js', { eager: true });
const themes = new Map();

export function registerTheme(def) {
  if (!def?.id || !['light', 'dark'].includes(def.mode)) throw new Error('A theme needs an id and a mode (light | dark)');
  themes.set(def.id, def);
  return def;
}

Object.values(packs).forEach((m) => registerTheme(m.default));

export const DEFAULT_THEME_ID = 'midnight';
export const getTheme = (id) => themes.get(id);
export const listThemes = (mode) => [...themes.values()].filter((t) => !mode || t.mode === mode).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
