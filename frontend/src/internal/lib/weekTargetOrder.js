// The order of the rows of the Weekly targets table: rows of one project sit together by default, and a person can move rows up and down.

/**
 * `items` in the order to show them: first the rows the person has put in order (`order`: item keys, saved with the week), then the rest
 * with the rows of one project together (in the order the projects first appear); the rows of one date range always stay together.
 */
export function orderItems(items, order = []) {
  const rank = new Map(order.map((k, i) => [k, i]));
  const entries = items.map((item, i) => ({ item, i }));
  const saved = entries.filter((e) => rank.has(e.item.key)).sort((a, b) => rank.get(a.item.key) - rank.get(b.item.key));
  const projectFirst = new Map();
  entries.forEach(({ item }) => {
    const k = `${item.range}|${item.projectName}`;
    if (!projectFirst.has(k)) projectFirst.set(k, projectFirst.size);
  });
  const fresh = entries
    .filter((e) => !rank.has(e.item.key))
    .sort((a, b) => projectFirst.get(`${a.item.range}|${a.item.projectName}`) - projectFirst.get(`${b.item.range}|${b.item.projectName}`) || a.i - b.i);
  const all = [...saved, ...fresh];
  const rangeFirst = new Map();
  all.forEach(({ item }) => rangeFirst.has(item.range) || rangeFirst.set(item.range, rangeFirst.size));
  return all
    .map((e, pos) => ({ ...e, pos }))
    .sort((a, b) => rangeFirst.get(a.item.range) - rangeFirst.get(b.item.range) || a.pos - b.pos)
    .map((e) => e.item);
}

/** The keys in the order after moving `key` one place up (-1) or down (1); unchanged at the ends. */
export function moveKey(keys, key, dir) {
  const i = keys.indexOf(key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= keys.length) return keys;
  const next = [...keys];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
