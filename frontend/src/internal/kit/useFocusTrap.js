import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Visible, focusable descendants of `root` (original: `Mg`). */
export function getFocusable(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute('inert') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getClientRects().length > 0,
  );
}

// Stack of open layers; only the top one reacts to the keyboard.
const layers = [];
let scrollLocks = 0;
let previousOverflow = '';

function lockScroll() {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
}

/**
 * Traps focus inside `containerRef` while `active`, closes on Escape via `onClose`,
 * locks body scroll and restores focus on cleanup.
 */
export function useFocusTrap(active, containerRef, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return undefined;
    const layer = Symbol('layer');
    layers.push(layer);
    lockScroll();
    const previouslyFocused = document.activeElement;

    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || container.contains(document.activeElement)) return;
      const body = container.querySelector('[data-dialog-body]');
      const target =
        container.querySelector('[data-autofocus]') ??
        (body ? getFocusable(body)[0] : undefined) ??
        getFocusable(container)[0] ??
        container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (e) => {
      if (layers[layers.length - 1] !== layer) return;
      const container = containerRef.current;
      if (!container) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusable(container);
        if (items.length === 0) {
          e.preventDefault();
          container.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const current = document.activeElement;
        if (e.shiftKey && (current === first || !container.contains(current))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (current === last || !container.contains(current))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const index = layers.indexOf(layer);
      if (index >= 0) layers.splice(index, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef]);
}

export default useFocusTrap;
