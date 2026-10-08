import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import Mascot from './Mascot';
import { effects } from './effects';
import { play } from './sounds';

const FunContext = createContext(null);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const SETTINGS_KEY = 'tasky_fun';

function loadSettings() {
  const defaults = { sound: true, anim: reducedMotion() ? 'calm' : 'full', mascot: true, cartoon: true };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return defaults; }
}

// Copy for each kind of moment. {x} is replaced with the thing that happened.
const COPY = {
  created: ['Ka-POW! New {x} on the board!', 'Fresh {x}, hot off the press! 🔥', 'Boom! {x} created. Look at you go!', 'A wild {x} appeared! 🌟'],
  completed: ['DONE! Take a bow! 🎉', 'Task crushed! 💥', 'Another one bites the dust! 🕺', 'Ding ding ding! Champion! 🏆'],
  approved: ['APPROVED! Gold star for you! ⭐', 'Stamped and sealed! 🏅', 'Smooth! That got the thumbs-up! 👍'],
  submitted: ['Whoosh! Off for approval! 🚀', 'Sent! Fingers crossed! 🤞'],
  rejected: ['Oopsie, a few tweaks needed 🛠️ You got this!', 'Back to the workshop! 🔧'],
  allocated: ['Tasks delivered! ✈️ The team has been pinged!', 'Plan locked in! Everyone knows their mission 🎯'],
  assignedToMe: ['Psst… new task for you! 📬', 'Special delivery! 📦 Something to do!'],
  statusProgress: ['Vroom! In progress 🏎️', 'Rolling up the sleeves! 💪'],
  updated: ['Saved! Neat and tidy ✨', 'Updated! Smooth as butter 🧈'],
  deleted: ['Poof! Gone 💨', 'Bye bye, {x}! 👋'],
  voice: ['Mic drop! 🎤 I heard every word!', 'Ears on, tasks made! 🎧'],
  levelUp: ['LEVEL UP! You are now a {x}! 🚀', 'Ding! New rank: {x}! 👑'],
  streak: ['{x}-day streak! You are ON FIRE! 🔥', '{x} days in a row! Unstoppable! ⚡'],
  error: ['Uh-oh! Something went sideways 🙈', 'Oops! That did not work. Try again? 🫣'],
  busy: ['Working on it… 🧠', 'Hold on, doing the thing… ⚙️'],
  incomingSubmitted: ['Ooh, someone finished something! 👀', 'A submission is waiting for you! 📥'],
  incomingDone: ['A teammate completed a task! 👏'],
};
const BURST = { created: 'POW!', completed: 'BAM!', approved: 'YES!', submitted: 'ZOOM!', rejected: 'OOPS!', allocated: 'WHOOSH!', assignedToMe: 'PING!', statusProgress: 'VROOM!', deleted: 'POOF!', voice: 'DROP!', levelUp: 'LEVEL UP!', streak: 'HOT!', error: 'UH-OH!' };
const MOOD = { created: 'cheer', completed: 'cheer', approved: 'cheer', submitted: 'happy', rejected: 'oops', allocated: 'happy', assignedToMe: 'wave', statusProgress: 'happy', updated: 'wink', deleted: 'oops', voice: 'cheer', levelUp: 'cheer', streak: 'cheer', error: 'oops', busy: 'think', incomingSubmitted: 'wave', incomingDone: 'happy' };
const PRIORITY = { levelUp: 9, streak: 8, approved: 7, completed: 6, voice: 5, allocated: 5, submitted: 4, rejected: 4, assignedToMe: 4, created: 3, deleted: 2, statusProgress: 2, error: 2, incomingSubmitted: 2, incomingDone: 1, updated: 1 };
const BIG = new Set(['levelUp', 'streak', 'approved', 'completed', 'allocated']);
const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 50, 100];
const IGNORED_ENTITIES = new Set(['ActivityLog', 'SheetSync', 'FileUpload', 'Notification']);
const NOUN = { Task: 'task', DailyTask: 'daily task', Project: 'project', Team: 'team', TeamMember: 'teammate', User: 'teammate', ProjectResource: 'resource' };
const JOKES = [
  'Why did the task cross the road? To get to the DONE column! 🐔',
  'I would tell you a deadline joke, but you would not get it until Friday. 📅',
  'Fun fact: tasks completed with a smile are 100% more fun. 😄',
  'Psst… drink some water. Hydrated humans finish more tasks! 💧',
  'I ran out of tasks to cheer for. Give me more! 📣',
  'Knock knock. Who is there? Your next deadline! ⏰',
  'Stretch break? I will guard your tasks. 🧘',
];

