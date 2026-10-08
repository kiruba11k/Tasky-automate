import { applyTheme } from './apply.js';
import { loadPrefs, pickDefinition } from './prefs.js';

/** Runs before React renders so there is no flash of the wrong theme. */
export function bootTheme() {
  try { applyTheme(pickDefinition(loadPrefs())); } catch (e) { console.error('Theme boot failed:', e); }
}
