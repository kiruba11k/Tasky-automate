import { emitFun } from '@/fun/bus';

const TOKEN_KEY = 'tasky_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function request(method, url, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (res.status === 401 && token) {
    // Session expired or revoked: drop it and let the app show the login page.
    setToken(null);
    window.dispatchEvent(new Event('auth:logout'));
  }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

/** Runs a write request, telling the fun layer when work starts/ends/fails (so Tasky can look busy, happy or sorry). */
async function mutate(fn) {
  emitFun({ type: 'busy', on: true });
  try {
    return await fn();
  } catch (e) {
    emitFun({ type: 'error', message: e.message });
    throw e;
  } finally {
    emitFun({ type: 'busy', on: false });
  }
}

/** Entity SDK: list/filter/get/create/update/delete over the generic REST API. */
export function createEntity(name) {
  const base = `/api/entities/${name}`;
  const qs = (params) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      sp.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : '';
  };
  return {
    list: (sort, limit) => request('GET', base + qs({ sort, limit })),
    filter: (query = {}, sort, limit) => request('GET', base + qs({ ...query, sort, limit })),
    get: (id) => request('GET', `${base}/${encodeURIComponent(id)}`),
    create: async (data) => {
      const rec = await mutate(() => request('POST', base, data));
      emitFun({ type: 'entity', entity: name, action: 'create', data: rec });
      return rec;
    },
    update: async (id, data) => {
      const rec = await mutate(() => request('PUT', `${base}/${encodeURIComponent(id)}`, data));
      emitFun({ type: 'entity', entity: name, action: 'update', data: rec, patch: data });
      return rec;
    },
    delete: async (id) => {
      const res = await mutate(() => request('DELETE', `${base}/${encodeURIComponent(id)}`));
      emitFun({ type: 'entity', entity: name, action: 'delete', id });
      return res;
    },
  };
}
