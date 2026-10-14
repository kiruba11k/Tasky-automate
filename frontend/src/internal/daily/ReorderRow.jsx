import { Reorder, useDragControls, useReducedMotion } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { oe as cx } from '@/internal/min';
import { SPRING } from './planBlocks';

/** One row of the block lists below the timeline: a grip to drag it up or down, then whatever the row shows. */
export function ReorderRow({ value, onEnd, faded, className, data, children }) {
  const controls = useDragControls();
  const reduced = useReducedMotion();
  return (
    <Reorder.Item
      as="li"
      value={value}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onEnd}
      {...data}
      initial={reduced ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: faded ? 0.5 : 1, x: 0 }}
      exit={{ opacity: 0, x: 24, height: 0 }}
      transition={reduced ? { duration: 0 } : SPRING}
      whileDrag={{ scale: 1.02, boxShadow: '0 14px 30px -10px rgb(0 0 0 / 0.35)', zIndex: 10 }}
      className={cx('relative flex flex-wrap items-center gap-2 px-3 py-2 text-sm', className)}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        title="Drag up or down"
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        className="-ml-1 cursor-grab touch-none rounded p-1 text-muted hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={15} />
      </button>
      {children}
    </Reorder.Item>
  );
}

export default ReorderRow;
