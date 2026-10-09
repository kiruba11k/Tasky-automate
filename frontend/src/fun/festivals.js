// Fixed-date festivals (month is 1-12). Floating ones (Diwali, Eid, Pongal) are listed for the current year range.
const FIXED = [
  { id: 'newyear', m: 1, d: 1, name: 'New Year', greet: 'Happy New Year!', hue: '#f59e0b', icon: '🎉' },
  { id: 'pongal', m: 1, d: 14, span: 3, name: 'Pongal', greet: 'Happy Pongal!', hue: '#eab308', icon: '☀' },
  { id: 'republic', m: 1, d: 26, name: 'Republic Day', greet: 'Happy Republic Day!', hue: '#16a34a', icon: '🌟' },
  { id: 'valentine', m: 2, d: 14, name: 'Valentine’s Day', greet: 'Happy Valentine’s Day!', hue: '#ec4899', icon: '❤' },
  { id: 'independence', m: 8, d: 15, name: 'Independence Day', greet: 'Happy Independence Day!', hue: '#f97316', icon: '🌟' },
  { id: 'halloween', m: 10, d: 31, name: 'Halloween', greet: 'Happy Halloween!', hue: '#f97316', icon: '🦉' },
  { id: 'christmas', m: 12, d: 25, span: 2, name: 'Christmas', greet: 'Merry Christmas!', hue: '#16a34a', icon: '❄' },
];
const DIWALI = { 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5] };

/** The festival happening on a date (or null). */
export function festivalOn(date = new Date()) {
  const y = date.getFullYear();
  const day = new Date(y, date.getMonth(), date.getDate()).getTime();
  const list = [...FIXED];
  if (DIWALI[y]) list.push({ id: 'diwali', m: DIWALI[y][0], d: DIWALI[y][1], span: 3, name: 'Diwali', greet: 'Happy Diwali!', hue: '#f59e0b', icon: '✨' });
  return list.find((f) => {
    const start = new Date(y, f.m - 1, f.d).getTime();
    return day >= start && day < start + (f.span || 1) * 864e5;
  }) || null;
}
