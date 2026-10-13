import * as React from 'react';
import { Ico, iconFor } from '@/icons/Ico';

// Every emoji in text that React renders becomes an icon. This wraps the JSX runtime (see vite.config.js: jsxImportSource),
// so it covers all the site's text at once instead of editing hundreds of strings. Emoji with no icon stay as characters.
const EMOJI = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|\p{Emoji_Modifier})*|[★✓✕])/gu;
const TEXT_ONLY = new Set(['option', 'textarea', 'title', 'style', 'script', 'input', 'text', 'tspan', 'code', 'pre']); // places that can only hold text

function convert(str) {
  if (!EMOJI.test(str)) return str;
  EMOJI.lastIndex = 0;
  const parts = str.split(EMOJI);
  let changed = false;
  const out = parts.map((part, i) => {
    if (i % 2 === 1 && iconFor(part)) { changed = true; return React.createElement(Ico, { key: `e${i}`, e: part }); }
    return part;
  });
  return changed ? out : str;
}

function mapChildren(children) {
  if (typeof children === 'string') return convert(children);
  if (Array.isArray(children)) {
    let changed = false;
    const out = children.map((c) => { if (typeof c === 'string') { const r = convert(c); if (r !== c) changed = true; return r; } return c; });
    return changed ? out.flat() : children;
  }
  return children;
}

export function patch(type, props) {
  if (!props || props.children == null || (typeof type === 'string' && TEXT_ONLY.has(type))) return props;
  const kids = mapChildren(props.children);
  return kids === props.children ? props : { ...props, children: kids };
}
