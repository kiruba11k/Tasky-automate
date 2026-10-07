import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { schemas } from './schema.js';
import { buildDDL, columnsFor, tableName } from './ddl.js';
import { matches, paginate, sortRecords } from './store.js';

const SYSTEM_COLS = new Set(['id', 'created_date', 'updated_date', 'created_by']);

/** Postgres-backed store (Neon). One real table per entity; unknown properties live in the `extra` jsonb column. */
export class PgStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({ connectionString, max: 5, idleTimeoutMillis: 30000 });
    this.meta = {};
    for (const entity of Object.keys(schemas)) {
      const cols = columnsFor(entity);
      this.meta[entity] = { table: tableName(entity), cols, byName: Object.fromEntries(cols.map((c) => [c.name, c])) };
    }
  }

  async init() {
    for (const stmt of buildDDL()) await this.pool.query(stmt);
  }

  m(entity) {
    const m = this.meta[entity];
    if (!m) throw new Error(`Unknown entity ${entity}`);
    return m;
  }

  fromRow(entity, row) {
    const out = { id: row.id, created_date: row.created_date.toISOString(), updated_date: row.updated_date.toISOString(), created_by: row.created_by };
    for (const c of this.m(entity).cols) if (row[c.name] !== null && row[c.name] !== undefined) out[c.name] = row[c.name];
    return { ...row.extra, ...out };
  }

  /** Splits fields into known column values and the extra bag. */
  split(entity, fields) {
    const { byName } = this.m(entity);
    const known = {};
    const extra = {};
    for (const [k, v] of Object.entries(fields)) {
      if (SYSTEM_COLS.has(k)) continue;
      if (byName[k]) known[k] = v === undefined ? null : byName[k].sql === 'jsonb' && v !== null ? JSON.stringify(v) : v;
      else extra[k] = v;
    }
    return { known, extra };
  }

  async list(entity, { query = {}, sort = '-created_date', skip = 0, limit } = {}) {
    const { table, byName } = this.m(entity);
    const where = [];
    const params = [];
    const jsQuery = {};
    for (const [k, v] of Object.entries(query)) {
      const col = byName[k];
      if (col && col.sql !== 'jsonb' && v !== null && typeof v !== 'object') {
        params.push(v);
        where.push(`"${k}" = $${params.length}`);
      } else if (col && col.sql === 'jsonb' && col.type === 'array' && typeof v !== 'object') {
        params.push(JSON.stringify(v));
        where.push(`"${k}" @> $${params.length}::jsonb`);
      } else jsQuery[k] = v;
    }
    const key = sort.replace(/^-/, '');
    const sqlSort = byName[key] || ['created_date', 'updated_date'].includes(key);
    const needJs = Object.keys(jsQuery).length > 0 || !sqlSort;
    let sql = `SELECT * FROM "${table}"${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
    if (!needJs) {
      sql += ` ORDER BY "${key}" ${sort.startsWith('-') ? 'DESC' : 'ASC'} NULLS LAST, id`;
      if (limit > 0) sql += ` LIMIT ${Math.floor(limit)}`;
      if (skip > 0) sql += ` OFFSET ${Math.floor(skip)}`;
    }
    const { rows } = await this.pool.query(sql, params);
    const recs = rows.map((r) => this.fromRow(entity, r));
    if (!needJs) return recs;
    return paginate(sortRecords(recs.filter((r) => matches(r, jsQuery)), sort), skip, limit);
  }

  async count(entity, query = {}) {
    return (await this.list(entity, { query })).length;
  }

  async get(entity, id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
    const { rows } = await this.pool.query(`SELECT * FROM "${this.m(entity).table}" WHERE id = $1`, [id]);
    return rows[0] ? this.fromRow(entity, rows[0]) : null;
  }

  async insert(entity, fields, createdBy) {
    const { table } = this.m(entity);
    const { known, extra } = this.split(entity, fields);
    const names = ['id', 'created_by', ...Object.keys(known), 'extra'];
    const values = [randomUUID(), createdBy || null, ...Object.values(known), JSON.stringify(extra)];
    const q = `INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
    const { rows } = await this.pool.query(q, values);
    return this.fromRow(entity, rows[0]);
  }

  async update(entity, id, fields) {
    const { table } = this.m(entity);
    if (!(await this.get(entity, id))) return null;
    const { known, extra } = this.split(entity, fields);
    const sets = ['updated_date = now()'];
    const values = [id];
    for (const [k, v] of Object.entries(known)) {
      values.push(v);
      sets.push(`"${k}" = $${values.length}`);
    }
    const nullExtra = Object.keys(extra).filter((k) => extra[k] === null);
    const setExtra = Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== null));
    if (Object.keys(setExtra).length) {
      values.push(JSON.stringify(setExtra));
      sets.push(`extra = extra || $${values.length}::jsonb`);
    }
    for (const k of nullExtra) {
      values.push(k);
      sets.push(`extra = extra - $${values.length}::text`);
    }
    const { rows } = await this.pool.query(`UPDATE "${table}" SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, values);
    return rows[0] ? this.fromRow(entity, rows[0]) : null;
  }

  async remove(entity, id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return false;
    const r = await this.pool.query(`DELETE FROM "${this.m(entity).table}" WHERE id = $1`, [id]);
    return r.rowCount > 0;
  }

  async putFile({ name, mime, buffer }) {
    const id = randomUUID();
    await this.pool.query('INSERT INTO "uploaded_files" (id, name, mime, data) VALUES ($1, $2, $3, $4)', [id, name, mime || null, buffer]);
    return id;
  }

  async getFile(id) {
    if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
    const { rows } = await this.pool.query('SELECT name, mime, data FROM "uploaded_files" WHERE id = $1', [id]);
    return rows[0] ? { name: rows[0].name, mime: rows[0].mime, buffer: rows[0].data } : null;
  }

  async close() {
    await this.pool.end();
  }
}
