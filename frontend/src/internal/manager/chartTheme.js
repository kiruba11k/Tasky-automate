import { useMemo, useSyncExternalStore } from 'react';
import { Se as useStore, $e as dayKey } from '@/internal/min';

/** Colour families read from CSS variables. (bundle: B0) */
export const COLOR_FAMILIES = ['mint', 'sky', 'peach', 'lavender', 'butter', 'coral', 'grey'];

/** Reads CSS var --c-<name> ("r g b") and returns an rgb() string. (bundle: jr) */
export function readColor(style, name, fallback = '0 0 0') {
  const raw = style.getPropertyValue(`--c-${name}`).trim() || fallback;
  const [r, g, b] = raw.split(/[\s,]+/).map((n) => Number(n) || 0);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Snapshot of the current theme colours for charts. (bundle: rle) */
export function readChartColors() {
  const style = getComputedStyle(document.documentElement);
  const strong = Object.fromEntries(COLOR_FAMILIES.map((n) => [n, readColor(style, `${n}-strong`)]));
  const soft = Object.fromEntries(COLOR_FAMILIES.map((n) => [n, readColor(style, `${n}-soft`)]));
  const inkOf = Object.fromEntries(COLOR_FAMILIES.map((n) => [n, readColor(style, `${n}-ink`)]));
  return {
    ...strong,
    ink: readColor(style, 'ink'),
    muted: readColor(style, 'muted'),
    faint: readColor(style, 'faint'),
    line: readColor(style, 'line'),
    surface: readColor(style, 'surface'),
    surface2: readColor(style, 'surface-2'),
    accent: readColor(style, 'accent'),
    accentSoft: readColor(style, 'accent-soft'),
    soft,
    inkOf,
  };
}

/** Subscribes to theme / accent attribute changes. (bundle: ile) */
function subscribeTheme(callback) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-accent'],
  });
  return () => observer.disconnect();
}

/** Current theme key. (bundle: ale) */
function themeSnapshot() {
  const { theme = 'light', accent = 'lavender' } = document.documentElement.dataset;
  return `${theme}|${accent}`;
}

/** Theme-aware colours for chart drawing. (bundle: Ws) */
export function useChartColors() {
  const key = useSyncExternalStore(subscribeTheme, themeSnapshot, () => 'light|lavender');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readChartColors(), [key]);
}

/** tasks + daily + projects, memoised as one object. (bundle: wp) */
export function useDataSnapshot() {
  const tasks = useStore((s) => s.tasks);
  const daily = useStore((s) => s.daily);
  const projects = useStore((s) => s.projects);
  return useMemo(() => ({ tasks, daily, projects }), [tasks, daily, projects]);
}

/** Earliest task date (or today). (bundle: ek) */
export function useEarliestTaskDate() {
  const tasks = useStore((s) => s.tasks);
  return useMemo(() => tasks.reduce((min, t) => (t.date < min ? t.date : min), dayKey(0)), [tasks]);
}
