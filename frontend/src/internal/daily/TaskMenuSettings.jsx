import { useState } from 'react';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { oe as cx, Se as useStore, Te as Button, Ya as Modal, Ye as toast } from '@/internal/min';
import { TASK_TYPES } from '../lib/constants.js';
import { MY_PREFIX } from './entryHelpers';

/** The person's task-dropdown settings, with the defaults filled in. */
export const useTaskMenu = (personId) => {
  const menu = useStore((s) => s.profiles[personId]?.taskMenu);
  return { hidden: [], extra: [], removed: [], ...menu };
};

/** Gear button in the day / week card header that opens the "Task dropdown" settings of `personId`. */
export function TaskMenuSettings({ personId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Task list settings"
        title="Choose what shows in the task dropdown"
        data-testid="task-menu-settings"
        className="focus-ring rounded-lg border border-line p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
        onClick={() => setOpen(true)}
      >
        <Settings2 size={15} />
      </button>
      <TaskMenuModal personId={personId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Modal "Task dropdown": show / hide, delete (and restore) the standard types and add the person's own options. */
function TaskMenuModal({ personId, open, onClose }) {
  const setProfile = useStore((s) => s.setProfile);
  const menu = useTaskMenu(personId);
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(null);
  const save = (patch) => setProfile(personId, { taskMenu: { ...menu, ...patch } });
  const toggle = (id) => save({ hidden: menu.hidden.includes(id) ? menu.hidden.filter((x) => x !== id) : [...menu.hidden, id] });
  const add = () => {
    const name = text.trim();
    if (!name) return;
    if (menu.extra.some((x) => x.toLowerCase() === name.toLowerCase()) || TASK_TYPES.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: `"${name}" is already in the list`, tone: 'info' });
      return;
    }
    save({ extra: [...menu.extra, name] });
    setText('');
  };
  const row = (id, name, isExtra) => (
    <li key={id} className="flex items-center gap-2 py-1.5 text-sm">
      <input type="checkbox" aria-label={`Show ${name}`} className="h-4 w-4" checked={!menu.hidden.includes(id)} onChange={() => toggle(id)} />
      <span className={cx('flex-1', menu.hidden.includes(id) && 'text-muted line-through')}>{name}</span>
      {confirming === id ? (
        <span className="flex items-center gap-1 text-xs">
          <span className="font-semibold text-coral-ink">Delete?</span>
          <button className="rounded px-1.5 py-0.5 text-muted hover:bg-surface-2" onClick={() => setConfirming(null)}>
            No
          </button>
          <button
            className="rounded bg-coral-strong px-1.5 py-0.5 font-semibold text-white"
            onClick={() => {
              setConfirming(null);
              save(
                isExtra
                  ? { hidden: menu.hidden.filter((x) => x !== id), extra: menu.extra.filter((x) => x !== name) }
                  : { hidden: menu.hidden.filter((x) => x !== id), removed: [...menu.removed, id] },
              );
              toast({ title: `${name} deleted from your list`, tone: 'info' });
            }}
          >
            Yes
          </button>
        </span>
      ) : (
        <button aria-label={`Delete ${name}`} title="Delete from the list" className="rounded p-1 text-muted hover:text-coral-ink" onClick={() => setConfirming(id)}>
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task dropdown"
      description="Choose what shows when you add a task. Project tasks always show."
      size="sm"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div data-testid="task-menu">
        <ul className="divide-y divide-line">
          {TASK_TYPES.filter((t) => !menu.removed.includes(t.id)).map((t) => row(t.id, t.name, false))}
          {menu.extra.map((name) => row(`${MY_PREFIX}${name}`, name, true))}
        </ul>
        {menu.removed.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs" data-testid="menu-removed">
            <span className="text-muted">Deleted:</span>
            {menu.removed.map((id) => {
              const t = TASK_TYPES.find((x) => x.id === id);
              return t ? (
                <button
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-semibold text-accent-ink hover:bg-surface-2"
                  onClick={() => save({ removed: menu.removed.filter((x) => x !== id) })}
                >
                  <Plus size={11} /> {t.name}
                </button>
              ) : null;
            })}
          </div>
        )}
        <div className="mt-3 flex gap-2">
          <input
            aria-label="New task option"
            className="focus-ring flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
            placeholder="Add your own, e.g. Client call"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button tone="soft" onClick={add}>
            <Plus size={13} /> Add
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TaskMenuSettings;
