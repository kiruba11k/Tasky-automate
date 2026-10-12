/**
 * Parse a duration typed by the user ("45m", "1h 30m", "1:30", "90", ".5") into minutes.
 * Returns null for empty input and NaN when it cannot be understood.
 */
export function parseDuration(input) {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;
  let m = text.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return +m[1] * 60 + +m[2];
  m = text.match(/^(\d+(?:\.\d+)?) ?(?:h|hr|hrs|hour|hours)(?: ?(\d+) ?(?:m|min|mins|minutes?)?)?$/);
  if (m) return Math.round(parseFloat(m[1]) * 60 + (m[2] ? +m[2] : 0));
  m = text.match(/^(\d+) ?(?:m|min|mins|minutes?)$/);
  if (m) return +m[1];
  if (/^\d+$/.test(text)) return +text;
  if (/^\d*\.\d+$/.test(text)) return Math.round(parseFloat(text) * 60);
  return NaN;
}

export default parseDuration;
