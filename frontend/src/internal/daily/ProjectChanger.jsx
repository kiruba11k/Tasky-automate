import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { oe as cx, Te as Button, Ye as toast } from '@/internal/min';
import { CUSTOM_PROJECT, OTHER_PREFIX } from './planBlocks';

/** Window event sent after a project change was saved, so an open Daily update table can follow: detail { from, to }. */
export const PROJECT_CHANGED = 'ls-project-changed';

const FIELD = 'focus-ring rounded-xl border border-line bg-surface px-2 py-1.5 text-sm text-ink';

/**
 * Inline form to pick another project for a block or a Daily update table: the person's active projects plus
 * "Custom (type a name)..." with a text field (same choices as the add-block form). `onSave(projectId)` gets a project id or `other:<name>`.
 */
export function ProjectChanger({ current, projects, onSave, onCancel, label = 'Project' }) {
  const active = projects.filter((p) => p.status === 'active' || p.id === current);
  const isOther = current.startsWith(OTHER_PREFIX);
  const [value, setValue] = useState(isOther ? CUSTOM_PROJECT : current);
  const [name, setName] = useState(isOther ? current.slice(OTHER_PREFIX.length) : '');
  const submit = () => {
    const typed = name.trim();
    if (value === CUSTOM_PROJECT && !typed) {
      toast({ title: 'Type the project name', tone: 'info' });
      return;
    }
    onSave(value === CUSTOM_PROJECT ? `${OTHER_PREFIX}${typed}` : value);
  };
  return (
    <span className="flex flex-wrap items-center gap-1.5" data-testid="project-changer">
      <select aria-label={`${label} to change to`} className={cx(FIELD, 'w-48')} value={value} onChange={(e) => setValue(e.target.value)}>
        {active.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value={CUSTOM_PROJECT}>Custom (type a name)...</option>
      </select>
      {value === CUSTOM_PROJECT && (
        <input
          aria-label="New custom project name"
          autoFocus
          className={cx(FIELD, 'w-44')}
          placeholder="e.g. Internal training"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
        />
      )}
      <Button tone="soft" onClick={submit}>
        <Check size={13} /> Save project
      </Button>
      <button aria-label="Cancel project change" className="focus-ring rounded-lg p-1 text-muted hover:text-ink" onClick={onCancel}>
        <X size={14} />
      </button>
    </span>
  );
}

export default ProjectChanger;
