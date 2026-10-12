import { Se as useStore, Qe as PEOPLE } from '@/internal/min';
import { cx } from './cx';
import { TONE_CLASSES } from './Badge';

const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
};

/** Person avatar: photo or initials, optional emoji badge (original: `vt`). */
export function Avatar({ id, size = 'md' }) {
  const person = PEOPLE.find((p) => p.id === id);
  const profile = useStore((s) => s.profiles[id]);
  const name = profile?.name?.trim() || person?.name;
  const initials = name
    ? name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
    : '?';
  const sizeClass = SIZE_CLASSES[size] ?? 'h-24 w-24 text-3xl';
  return (
    <span
      title={name}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        TONE_CLASSES[person?.color ?? 'grey'],
        sizeClass,
      )}
    >
      {profile?.photo ? (
        <img src={profile.photo} alt={name ?? ''} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials
      )}
      {profile?.emoji && size !== 'sm' && (
        <span className="absolute -bottom-1 -right-1 flex h-[1.4em] w-[1.4em] items-center justify-center rounded-full bg-surface text-[0.55em] shadow">
          {profile.emoji}
        </span>
      )}
    </span>
  );
}

export default Avatar;
