/** Variant class map shared by Button and IconButton (original: `AI`). */
export const BUTTON_VARIANT_CLASSES = {
  primary:
    'bg-accent text-accent-on shadow-soft hover:brightness-110 dark:hover:brightness-105',
  secondary:
    'border border-line bg-surface text-ink hover:border-faint/50 hover:bg-surface-2',
  soft: 'bg-accent-soft text-accent-ink hover:brightness-[0.97] dark:hover:brightness-125',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
};

/** Button size class map (original: `Pz`). */
export const BUTTON_SIZE_CLASSES = {
  sm: 'h-8 gap-1.5 rounded-xl px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-5 text-base',
};

/** Button icon size class map (original: `xg`). */
export const BUTTON_ICON_CLASSES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
