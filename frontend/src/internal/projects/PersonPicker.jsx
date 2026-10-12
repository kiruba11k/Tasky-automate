import React from 'react';
import {
  qR as ROLE_GROUPS,
  Qe as PEOPLE,
  nt as fullName,
  vb as SELECT_CLASS,
} from '@/internal/min';

/** Select that lists people grouped by role; picking one calls onPick(id) and resets. */
export function PersonPicker({ label, exclude, onPick, roles }) {
  const groups = ROLE_GROUPS.filter(([role]) => !roles || roles.includes(role));
  return (
    <select
      aria-label={label}
      className={SELECT_CLASS}
      value=""
      onChange={(e) => e.target.value && onPick(e.target.value)}
    >
      <option value="">{label}…</option>
      {groups.map(([role, roleLabel]) => {
        const people = PEOPLE.filter((p) => p.role === role && !exclude.includes(p.id));
        return people.length ? (
          <optgroup key={role} label={roleLabel}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p.id)} · {p.title}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
    </select>
  );
}

export default PersonPicker;
