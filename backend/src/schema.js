import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'schemas');

export const schemas = {};
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  schemas[s.name] = s;
}

// Built-in User entity. Roles are admin | team_leader | team_member. A user row is the login allow-list:
// only emails present here (and Active) can sign in.
schemas.User = {
  name: 'User',
  type: 'object',
  properties: {
    full_name: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string', enum: ['admin', 'team_leader', 'team_member'], default: 'team_member' },
    status: { type: 'string', enum: ['Active', 'Inactive'], default: 'Active' },
    project_ids: { type: 'array' },
    google_sheet_id: { type: 'string' },
    designation: { type: 'string' },
    contact: { type: 'string' },
    hire_date: { type: 'string' },
    skills: { type: 'string' },
    theme: { type: 'string' },
    theme_auto: { type: 'boolean' },
    theme_custom: { type: 'string' },
    theme_at: { type: 'number' },
  },
  required: ['full_name', 'email'],
};

const typeOk = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
};

/** Applies defaults and validates. Returns { data, errors }. Unknown properties are kept. */
export function validate(schema, input, { partial = false } = {}) {
  const data = { ...input };
  const errors = [];
  for (const [key, def] of Object.entries(schema.properties || {})) {
    if (!partial && data[key] === undefined && def.default !== undefined) data[key] = def.default;
    const v = data[key];
    if (v === undefined || v === null || v === '') continue;
    if (def.type && typeOk[def.type] && !typeOk[def.type](v)) {
      errors.push(`${key} must be of type ${def.type}`);
      continue;
    }
    if (def.enum && !def.enum.includes(v)) errors.push(`${key} must be one of: ${def.enum.join(', ')}`);
    if (def.minimum !== undefined && typeof v === 'number' && v < def.minimum) errors.push(`${key} must be >= ${def.minimum}`);
    if (def.maximum !== undefined && typeof v === 'number' && v > def.maximum) errors.push(`${key} must be <= ${def.maximum}`);
  }
  if (!partial) {
    for (const key of schema.required || []) {
      const v = data[key];
      if (v === undefined || v === null || v === '') errors.push(`${key} is required`);
    }
  }
  return { data, errors };
}
