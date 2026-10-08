import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { User } from '@/entities/User';
import { emitFun } from '@/fun/bus';
import { applyTheme } from './apply';
import { buildCustomTheme, validateCustomSpec } from './custom';
import { loadPrefs, pickDefinition, savePrefs } from './prefs';
import { getTheme, listThemes } from './registry';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [prefs, setPrefsState] = useState(loadPrefs);
  const [systemTick, bump] = useState(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const syncTimer = useRef(null);
  const adopted = useRef(null);

  const theme = useMemo(() => pickDefinition(prefs), [prefs, systemTick]); // systemTick re-evaluates "match my device"

  useEffect(() => { applyTheme(theme); }, [theme]);

  // "Match my device": follow the system light/dark setting live.
  useEffect(() => {
    if (!prefs.auto || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => bump((n) => n + 1);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs.auto]);

  const pushToServer = useCallback((p) => {
    if (!user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      User.updateMyUserData({ theme: p.id, theme_auto: p.auto, theme_custom: p.custom ? JSON.stringify(p.custom) : '', theme_at: p.at || Date.now() }).catch(() => { /* the local choice still works */ });
    }, 600);
  }, [user]);

  const update = useCallback((patch, { announce = true, at = Date.now() } = {}) => {
    const next = { ...prefsRef.current, ...patch, at };
    next[pickDefinition(next).mode] = pickDefinition(next).id; // remember the last light / dark choice for the quick toggle and Auto mode
    prefsRef.current = next;
    setPrefsState(next);
    savePrefs(next);
    pushToServer(next);
    if (announce) emitFun({ type: 'say', text: 'Ooh, fancy! New look unlocked 🎨', mood: 'wink' });
  }, [pushToServer]);

  // When someone signs in, the newer of "this browser" and "their account" wins, so changes made on another device show up here
  // and a change made here is never overwritten by an older saved one.
  useEffect(() => {
    if (!user || adopted.current === user.id) return;
    adopted.current = user.id;
    const local = loadPrefs();
    const serverAt = Number(user.theme_at) || 0;
    if (!user.theme || (local.at || 0) >= serverAt) { if ((local.at || 0) > serverAt) pushToServer(local); return; }
    let custom = null;
    try { custom = user.theme_custom ? JSON.parse(user.theme_custom) : null; if (custom && validateCustomSpec(custom)) custom = null; } catch { custom = null; }
    if (!getTheme(user.theme) && !(user.theme === 'custom' && custom)) return;
    update({ id: user.theme, auto: !!user.theme_auto, custom }, { announce: false, at: serverAt });
  }, [user, update, pushToServer]);

  const setThemeId = useCallback((id) => update({ id, auto: false }), [update]);
  const setAuto = useCallback((auto) => update({ auto }), [update]);
  const saveCustom = useCallback((spec) => { buildCustomTheme(spec); update({ custom: spec, id: 'custom', auto: false }); }, [update]);
  const toggleMode = useCallback(() => {
    const target = theme.mode === 'dark' ? prefs.light : prefs.dark;
    update({ id: getTheme(target) ? target : (theme.mode === 'dark' ? 'sunny-day' : 'midnight'), auto: false });
  }, [theme.mode, prefs.light, prefs.dark, update]);

  const value = useMemo(() => ({ theme, prefs, themes: listThemes(), setThemeId, setAuto, saveCustom, toggleMode }), [theme, prefs, setThemeId, setAuto, saveCustom, toggleMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
