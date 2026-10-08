// Theme preferences live on the user so they follow people across devices. Custom themes are a tiny spec that the client expands;
// it is validated strictly here so nothing but plain colour values and a name can ever be stored.
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9-]{1,40}$/;

export function validateCustomSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return 'theme_custom must be an object';
  if (typeof spec.name !== 'string' || !spec.name.trim() || spec.name.length > 30) return 'Theme name must be 1-30 characters';
  if (!['light', 'dark'].includes(spec.mode)) return 'Theme mode must be light or dark';
  if (!HEX.test(spec.primary) || !HEX.test(spec.secondary)) return 'Theme colours must be #rrggbb';
  const { hue, sat } = spec.neutral || {};
  if (!Number.isFinite(hue) || hue < 0 || hue > 360 || !Number.isFinite(sat) || sat < 0 || sat > 100) return 'Theme tint is out of range';
  return null;
}

/** Returns an error message, or null when the theme fields in `body` are acceptable. */
export function validateThemePrefs(body) {
  if (body.theme !== undefined && (typeof body.theme !== 'string' || !ID.test(body.theme))) return 'Invalid theme id';
  if (body.theme_auto !== undefined && typeof body.theme_auto !== 'boolean') return 'theme_auto must be true or false';
  if (body.theme_at !== undefined && (!Number.isFinite(body.theme_at) || body.theme_at < 0)) return 'Invalid theme_at';
  if (body.theme_custom !== undefined && body.theme_custom !== '' && body.theme_custom !== null) {
    if (typeof body.theme_custom !== 'string' || body.theme_custom.length > 600) return 'theme_custom is too large';
    let parsed;
    try { parsed = JSON.parse(body.theme_custom); } catch { return 'theme_custom must be valid JSON'; }
    return validateCustomSpec(parsed);
  }
  return null;
}
