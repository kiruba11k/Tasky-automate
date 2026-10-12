import { useEffect, useRef } from 'react';
import { useFun } from '@/fun/FunProvider';
import { useStore } from '../store';

const HERO = 'tasky_hero_off_';
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } };

/** What this device has chosen, in the shape saved on the person's profile. */
function collect(settings) {
  const heroOff = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(HERO) && localStorage.getItem(k) === '1') heroOff[k.slice(HERO.length)] = true;
    }
  } catch { /* ignore */ }
  let sound = null;
  try { sound = JSON.parse(read('tasky_soundscape') || 'null'); } catch { /* ignore */ }
  return { fun: settings, sound, focusMode: read('tasky_focus_mode') || 'study', heroOff };
}
const sig = (p) => JSON.stringify([p.fun, p.sound, p.focusMode, Object.keys(p.heroOff || {}).sort()]);

/** Keeps the fun-layer choices (toggles, ambient sound, focus mode, hidden banners) on the person's profile, so every device they sign in on looks the same. */
export function PrefsSync() {
  const { settings, setSettings } = useFun();
  const live = useRef(settings);
  const lastSig = useRef('');
  const timer = useRef(null);
  live.current = settings;

  const push = () => {
    const st = useStore.getState();
    const me = st.me;
    if (!me) return;
    const prefs = collect(live.current);
    const s = sig(prefs);
    if (s === lastSig.current) return;
    lastSig.current = s;
    st.setProfile(me, { prefs });
  };
  const later = () => { clearTimeout(timer.current); timer.current = setTimeout(push, 600); };

  // Take whatever the server has (on load and whenever another device changes it).
  useEffect(() => {
    const apply = (state) => {
      const remote = state.profiles?.[state.me]?.prefs;
      if (!remote || !remote.fun) return false;
      const s = sig({ ...remote, heroOff: remote.heroOff || {} });
      if (s === lastSig.current) return true;
      lastSig.current = s;
      setSettings(remote.fun);
      if (remote.sound) write('tasky_soundscape', JSON.stringify(remote.sound));
      write('tasky_focus_mode', remote.focusMode || null);
      try {
        const gone = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(HERO)) gone.push(k); }
        gone.forEach((k) => localStorage.removeItem(k));
      } catch { /* ignore */ }
      Object.keys(remote.heroOff || {}).forEach((p) => write(HERO + p, '1'));
      window.dispatchEvent(new Event('tasky:prefs-applied'));
      return true;
    };
    if (!apply(useStore.getState())) later(); // first device: save what it already has
    return useStore.subscribe((state, prev) => {
      if (state.profiles?.[state.me]?.prefs !== prev.profiles?.[prev.me]?.prefs) apply(state);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { later(); }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener('tasky:prefs', later);
    return () => { window.removeEventListener('tasky:prefs', later); clearTimeout(timer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
