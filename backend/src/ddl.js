import { schemas } from './schema.js';

const SQL_TYPES = { string: 'text', number: 'double precision', boolean: 'boolean', array: 'jsonb', object: 'jsonb' };

export const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
export const tableName = (entity) => `${snake(entity)}s`;

export function columnsFor(entity) {
  const schema = schemas[entity];
  const cols = Object.entries(schema.properties || {}).map(([name, def]) => ({ name, type: def.type || 'string', sql: SQL_TYPES[def.type] || 'text' }));
  return cols;
}

/** Builds idempotent DDL (CREATE TABLE / ADD COLUMN / indexes) for every entity. */
export function buildDDL() {
  const out = [];
  for (const entity of Object.keys(schemas)) {
    const t = tableName(entity);
    const cols = columnsFor(entity);
    out.push(
      `CREATE TABLE IF NOT EXISTS "${t}" (\n  id uuid PRIMARY KEY,\n  created_date timestamptz NOT NULL DEFAULT now(),\n  updated_date timestamptz NOT NULL DEFAULT now(),\n  created_by text,\n${cols.map((c) => `  "${c.name}" ${c.sql}`).join(',\n')},\n  extra jsonb NOT NULL DEFAULT '{}'::jsonb\n);`
    );
    for (const c of cols) out.push(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "${c.name}" ${c.sql};`);
    for (const c of cols.filter((x) => x.name.endsWith('_id') && x.sql === 'text')) {
      out.push(`CREATE INDEX IF NOT EXISTS "${t}_${c.name}_idx" ON "${t}" ("${c.name}");`);
    }
  }
  out.push('CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_idx" ON "users" (lower(email));');
  out.push('CREATE INDEX IF NOT EXISTS "daily_tasks_date_idx" ON "daily_tasks" ("date");');
  out.push('CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" ("status");');
  out.push(
    'CREATE TABLE IF NOT EXISTS "uploaded_files" (\n  id uuid PRIMARY KEY,\n  created_date timestamptz NOT NULL DEFAULT now(),\n  name text NOT NULL,\n  mime text,\n  data bytea NOT NULL\n);'
  );
  return out;
}
