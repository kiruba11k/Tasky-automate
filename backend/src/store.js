import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

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

export function paginate(rows, skip = 0, limit) {
  return rows.slice(skip, Number.isFinite(limit) && limit > 0 ? skip + limit : undefined);
}

/**
 * In-memory store with optional JSON-file persistence (local development and tests).
 * Implements the same async interface as PgStore.
 */
export class MemoryStore {
  constructor({ file, uploadDir } = {}) {
    this.file = file;
    this.uploadDir = uploadDir;
    this.files = new Map();
    this.data = {};
    if (file && fs.existsSync(file)) {
      try {
        this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        console.error(`Could not parse ${file}, starting empty:`, e.message);
      }
    }
  }

  async init() {}

  persist() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  rows(entity) {
    return (this.data[entity] ||= []);
  }

  async list(entity, { query = {}, sort = '-created_date', skip = 0, limit } = {}) {
    const rows = sortRecords(this.rows(entity).filter((r) => matches(r, query)), sort);
    return paginate(rows, skip, limit).map((r) => ({ ...r }));
  }

  async count(entity, query = {}) {
    return this.rows(entity).filter((r) => matches(r, query)).length;
  }

  async get(entity, id) {
    const r = this.rows(entity).find((x) => x.id === id);
    return r ? { ...r } : null;
  }

  async insert(entity, fields, createdBy) {
    const now = new Date().toISOString();
    const rec = { ...fields, id: randomUUID(), created_date: now, updated_date: now, created_by: createdBy || null };
    this.rows(entity).push(rec);
    this.persist();
    return { ...rec };
  }

  async update(entity, id, fields) {
    const rec = this.rows(entity).find((x) => x.id === id);
    if (!rec) return null;
    const { id: _i, created_date: _c, created_by: _b, ...rest } = fields;
    for (const [k, v] of Object.entries(rest)) {
      if (v === null) delete rec[k];
      else rec[k] = v;
    }
    rec.updated_date = new Date().toISOString();
    this.persist();
    return { ...rec };
  }

  async remove(entity, id) {
    const list = this.rows(entity);
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.persist();
    return true;
  }

  async putFile({ name, mime, buffer }) {
    const id = randomUUID();
    if (this.uploadDir) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      fs.writeFileSync(path.join(this.uploadDir, id), buffer);
      fs.writeFileSync(path.join(this.uploadDir, `${id}.json`), JSON.stringify({ name, mime }));
    } else {
      this.files.set(id, { name, mime, buffer });
    }
    return id;
  }

  async getFile(id) {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    if (this.uploadDir) {
      const p = path.join(this.uploadDir, id);
      if (!fs.existsSync(p)) return null;
      return { ...JSON.parse(fs.readFileSync(`${p}.json`, 'utf8')), buffer: fs.readFileSync(p) };
    }
    return this.files.get(id) || null;
  }

  async close() {}
}
