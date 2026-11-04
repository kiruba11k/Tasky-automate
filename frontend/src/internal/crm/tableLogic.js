// Pure helpers for the CRM index tables: filtering, sorting, CSV export and saved views.

/** The rows that pass the search text, the owner and every active filter. `filters`: [{ key, kind: 'select'|'number'|'date', get(row) }]; `active`: { key: value | { min, max } | { from, to } }. */
export function applyFilters(rows, { q = '', owner = '', active = {} }, filters, searchText) {
  const text = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (owner && r.ownerId !== owner) return false;
    if (text && !searchText(r).toLowerCase().includes(text)) return false;
    return filters.every((f) => {
      const v = active[f.key];
      if (v == null || v === '' || (typeof v === 'object' && Object.values(v).every((x) => x === '' || x == null))) return true;
      const got = f.get(r);
      if (f.kind === 'select') return String(got ?? '') === String(v);
      if (f.kind === 'number') return got != null && (v.min === '' || v.min == null || got >= Number(v.min)) && (v.max === '' || v.max == null || got <= Number(v.max));
      return !!got && (!v.from || got >= v.from) && (!v.to || got <= v.to);
    });
  });
}

export const sortRows = (rows, col, dir) => [...rows].sort((a, b) => {
  const x = col.sort ? col.sort(a) : col.get(a);
  const y = col.sort ? col.sort(b) : col.get(b);
  if (x === y) return 0;
  if (x == null || x === '') return 1;
  if (y == null || y === '') return -1;
  return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
});

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** CSV text for `rows` using each column's visible value. */
export const toCsv = (rows, columns) => [columns.map((c) => csvCell(c.label)).join(','), ...rows.map((r) => columns.map((c) => csvCell(c.get(r))).join(','))].join('\n');

/** The columns a person has hidden on one table, kept per type in this browser. */
export const loadHidden = (type, storage = globalThis.localStorage) => {
  try { const v = JSON.parse(storage.getItem(`crm-cols:${type}`) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const saveHidden = (type, hidden, storage = globalThis.localStorage) => { try { storage.setItem(`crm-cols:${type}`, JSON.stringify(hidden)); } catch { /* private window */ } };
/** The columns to show: everything not hidden, never fewer than one. */
export const visibleColumns = (columns, hidden) => { const v = columns.filter((c) => !hidden.includes(c.key)); return v.length ? v : columns.slice(0, 1); };

/** Saved views of one table: [{ name, state }], kept per type in this browser. */
export const loadViews = (type, storage = globalThis.localStorage) => {
  try { const v = JSON.parse(storage.getItem(`crm-views:${type}`) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const saveViews = (type, views, storage = globalThis.localStorage) => { try { storage.setItem(`crm-views:${type}`, JSON.stringify(views)); } catch { /* private window */ } };
export const withView = (views, name, state) => [...views.filter((v) => v.name !== name), { name, state }];
