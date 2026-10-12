import { useState } from 'react';
import { HistoryToggle } from './HistoryToggle';
import { TaskHistory } from './TaskHistory';

/** History toggle with its own open state. */
export function CollapsibleHistory({ task, defaultOpen = false, className }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <HistoryToggle task={task} open={open} onClick={() => setOpen((v) => !v)} />
      {open && <TaskHistory task={task} className="mt-2" />}
    </div>
  );
}

export default CollapsibleHistory;