export function FunProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettingsState] = useState(loadSettings);
  const [mood, setMood] = useState('happy');
  const [bubble, setBubble] = useState(null); // { text, id }
  const [bursts, setBursts] = useState([]); // comic words
  const [stamp, setStamp] = useState(null);
  const [stats, setStats] = useState(null);
  const refs = useRef({ settings, pending: 0, queue: [], flush: null, lastBig: 0, bubbleTimer: null, bubbleActive: false, idle: null, busyTimer: null, statsTimer: null });
  refs.current.settings = settings;

  const setSettings = useCallback((patch) => {
    setSettingsState((s) => {
      const next = { ...s, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => { document.body.classList.toggle('fun', settings.cartoon); }, [settings.cartoon]);
  useEffect(() => { document.body.classList.toggle('calm', settings.anim === 'calm'); }, [settings.anim]);

  const say = useCallback((text, nextMood = 'happy', ms = 4200) => {
    const r = refs.current;
    clearTimeout(r.bubbleTimer);
    r.bubbleActive = true;
    setMood(nextMood);
    setBubble({ text, id: Date.now() });
    r.bubbleTimer = setTimeout(() => { r.bubbleActive = false; setBubble(null); setMood('happy'); }, ms);
  }, []);

  const sleepSoon = useCallback(() => {
    const r = refs.current;
    clearTimeout(r.idle);
    r.idle = setTimeout(() => { if (!r.pending) setMood('sleep'); }, 90000);
  }, []);

  /** Plays one moment: copy + mascot mood + comic word + confetti + sound. */
  const fire = useCallback((kind, { count = 1, x = '', soft = false } = {}) => {
    const r = refs.current;
    const { anim, sound } = r.settings;
    const full = anim === 'full';
    let text = pick(COPY[kind] || COPY.updated).replace('{x}', x || NOUN.DailyTask);
    if (count > 1 && ['created', 'deleted', 'completed', 'updated'].includes(kind)) text = `${count} at once! ${text}`;
    say(text, MOOD[kind] || 'happy');
    sleepSoon();

    const now = Date.now();
    const big = BIG.has(kind) && now - r.lastBig > 2500 && !soft;
    if (big) r.lastBig = now;

    if (full) {
      if (BURST[kind] && !soft) {
        const id = `${now}-${Math.random()}`;
        setBursts((b) => [...b.slice(-2), { id, word: BURST[kind], kind }]);
        setTimeout(() => setBursts((b) => b.filter((x2) => x2.id !== id)), 1500);
      }
      if (kind === 'approved') { setStamp(`${now}`); setTimeout(() => setStamp(null), 2200); }
      if (kind === 'levelUp') effects.fireworks();
      else if (kind === 'streak') effects.rain('🔥');
      else if (kind === 'approved') effects.stars();
      else if (big) effects.big();
      else if (kind === 'deleted') effects.poof();
      else if (kind === 'assignedToMe') effects.emoji('📬');
      else if (kind === 'allocated') effects.emoji('✈️');
      else if (kind === 'submitted') effects.emoji('🚀');
      else if (kind === 'voice') effects.emoji('🎤');
      else if (kind === 'created' && !soft) effects.small();
      else if (kind === 'statusProgress') effects.emoji('🏎️');
      else if (kind === 'rejected') effects.emoji('🛠️');
    }
    if (full || kind === 'levelUp') {
      play({ levelUp: 'levelUp', streak: 'fanfare', approved: 'fanfare', completed: 'ding', created: 'pop', allocated: 'whoosh', submitted: 'whoosh', rejected: 'womp', error: 'womp', deleted: 'poof', assignedToMe: 'blip', incomingSubmitted: 'blip', incomingDone: 'blip', voice: 'boing', statusProgress: 'boing', updated: 'pop' }[kind] || 'pop', sound);
    }
  }, [say, sleepSoon]);

  /** Several things happening at once (imports, bulk creates) collapse into a single moment. */
  const celebrate = useCallback((kind, opts = {}) => {
    const r = refs.current;
    r.queue.push({ kind, ...opts });
    if (r.flush) return;
    r.flush = setTimeout(() => {
      const batch = r.queue.splice(0);
      r.flush = null;
      const top = batch.reduce((a, b) => ((PRIORITY[b.kind] || 0) > (PRIORITY[a.kind] || 0) ? b : a));
      const same = batch.filter((b) => b.kind === top.kind);
      fire(top.kind, { ...top, count: same.reduce((n, b) => n + (b.count || 1), 0) });
    }, 450);
  }, [fire]);

  // ---- progress (XP / level / streak) ----
  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const s = await request('GET', `/api/me/stats?today=${format(new Date(), 'yyyy-MM-dd')}`);
      setStats(s);
      const lvKey = `tasky_level_${user.id}`;
      const stKey = `tasky_streak_${user.id}`;
      let prevLevel = null;
      let prevStreak = 0;
      try { prevLevel = Number(localStorage.getItem(lvKey)) || null; prevStreak = Number(localStorage.getItem(stKey)) || 0; } catch { /* ignore */ }
      if (prevLevel !== null && s.level > prevLevel) celebrate('levelUp', { x: s.title });
      else if (s.streak > prevStreak && STREAK_MILESTONES.includes(s.streak)) celebrate('streak', { x: s.streak });
      try { localStorage.setItem(lvKey, String(s.level)); localStorage.setItem(stKey, String(s.streak)); } catch { /* ignore */ }
    } catch { /* progress is a bonus */ }
  }, [user, celebrate]);

  const refreshStatsSoon = useCallback(() => {
    clearTimeout(refs.current.statsTimer);
    refs.current.statsTimer = setTimeout(loadStats, 1200);
  }, [loadStats]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ---- events from the data layer and from notifications ----
  useEffect(() => {
    const onEvent = (e) => {
      const d = e.detail;
      const r = refs.current;
      if (d.type === 'busy') {
        r.pending = Math.max(0, r.pending + (d.on ? 1 : -1));
        clearTimeout(r.busyTimer);
        if (r.pending > 0) r.busyTimer = setTimeout(() => { if (r.pending > 0 && !r.bubbleActive) say(pick(COPY.busy), 'think', 6000); }, 500);
        return;
      }
      if (d.type === 'error') { celebrate('error'); return; }
      if (d.type === 'voice') { celebrate('voice'); return; }
      if (d.type === 'weekly') {
        if (d.action === 'save') { if (d.count) celebrate('allocated'); } else celebrate({ submit: 'submitted', approve: 'approved', reject: 'rejected' }[d.action]);
        refreshStatsSoon();
        return;
      }
      if (d.type === 'entity') {
        if (IGNORED_ENTITIES.has(d.entity)) return;
        const noun = NOUN[d.entity] || 'item';
        if (d.action === 'create') celebrate('created', { x: noun });
        else if (d.action === 'delete') celebrate('deleted', { x: noun });
        else {
          const status = d.patch?.task_status || d.patch?.status;
          if (status === 'Completed') celebrate('completed');
          else if (status === 'In Progress') celebrate('statusProgress');
          else celebrate('updated');
        }
        if (d.entity === 'DailyTask') refreshStatsSoon();
        return;
      }
      if (d.type === 'notify') {
        const t = d.notification?.type || '';
        if (t === 'weekly_approved') celebrate('approved', { soft: false });
        else if (t === 'weekly_rejected') celebrate('rejected');
        else if (t === 'task_assigned' || t === 'weekly_allocation') celebrate('assignedToMe');
        else if (t === 'weekly_submitted') celebrate('incomingSubmitted');
        else if (t === 'task_status') celebrate('incomingDone');
        if (t === 'weekly_approved') refreshStatsSoon();
      }
    };
    window.addEventListener('tasky:fun', onEvent);
    return () => window.removeEventListener('tasky:fun', onEvent);
  }, [celebrate, say, refreshStatsSoon]);

  useEffect(() => { sleepSoon(); return () => { const r = refs.current; clearTimeout(r.idle); clearTimeout(r.bubbleTimer); clearTimeout(r.flush); clearTimeout(r.statsTimer); clearTimeout(r.busyTimer); }; }, [sleepSoon]);

  const poke = () => {
    play('boing', settings.sound);
    say(pick(JOKES), 'wink', 6000);
    sleepSoon();
  };

  const value = useMemo(() => ({ settings, setSettings, stats, celebrate, say, mood }), [settings, setSettings, stats, celebrate, say, mood]);

  return (
    <FunContext.Provider value={value}>
      {children}
      {settings.mascot && (
        <div className="fixed bottom-3 left-3 z-[90] flex items-end gap-2 pointer-events-none max-w-[calc(100vw-1.5rem)]">
          <button type="button" onClick={poke} aria-label="Tap Tasky for a joke" className="pointer-events-auto shrink-0 focus:outline-none">
            <Mascot mood={mood} size={76} className={mood === 'cheer' ? 'tasky-jump' : mood === 'oops' ? 'tasky-shake' : mood === 'sleep' ? '' : 'tasky-bob'} />
          </button>
          {bubble && (
            <div key={bubble.id} className="pointer-events-auto mb-8 max-w-[15rem] animate-bubble rounded-2xl rounded-bl-sm border-[3px] border-slate-900 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-[3px_3px_0_rgba(0,0,0,.45)]" role="status">
              {bubble.text}
            </div>
          )}
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center overflow-hidden" aria-hidden="true">
        {bursts.map((b) => (
          <div key={b.id} className="comic-burst absolute animate-burst"><span>{b.word}</span></div>
        ))}
        {stamp && <div key={stamp} className="approved-stamp animate-stamp">APPROVED!</div>}
      </div>
    </FunContext.Provider>
  );
}

export function useFun() {
  const ctx = useContext(FunContext);
  if (!ctx) throw new Error('useFun must be used inside <FunProvider>');
  return ctx;
}
