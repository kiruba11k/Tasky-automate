import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Save, X } from 'lucide-react';
import { Te as Button, be as firstName, oe as cx } from '@/internal/min';
import { FIELD, OwnerSelect } from './forms.jsx';
import { applyFilters, sortRows, toCsv, loadViews, saveViews, withView, loadHidden, saveHidden, visibleColumns } from './tableLogic.js';
import { saveRecord } from './crmStore.js';
import { toast } from '../kit/toast.js';

const th = 'px-3 py-2 text-left text-xs font-bold text-muted';
const td = 'px-3 py-2 text-sm';
const BLANK = { q: '', owner: '', active: {} };

/**
 * Index table of one CRM object: search, owner and property filters, sortable columns, saved views, and bulk actions on ticked rows
 * (assign owner, set a property, add to a list, export CSV).
 * `columns`: [{ key, label, get(row), render?(row), sort?(row) }]; `filters`: [{ key, label, kind: 'select'|'number'|'date', get(row) }];
 * `bulk`: [{ key, label, options: [{ value, label }] }] properties that can be set on all ticked rows.
 */
export function IndexTable({ type, rows, columns: allColumns, filters = [], bulk = [], to, searchText, empty }) {
  const [hidden, setHidden] = useState(() => loadHidden(type));
  const columns = useMemo(() => visibleColumns(allColumns, hidden), [allColumns, hidden]);
  const [state, setState] = useState(BLANK);
  const [sort, setSort] = useState({ key: columns[0].key, dir: 1 });
  const [picked, setPicked] = useState(() => new Set());
  const [views, setViews] = useState(() => loadViews(type));
  const [bulkValue, setBulkValue] = useState({});
  const nav = useNavigate();
  const text = searchText ?? ((r) => `${r.name ?? ''} ${columns.map((c) => c.get(r)).join(' ')}`);
  const listNames = useMemo(() => [...new Set(rows.flatMap((r) => r.lists ?? []))], [rows]);
  const shown = useMemo(() => {
    const listFilter = state.active.list;
    const base = applyFilters(rows, { ...state, active: { ...state.active, list: undefined } }, filters, text);
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    return sortRows(listFilter ? base.filter((r) => (r.lists ?? []).includes(listFilter)) : base, col, sort.dir);
  }, [rows, state, sort, columns, filters, text]);
  const setActive = (key, value) => setState((s) => ({ ...s, active: { ...s.active, [key]: value } }));
  const setRange = (key, part, v) => setState((s) => ({ ...s, active: { ...s.active, [key]: { ...s.active[key], [part]: v } } }));
  const dirty = state.q || state.owner || Object.values(state.active).some((v) => v && (typeof v !== 'object' || Object.values(v).some(Boolean)));
  const tick = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const ticked = shown.filter((r) => picked.has(r.id));
  const apply = (patch, what) => {
    ticked.forEach((r) => saveRecord(type, { ...r, ...patch(r) }));
    toast({ title: `${what} for ${ticked.length} ${type}${ticked.length === 1 ? '' : 's'}.` });
    setPicked(new Set());
  };
  const exportCsv = () => {
    const list = ticked.length ? ticked : shown;
    const url = URL.createObjectURL(new Blob([toCsv(list, columns)], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `crm-${type}s.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };
  const saveView = () => {
    const name = window.prompt('Name this view')?.trim();
    if (!name) return;
    const next = withView(views, name, state);
    setViews(next);
    saveViews(type, next);
  };
  const dropView = (name) => { const next = views.filter((v) => v.name !== name); setViews(next); saveViews(type, next); };
  const small = cx(FIELD, '!w-auto');
  return (
    <div className="space-y-2" data-testid={`index-${type}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search" className={cx(FIELD, 'max-w-xs')} placeholder="Search..." value={state.q} onChange={(e) => setState((s) => ({ ...s, q: e.target.value }))} />
        <select aria-label="Filter by owner" className={small} value={state.owner} onChange={(e) => setState((s) => ({ ...s, owner: e.target.value }))}>
          <option value="">All owners</option>
          {[...new Set(rows.map((r) => r.ownerId))].map((id) => <option key={id} value={id}>{firstName(id)}</option>)}
        </select>
        {filters.map((f) => f.kind === 'select' ? (
          <select key={f.key} aria-label={`Filter by ${f.label}`} className={small} value={state.active[f.key] ?? ''} onChange={(e) => setActive(f.key, e.target.value)}>
            <option value="">All {f.label.toLowerCase()}</option>
            {[...new Set(rows.map(f.get).filter((v) => v != null && v !== ''))].sort().map((v) => <option key={v} value={v}>{f.show?.(v) ?? v}</option>)}
          </select>
        ) : (
          <span key={f.key} className="flex items-center gap-1 text-xs text-muted">
            {f.label}
            <input aria-label={`${f.label} ${f.kind === 'number' ? 'min' : 'from'}`} type={f.kind === 'number' ? 'number' : 'date'} className={cx(small, f.kind === 'number' ? 'crm-num' : 'crm-date')} value={state.active[f.key]?.[f.kind === 'number' ? 'min' : 'from'] ?? ''} onChange={(e) => setRange(f.key, f.kind === 'number' ? 'min' : 'from', e.target.value)} />
            to
            <input aria-label={`${f.label} ${f.kind === 'number' ? 'max' : 'to'}`} type={f.kind === 'number' ? 'number' : 'date'} className={cx(small, f.kind === 'number' ? 'crm-num' : 'crm-date')} value={state.active[f.key]?.[f.kind === 'number' ? 'max' : 'to'] ?? ''} onChange={(e) => setRange(f.key, f.kind === 'number' ? 'max' : 'to', e.target.value)} />
          </span>
        ))}
        {listNames.length > 0 && (
          <select aria-label="Filter by list" className={small} value={state.active.list ?? ''} onChange={(e) => setActive('list', e.target.value)}>
            <option value="">All lists</option>
            {listNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
        {dirty && <button type="button" className="focus-ring rounded-full border border-line px-2 py-0.5 text-xs font-semibold" onClick={() => setState(BLANK)}>Clear</button>}
        <button type="button" className="focus-ring flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold" onClick={saveView}><Save size={11} /> Save view</button>
        <button type="button" className="focus-ring flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-semibold" onClick={exportCsv}><Download size={11} /> Export {ticked.length ? 'selected' : 'all'}</button>
        <details className="relative">
          <summary className="focus-ring cursor-pointer list-none rounded-full border border-line px-2 py-0.5 text-xs font-semibold">Columns</summary>
          <div className="absolute z-20 mt-1 w-44 space-y-1 rounded-xl border border-line bg-surface p-2 shadow-lift" data-testid="column-picker">
            {allColumns.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!hidden.includes(c.key)} onChange={(e) => { const next = e.target.checked ? hidden.filter((k) => k !== c.key) : [...hidden, c.key]; setHidden(next); saveHidden(type, next); }} />
                {c.label}
              </label>
            ))}
          </div>
        </details>
        <span className="text-xs text-muted">{shown.length} of {rows.length}</span>
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" data-testid="saved-views">
          <span className="text-xs font-semibold text-muted">Views</span>
          {views.map((v) => (
            <span key={v.name} className="flex items-center rounded-full border border-line text-xs font-semibold">
              <button type="button" className="focus-ring rounded-l-full px-2 py-0.5 hover:bg-surface-2" onClick={() => setState({ ...BLANK, ...v.state })}>{v.name}</button>
              <button type="button" aria-label={`Delete view ${v.name}`} className="focus-ring rounded-r-full px-1 py-0.5 text-muted hover:bg-surface-2" onClick={() => dropView(v.name)}><X size={11} /></button>
            </span>
          ))}
        </div>
      )}
      {ticked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-sm" data-testid="bulk-bar">
          <b>{ticked.length} selected</b>
          <OwnerSelect value="" onChange={(v) => v && apply(() => ({ ownerId: v }), `Owner set to ${firstName(v)}`)} aria-label="Assign owner" />
          {bulk.map((b) => (
            <select key={b.key} aria-label={`Set ${b.label}`} className={small} value={bulkValue[b.key] ?? ''} onChange={(e) => { setBulkValue((s) => ({ ...s, [b.key]: '' })); e.target.value && apply(() => ({ [b.key]: e.target.value }), `${b.label} updated`); }}>
              <option value="">Set {b.label.toLowerCase()}...</option>
              {b.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          <Button tone="ghost" className="border border-line" onClick={() => { const n = window.prompt('Add to which list?')?.trim(); if (n) apply((r) => ({ lists: [...new Set([...(r.lists ?? []), n])] }), `Added to ${n}`); }}>Add to list</Button>
          <button type="button" className="focus-ring ml-auto text-xs font-semibold underline" onClick={() => setPicked(new Set())}>Clear selection</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="crm-table w-full">
          <thead className="bg-surface-2">
            <tr>
              <th className={th}><input type="checkbox" aria-label="Select all" checked={shown.length > 0 && ticked.length === shown.length} onChange={(e) => setPicked(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())} /></th>
              {columns.map((c) => (
                <th key={c.key} className={th}>
                  <button type="button" className="focus-ring font-bold" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}>
                    {c.label}{sort.key === c.key ? (sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => nav(to(r))}>
                <td className={td} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.name}`} checked={picked.has(r.id)} onChange={() => tick(r.id)} /></td>
                {columns.map((c) => <td key={c.key} className={td}>{c.render ? c.render(r) : c.get(r) ?? '·'}</td>)}
              </tr>
            ))}
            {!shown.length && <tr><td className="px-3 py-6 text-center text-sm text-muted" colSpan={columns.length + 1}>{dirty ? 'No match. Clear the filters to see everything.' : empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
