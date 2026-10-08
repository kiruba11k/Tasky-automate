import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { SPECIES_IDS } from './three/species';

const BuddyContext = createContext(null);

/** Which buddy a teammate shows up as: their pinned one, or a stable pick from their id. */
export const speciesFor = (m) => (m?.buddy && SPECIES_IDS.includes(m.buddy) ? m.buddy : SPECIES_IDS[[...(m?.id || 'x')].reduce((a, c) => a + c.charCodeAt(0), 0) % SPECIES_IDS.length]);

/** The signed-in person's buddy collection: pinned buddy, accessories worn, owned items and mystery eggs. */
export function BuddyProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    try { setStatus(await request('GET', '/api/me/buddies')); } catch { /* cosmetic only */ }
  }, []);

  useEffect(() => {
    if (!user) { setStatus(null); return undefined; }
    refresh();
    let t;
    const onFun = (e) => { if (['completed', 'entity', 'weekly', 'chest', 'hatched'].includes(e.detail?.type)) { clearTimeout(t); t = setTimeout(refresh, 1800); } };
    window.addEventListener('tasky:fun', onFun);
    return () => { window.removeEventListener('tasky:fun', onFun); clearTimeout(t); };
  }, [user?.id, refresh]);

  const save = useCallback(async (patch) => { await request('PATCH', '/api/auth/me', patch); await refresh(); }, [refresh]);

  const value = useMemo(() => ({
    status,
    pinned: status?.buddy || 'auto',
    equipped: status?.equipped || {},
    ownedBuddies: status?.owned_buddies || ['cat', 'mouse', 'bunny', 'robot'],
    ownedAccessories: status?.owned_accessories || [],
    accessories: status?.catalog?.accessories || [],
    eggs: status?.eggs || { available: 0, earned: 0, hatched: 0, next_at: 3, done: 0 },
    refresh,
    pin: (id) => save({ buddy: id }),
    equip: (slot, id) => save({ equipped: { ...(status?.equipped || {}), [slot]: id } }),
  }), [status, refresh, save]);

  return <BuddyContext.Provider value={value}>{children}</BuddyContext.Provider>;
}

const FALLBACK = { status: null, pinned: 'auto', equipped: {}, ownedBuddies: [], ownedAccessories: [], accessories: [], eggs: { available: 0, earned: 0, hatched: 0, next_at: 3, done: 0 }, refresh: () => {}, pin: async () => {}, equip: async () => {} };
export const useBuddy = () => useContext(BuddyContext) || FALLBACK;
