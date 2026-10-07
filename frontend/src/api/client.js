const USER_KEY = 'tasky_user_id';

export function getActingUserId() {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setActingUserId(id) {
  try {
    if (id) localStorage.setItem(USER_KEY, id);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export async function request(method, url, body) {
  const headers = {};
  const userId = getActingUserId();
  if (userId) headers['x-user-id'] = userId;
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
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
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
    create: (data) => request('POST', base, data),
    update: (id, data) => request('PUT', `${base}/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `${base}/${encodeURIComponent(id)}`),
  };
}
