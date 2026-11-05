import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';

/**
 * A one-line text field that wraps and grows as you type, so everything you wrote stays in view instead of scrolling sideways.
 * Same props as an <input> (value, onChange, placeholder, className, aria-label, ...). Enter never adds a line break and pasted line
 * breaks become spaces, so the value is still a single line of text.
 */
export const AutoText = forwardRef(function AutoText({ onChange, onKeyDown, className = '', type: _type, value, ...rest }, outerRef) {
  const inner = useRef(null);
  const setRef = useCallback((el) => {
    inner.current = el;
    if (typeof outerRef === 'function') outerRef(el);
    else if (outerRef) outerRef.current = el;
  }, [outerRef]);
  const fit = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`; // the border sits outside the scroll height
  }, []);
  // grow with the text, and again when the box is resized (a narrower column wraps onto more lines)
  useLayoutEffect(fit, [value, fit]);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let width = el.offsetWidth;
    const watch = new ResizeObserver(() => { if (el.offsetWidth !== width) { width = el.offsetWidth; fit(); } });
    watch.observe(el);
    return () => watch.disconnect();
  }, [fit]);
  return (
    <textarea
      {...rest}
      ref={setRef}
      rows={1}
      value={value ?? ''}
      className={className}
      style={{ ...rest.style, resize: 'none', overflow: 'hidden', lineHeight: 1.35, display: 'block' }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === 'Enter' && !e.defaultPrevented) e.preventDefault(); // one line of text: no line breaks
      }}
      onChange={(e) => {
        if (/[\r\n]/.test(e.target.value)) e.target.value = e.target.value.replace(/\s*[\r\n]+\s*/g, ' ');
        onChange?.(e);
      }}
    />
  );
});
export default AutoText;
