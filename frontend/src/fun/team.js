import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { request } from '@/api/client';
import { mondayOf } from '@/lib/week';
import { speciesFor } from './BuddyContext';

let cache = null;
let inflight = null;

/** Everyone's buddy and week so far (cached for a minute): feeds the parade, the relay and the high-five scenes. */
export async function loadTeam(force = false) {
  if (!force && cache && Date.now() - cache.at < 60000) return cache.rows;
  if (inflight) return inflight;
  inflight = request('GET', `/api/team/parade?week_start=${mondayOf()}&today=${format(new Date(), 'yyyy-MM-dd')}`)
    .then((rows) => { cache = { at: Date.now(), rows: rows.map((r) => ({ ...r, species: speciesFor(r) })) }; return cache.rows; })
    .catch(() => cache?.rows || [])
    .finally(() => { inflight = null; });
  return inflight;
}

export function useTeam(refreshOn = []) {
  const [rows, setRows] = useState(cache?.rows || []);
  const reload = useCallback(async (force) => { setRows(await loadTeam(force)); }, []);
  useEffect(() => {
    reload(false);
    let t;
    const onFun = (e) => { if (refreshOn.includes(e.detail?.type)) { clearTimeout(t); t = setTimeout(() => reload(true), 1500); } };
    window.addEventListener('tasky:fun', onFun);
    const poll = setInterval(() => { if (!document.hidden) reload(true); }, 60000);
    return () => { window.removeEventListener('tasky:fun', onFun); clearInterval(poll); clearTimeout(t); };
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps
  return { rows, reload };
}
