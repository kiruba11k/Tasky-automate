import { useMemo } from 'react';
import { useTheme } from './theme';

/** Floating background emoji for the fun themes (original: `xU`). */
export function FloatingDoodles() {
  const theme = useTheme();
  const items = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        i,
        left: (i * 37) % 100,
        top: (i * 53) % 100,
        delay: (i % 6) * 1.1,
        size: 18 + ((i * 7) % 16),
      })),
    [],
  );
  if (!theme.funExtras || !theme.floaters.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.i}
          className="ls-float absolute opacity-40"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            animationDelay: `${item.delay}s`,
            fontSize: item.size,
          }}
        >
          {theme.floaters[item.i % theme.floaters.length]}
        </span>
      ))}
    </div>
  );
}

export default FloatingDoodles;
