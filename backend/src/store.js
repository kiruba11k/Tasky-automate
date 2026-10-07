import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Minimal JSON-file document store with atomic writes. */
export class Store {
  constructor(file) {
    this.file = file;
    this.data = {};
    if (file && fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        console.error(`Could not parse ${file}, starting empty:`, e.message);
      }
    }
  }

  persist() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  all(entity) {
    return (this.data[entity] ||= []);
  }

  get(entity, id) {
    return this.all(entity).find((r) => r.id === id);
  }

  insert(entity, fields, createdBy) {
    const now = new Date().toISOString();
    const rec = { ...fields, id: randomUUID(), created_date: now, updated_date: now, created_by: createdBy || null };
    this.all(entity).push(rec);
    this.persist();
    return rec;
  }

  update(entity, id, fields) {
    const rec = this.get(entity, id);
    if (!rec) return null;
    const { id: _i, created_date: _c, created_by: _b, ...rest } = fields;
    Object.assign(rec, rest, { updated_date: new Date().toISOString() });
    this.persist();
    return rec;
  }

  remove(entity, id) {
    const list = this.all(entity);
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.persist();
    return true;
  }
}

/** Sort by "-field" (desc) or "field" (asc); numbers numeric, others string compare. */
export function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x) < String(y) ? -1 : 1;
    return desc ? -r : r;
  });
}

export function matches(record, query) {
  return Object.entries(query).every(([k, v]) => {
    const val = record[k];
    return Array.isArray(val) && !Array.isArray(v) ? val.includes(v) : JSON.stringify(val) === JSON.stringify(v);
  });
}
