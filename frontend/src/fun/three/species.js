// Character sheet for the 3D cast. Everything is built from primitives in Critter3D.jsx (no external models, nothing to download).
// All characters are original designs.
export const SPECIES = {
  cat: { name: 'Whiskers', body: '#8fa3c4', belly: '#eef2fa', ear: 'tri', earIn: '#f9a8c0', tail: 'long', nose: '#f48fb1', whisk: true, feet: '#7488ab' },
  tabby: { name: 'Marmalade', body: '#f6a35f', belly: '#fff0dc', ear: 'tri', earIn: '#f9a8c0', tail: 'long', nose: '#f48fb1', whisk: true, stripes: '#e07a2f', feet: '#e58c46' },
  mouse: { name: 'Squeaks', body: '#c9b8a6', belly: '#fbeee0', ear: 'round', earBig: true, earIn: '#f9a8c0', tail: 'thin', nose: '#f48fb1', whisk: true, feet: '#d9a9a0' },
  fox: { name: 'Ember', body: '#f08a3c', belly: '#fff3e2', ear: 'tri', earIn: '#3b2a22', tail: 'bushy', nose: '#2b2321', muzzle: '#fff3e2', feet: '#3b2a22' },
  panda: { name: 'Bamboo', body: '#f4f4f2', belly: '#ffffff', ear: 'round', earColor: '#26262b', tail: 'puff', nose: '#26262b', patches: '#26262b', limbs: '#26262b', feet: '#26262b' },
  bunny: { name: 'Clover', body: '#f3e9ff', belly: '#ffffff', ear: 'long', earIn: '#f9a8c0', tail: 'puff', nose: '#f48fb1', feet: '#e6d6fa' },
  bear: { name: 'Honey', body: '#b7794a', belly: '#e8c39a', ear: 'round', earIn: '#e8c39a', tail: 'puff', nose: '#2b2321', muzzle: '#e8c39a', feet: '#8f5a33' },
  dog: { name: 'Biscuit', body: '#d9b27c', belly: '#fff3de', ear: 'floppy', earColor: '#8f5f33', tail: 'short', nose: '#2b2321', muzzle: '#fff3de', feet: '#c6985f' },
  owl: { name: 'Hoot', body: '#9b7653', belly: '#f1dfc2', ear: 'tuft', tail: 'none', beak: '#fbbf24', wings: true, feet: '#fbbf24', disc: '#f1dfc2' },
  penguin: { name: 'Waddles', body: '#2f3a52', belly: '#ffffff', ear: 'none', tail: 'none', beak: '#fb923c', wings: true, feet: '#fb923c', disc: '#ffffff' },
  dino: { name: 'Rexy', body: '#5cc98a', belly: '#e9f9c8', ear: 'none', tail: 'dino', nose: '#2b6a4a', spikes: '#f59e0b', muzzle: '#5cc98a', feet: '#47ad74' },
  robot: { name: 'Tasky', body: '#3b9cf5', belly: '#cfe9ff', ear: 'none', tail: 'none', robot: true, feet: '#0f766e' },
};

export const SPECIES_IDS = Object.keys(SPECIES);

/** Which buddy keeps you company on which page (people can pin their favourite in settings). */
export const PAGE_BUDDY = {
  Dashboard: 'cat', Management: 'owl', ProjectManagement: 'fox', DailyTasks: 'robot', WeeklyTasks: 'panda',
  Analytics: 'penguin', Tasks: 'bunny', Team: 'dog', AIAllocation: 'bear', SheetsSetup: 'dino', Login: 'mouse',
};

export const buddyFor = (page, pref) => (pref && pref !== 'auto' && SPECIES[pref] ? pref : PAGE_BUDDY[page] || 'robot');

let webgl;
/** True when this browser can draw 3D; callers fall back to the 2D art otherwise. */
export function hasWebGL() {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webgl = false; }
  return webgl;
}
