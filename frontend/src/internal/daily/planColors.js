// Colours for the blocks of a day plan: the blocks next to each other never share a colour.

/** The block id a colour belongs to: a block that lunch split in two ("a" and "a~2") is one piece of work and keeps one colour. */
export const colorKey = (id) => String(id).split('~')[0];


/**
 * Map of block id to colour. Blocks are taken in time order; each wants its project's colour (`preferred(block)`, or none for other / custom
 * work) and gets it unless the block before has it, or the block after wants it and another colour is free. Otherwise the next palette colour
 * that differs from its neighbours. A block split by lunch keeps one colour.
 */
export function planColors(blocks, preferred, palette) {
  const order = [];
  [...blocks].sort((a, b) => a.start.localeCompare(b.start)).forEach((b) => {
    const k = colorKey(b.id);
    if (!order.some((o) => o.key === k)) order.push({ key: k, want: preferred(b) });
  });
  const given = new Map();
  order.forEach((o, i) => {
    const before = i > 0 ? given.get(order[i - 1].key) : undefined;
    const after = order[i + 1]?.want;
    const start = Math.max(0, palette.indexOf(o.want));
    const rotation = palette.map((_, n) => palette[(start + n) % palette.length]);
    const pick = rotation.find((c) => c !== before && c !== after) ?? rotation.find((c) => c !== before) ?? rotation[0];
    given.set(o.key, o.want && o.want !== before ? o.want : pick);
  });
  const out = new Map();
  blocks.forEach((b) => out.set(b.id, given.get(colorKey(b.id))));
  return out;
}
