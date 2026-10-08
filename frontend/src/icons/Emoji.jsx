import React from 'react';
import { ICONS } from './emojiIcons.generated';
import { stripVariation } from './emojiUrl';

/** A cartoon illustration standing in for an emoji character (same artwork on every device). */
export function Emoji({ e, size = '1.15em', label, className = '' }) {
  const body = ICONS[stripVariation(e)];
  if (!body) return <span className={className}>{e}</span>;
  return (
    <svg
      viewBox="0 0 32 32" width={size} height={size}
      className={`inline-block shrink-0 align-[-0.22em] ${className}`}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|\p{Emoji_Modifier})*)/gu;

/** Renders a string with every emoji swapped for its cartoon illustration. */
export function Rich({ text, size }) {
  if (!text) return null;
  return String(text).split(EMOJI_RE).map((part, i) => (i % 2 ? <Emoji key={i} e={part} size={size} /> : part));
}
