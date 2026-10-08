// A user-made theme is a tiny, validated spec; everything else (shades, surfaces, contrast fixes) is derived from it.
const HEX = /^#[0-9a-fA-F]{6}$/;

export function validateCustomSpec(spec) {
  if (!spec || typeof spec !== 'object') return 'Not a theme';
  if (typeof spec.name !== 'string' || !spec.name.trim() || spec.name.length > 30) return 'Give your theme a name (up to 30 characters)';
  if (!['light', 'dark'].includes(spec.mode)) return 'Mode must be light or dark';
  if (!HEX.test(spec.primary) || !HEX.test(spec.secondary)) return 'Colours must look like #3b82f6';
  const { hue, sat } = spec.neutral || {};
  if (!Number.isFinite(hue) || hue < 0 || hue > 360 || !Number.isFinite(sat) || sat < 0 || sat > 100) return 'Tint hue must be 0-360 and strength 0-100';
  return null;
}

/** Spec -> full theme definition understood by the engine. */
export function buildCustomTheme(spec) {
  const error = validateCustomSpec(spec);
  if (error) throw new Error(error);
  return {
    id: 'custom', order: 99, mode: spec.mode, name: spec.name.trim(), tagline: 'Made by you', icon: '🎨', custom: true, cartoon: true,
    neutral: { hue: Math.round(spec.neutral.hue), sat: Math.round(spec.neutral.sat) },
    primary: spec.primary.toLowerCase(), secondary: spec.secondary.toLowerCase(), accent: spec.primary.toLowerCase(), accent2: spec.secondary.toLowerCase(),
    mascot: [spec.primary.toLowerCase(), spec.secondary.toLowerCase()],
    pattern: `radial-gradient(circle, ${spec.primary}26 2px, transparent 2.5px)`, patternSize: '36px 36px',
  };
}

export const DEFAULT_SPEC = { name: 'My theme', mode: 'dark', neutral: { hue: 230, sat: 30 }, primary: '#8b5cf6', secondary: '#f59e0b' };
