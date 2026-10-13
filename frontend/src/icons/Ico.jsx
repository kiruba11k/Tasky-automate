import { EMOJI_ICONS, ICON_COLORS } from './emojiMap';

const VS16 = /️/g;
export const iconFor = (e) => EMOJI_ICONS[String(e).replace(VS16, '')];

/** An icon (Lucide) standing in for an emoji. Returns null when there is no icon for it. */
export function Ico({ e, size = '1.15em', className = '', label }) {
  const hit = iconFor(e);
  if (!hit) return null;
  const [Icon, color] = hit;
  return (
    <Icon
      width={size} height={size} strokeWidth={2.2} color={ICON_COLORS[color]}
      className={`inline-block shrink-0 align-[-0.2em] ${className}`}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    />
  );
}

export default Ico;
