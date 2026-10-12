import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

const GAP = 8;
const VIEWPORT_PADDING = 8;

function anchorPoint(rect, side) {
  switch (side) {
    case 'bottom':
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2 };
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - GAP };
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + GAP };
    case 'top':
    default:
      return { top: rect.top - GAP, left: rect.left + rect.width / 2 };
  }
}

const TRANSFORMS = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

export function Tooltip({
  content,
  children,
  side = 'top',
  delay = 150,
  describe = true,
  className,
  disabled = false,
}) {
  const id = useId();
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const timerRef = useRef();
  const [pos, setPos] = useState(null);
  const [shift, setShift] = useState(0);

  const show = useCallback(
    (immediate = false) => {
      if (disabled || content == null || content === '') return;
      window.clearTimeout(timerRef.current);
      const open = () => {
        const el = triggerRef.current;
        if (el) {
          setShift(0);
          setPos(anchorPoint(el.getBoundingClientRect(), side));
        }
      };
      if (immediate) open();
      else timerRef.current = window.setTimeout(open, delay);
    },
    [content, delay, disabled, side],
  );

  const hide = useCallback(() => {
    window.clearTimeout(timerRef.current);
    setPos(null);
  }, []);

  useLayoutEffect(() => {
    if (!pos || !tipRef.current) return;
    const rect = tipRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth - VIEWPORT_PADDING) {
      setShift(window.innerWidth - VIEWPORT_PADDING - rect.right);
    } else if (rect.left < VIEWPORT_PADDING) {
      setShift(VIEWPORT_PADDING - rect.left);
    }
  }, [pos]);

  useEffect(() => {
    if (!pos) return undefined;
    const onKey = (e) => e.key === 'Escape' && hide();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', hide, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', hide, true);
    };
  }, [pos, hide]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const trigger =
    describe && pos && isValidElement(children)
      ? cloneElement(children, { 'aria-describedby': id })
      : children;

  return (
    <span
      ref={triggerRef}
      className={cn('inline-flex', className)}
      onMouseEnter={() => show()}
      onMouseLeave={hide}
      onFocus={(e) => {
        const target = e.target;
        if (target.matches?.(':focus-visible')) show(true);
      }}
      onBlur={hide}
      onPointerDown={hide}
    >
      {trigger}
      {pos &&
        createPortal(
          <div
            ref={tipRef}
            id={id}
            role="tooltip"
            style={{ top: pos.top, left: pos.left + shift, transform: TRANSFORMS[side] }}
            className="pointer-events-none fixed z-[80] w-max max-w-xs rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-bg shadow-lift"
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

export default Tooltip;
