/** RFC 7386 merge patch that turns `from` into `to`, or undefined when equal. Arrays are replaced whole. */
export function diffPatch(from, to) {
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!isObj(from) || !isObj(to)) return JSON.stringify(from) === JSON.stringify(to) ? undefined : to;
  const patch = {};
  for (const k of Object.keys(to)) {
    if (to[k] === undefined) continue;
    const d = diffPatch(from[k], to[k]);
    if (d !== undefined) patch[k] = d;
  }
  for (const k of Object.keys(from)) if (!(k in to) || to[k] === undefined) patch[k] = null;
  return Object.keys(patch).length ? patch : undefined;
}
