import { ICONS } from './emojiIcons.generated';

export const stripVariation = (e) => e.replace(/️/g, '');
export const hasIcon = (e) => Boolean(ICONS[stripVariation(e)]);

/** The cartoon artwork for an emoji as an image URL (used by the DOM-based bursts). Falls back to null when there is none. */
export function emojiImageUrl(e) {
  const body = ICONS[stripVariation(e)];
  if (!body) return null;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${body}</svg>`)}`;
}
