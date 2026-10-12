import React, { forwardRef } from 'react';
import { cn } from './cn';
import { Tooltip } from './Tooltip';
import { BUTTON_VARIANT_CLASSES } from './buttonStyles';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

const ICON_SIZE_CLASSES = { sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-5 w-5' };

export const IconButton = forwardRef(function IconButton(
  {
    label,
    icon: Icon,
    badge,
    variant = 'ghost',
    size = 'md',
    tooltipSide = 'bottom',
    showTooltip = true,
    className,
    type = 'button',
    disabled,
    ...rest
  },
  ref,
) {
  const hasBadge = typeof badge === 'number' && badge > 0;
  const button = (
    <button
      ref={ref}
      type={type}
      aria-label={hasBadge ? `${label} (${badge})` : label}
      disabled={disabled}
      className={cn(
        'focus-ring relative inline-flex shrink-0 items-center justify-center transition duration-150 active:scale-95',
        BUTTON_VARIANT_CLASSES[variant],
        variant === 'ghost' && 'text-muted',
        SIZE_CLASSES[size],
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...rest}
    >
      <Icon className={ICON_SIZE_CLASSES[size]} aria-hidden />
      {hasBadge && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-on ring-2 ring-bg"
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
  return showTooltip ? (
    <Tooltip content={label} side={tooltipSide} describe={false}>
      {button}
    </Tooltip>
  ) : (
    button
  );
});

export default IconButton;
