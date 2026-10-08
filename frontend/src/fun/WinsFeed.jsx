import React, { useCallback, useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { request } from '@/api/client';
import { emitFun } from './bus';
import { useAuth } from '@/auth/AuthContext';
import { mondayOf } from '@/lib/week';

const ICON = { done: '✅', badge: '🏅', kudos: '💛' };
const EMOJIS = ['🙌', '🔥', '🌟', '💪'];

/** Team wins: positive-only activity, with one-tap high-fives. */
export default function WinsFeed() {
  const { user } = useAuth();
  const [wins, setWins] = useState([]);
  const [sent, setSent] = useState({});
  const [error, setError] = useState('');
  const week = mondayOf();

  const load = useCallback(async () => {
    try { setWins((await request('GET', `/api/team/pulse?week_start=${week}&today=${format(new Date(), 'yyyy-MM-dd')}`)).wins); } catch { /* optional widget */ }
  }, [week]);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    const onFun = (e) => { if (['entity', 'weekly', 'notify'].includes(e.detail?.type)) setTimeout(load, 1500); };
    window.addEventListener('tasky:fun', onFun);
    return () => { clearInterval(timer); window.removeEventListener('tasky:fun', onFun); };
  }, [load]);

  const send = async (win, emoji, key) => {
    setError('');
    try {
      await request('POST', '/api/kudos', { to_user_id: win.user_id, emoji, message: '' });
      setSent((s) => ({ ...s, [key]: emoji }));
      emitFun({ type: 'kudosSent' });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="glass-effect-enhanced rounded-2xl p-5">
      <h3 className="text-xl font-extrabold text-white">Team wins 🎉</h3>
      <p className="text-xs text-slate-400 mb-3">Cheer a teammate on with a high-five.</p>
      {error && <p role="alert" className="text-xs text-red-400 mb-2">{error}</p>}
      {wins.length === 0 && <p className="text-sm text-slate-500 py-6 text-center">No wins yet today. Be the first! 🥇</p>}
      <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {wins.map((w, i) => {
          const key = `${w.type}-${w.at}-${w.user_id}-${i}`;
          const mine = w.user_id === user.id;
          return (
            <li key={key} className="win-item flex items-center gap-2 rounded-xl bg-slate-800/50 px-3 py-2 text-sm" style={{ animationDelay: `${i * 40}ms` }}>
              <span aria-hidden="true">{ICON[w.type]}</span>
              <span className="flex-1 min-w-0"><span className="font-bold text-white">{mine ? 'You' : w.name}</span> <span className="text-slate-300">{w.text}</span> <span className="text-[11px] text-slate-500 whitespace-nowrap">{formatDistanceToNow(new Date(w.at), { addSuffix: true })}</span></span>
              {!mine && w.type !== 'kudos' && (
                sent[key]
                  ? <span className="text-lg" title="Sent!">{sent[key]}</span>
                  : <span className="flex gap-0.5 shrink-0">{EMOJIS.map((e) => <button key={e} type="button" aria-label={`Send ${e} to ${w.name}`} onClick={() => send(w, e, key)} className="w-7 h-7 rounded-full hover:bg-slate-700 text-base">{e}</button>)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
