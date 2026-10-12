import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from './cn';
import { IconButton } from './IconButton';
import { useFocusTrap } from './useFocusTrap';

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
  closeOnOverlay = true,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useFocusTrap(open, dialogRef, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] dark:bg-bg/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOnOverlay ? onClose : undefined}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-card border border-line/70 bg-surface shadow-lift outline-none sm:max-h-[85vh] sm:rounded-card',
              SIZE_CLASSES[size],
              className,
            )}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            <div className="flex items-start gap-3 px-6 pb-2 pt-5">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-bold leading-snug">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
              <IconButton
                label="Close"
                icon={X}
                size="sm"
                onClick={onClose}
                className="-mr-2 -mt-1"
                showTooltip={false}
              />
            </div>
            <div data-dialog-body className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
              {children}
            </div>
            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/70 bg-surface-2/50 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default Modal;
