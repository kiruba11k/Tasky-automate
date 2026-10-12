import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck, Info, X } from 'lucide-react';
import { cn } from './cn';
import { useToastStore } from './toast';

const ICON_TONE_CLASSES = {
  success: 'bg-mint-soft text-mint-ink',
  info: 'bg-sky-soft text-sky-ink',
  celebrate: 'bg-lavender-soft text-lavender-ink',
};

const STRIPE_TONE_CLASSES = {
  success: 'before:bg-mint-strong',
  info: 'before:bg-sky-strong',
  celebrate: 'before:bg-lavender-strong',
};

function ToastItem({ item }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(item.durationMs);
  const startedRef = useRef(Date.now());

  useEffect(() => {
    if (paused) return undefined;
    startedRef.current = Date.now();
    const timer = window.setTimeout(() => dismiss(item.id), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(800, remainingRef.current - (Date.now() - startedRef.current));
    };
  }, [paused, dismiss, item.id]);

  const FallbackIcon = item.tone === 'info' ? Info : CircleCheck;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-tone={item.tone}
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl border border-line/70 bg-surface py-3 pl-4 pr-2 shadow-lift',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        STRIPE_TONE_CLASSES[item.tone],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          ICON_TONE_CLASSES[item.tone],
        )}
      >
        {item.emoji ? (
          <span className="text-base leading-none">{item.emoji}</span>
        ) : (
          <FallbackIcon className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-semibold leading-snug text-ink">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss"
        className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </motion.li>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] w-[min(380px,calc(100vw-2rem))]"
    >
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

export default Toaster;
