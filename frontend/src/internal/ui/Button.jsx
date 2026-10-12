import { cx } from './cx';

/** Button with tone variants primary | soft | ghost (original: `Te`). */
export function Button({ tone = 'primary', className, ...props }) {
  return (
    <button
      {...props}
      className={cx(
        'focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50',
        tone === 'primary' && 'bg-accent text-accent-on hover:opacity-90',
        tone === 'soft' && 'bg-accent-soft text-accent-ink hover:opacity-90',
        tone === 'ghost' && 'text-muted hover:bg-surface-2',
        className,
      )}
    />
  );
}

export default Button;
