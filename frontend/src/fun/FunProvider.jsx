import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import Mascot from './Mascot';
import BadgeUnlock from './BadgeUnlock';
import { effects } from './effects';
import { play } from './sounds';
import { Emoji, Rich } from '@/icons/Emoji';

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
  quest: ['Quest complete: {x}! +15 XP 🗺️', 'Quest done: {x}! Treasure unlocked 💰'],
  badge: ['New badge: {x}! 🏅', 'You earned {x}! Check the trophy shelf 🏆'],
  kudos: ['{x} sent you a high-five! 🙌', 'Shout-out from {x}! 💛'],
  kudosSent: ['High-five delivered! 🙌', 'Spreading the love! 💛'],
  chest: ['Your treasure chest is ready! 🎁', 'Ooh, a chest is waiting for you! 🎁'],
  focusStart: ['Focus time! I will guard the fort 🏰', 'Deep work mode on. Ignoring the world 🎧'],
  focusDone: ['Focus session complete! 🍅 Stretch time!', 'Ding! You focused like a champion 🧘'],
  party: ['PARTY MODE! 🎉🎉🎉'],
};
const BURST = { quest: 'QUEST!', badge: 'BADGE!', kudos: '🙌', focusDone: 'FOCUS!', party: 'PARTY!', created: 'POW!', completed: 'BAM!', approved: 'YES!', submitted: 'ZOOM!', rejected: 'OOPS!', allocated: 'WHOOSH!', assignedToMe: 'PING!', statusProgress: 'VROOM!', deleted: 'POOF!', voice: 'DROP!', levelUp: 'LEVEL UP!', streak: 'HOT!', error: 'UH-OH!' };
const MOOD = { quest: 'cheer', badge: 'cheer', kudos: 'wave', kudosSent: 'wink', chest: 'wave', focusStart: 'think', focusDone: 'cheer', party: 'cheer', created: 'cheer', completed: 'cheer', approved: 'cheer', submitted: 'happy', rejected: 'oops', allocated: 'happy', assignedToMe: 'wave', statusProgress: 'happy', updated: 'wink', deleted: 'oops', voice: 'cheer', levelUp: 'cheer', streak: 'cheer', error: 'oops', busy: 'think', incomingSubmitted: 'wave', incomingDone: 'happy' };
const PRIORITY = { party: 10, badge: 8, quest: 6, kudos: 5, focusDone: 6, kudosSent: 2, chest: 3, focusStart: 2, levelUp: 9, streak: 8, approved: 7, completed: 6, voice: 5, allocated: 5, submitted: 4, rejected: 4, assignedToMe: 4, created: 3, deleted: 2, statusProgress: 2, error: 2, incomingSubmitted: 2, incomingDone: 1, updated: 1 };
const BIG = new Set(['levelUp', 'streak', 'approved', 'completed', 'allocated', 'badge', 'party', 'focusDone']);
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
  const [badgeQueue, setBadgeQueue] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [partyOn, setPartyOn] = useState(false);
  const refs = useRef({ pointer: { x: 0, y: 0 }, lastActive: Date.now(), lastNudge: 0, stats: null, settings, pending: 0, queue: [], flush: null, lastBig: 0, bubbleTimer: null, bubbleActive: false, idle: null, busyTimer: null, statsTimer: null });
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

  /** "+10 XP" that floats up from where the user last clicked. */
  const floatXp = useCallback((text) => {
    if (refs.current.settings.anim !== 'full') return;
    const id = `${Date.now()}-${Math.random()}`;
    const { x, y } = refs.current.pointer;
    setFloaters((f) => [...f.slice(-4), { id, text, x: x || window.innerWidth / 2, y: y || 120 }]);
    setTimeout(() => setFloaters((f) => f.filter((i) => i.id !== id)), 1400);
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
      else if (kind === 'kudos') effects.rain('🙌');
      else if (kind === 'kudosSent') effects.emoji('💛');
      else if (kind === 'quest') effects.emoji('🗺️');
      else if (kind === 'chest') effects.emoji('🎁');
      else if (kind === 'focusDone') effects.emoji('🍅');
    }
    if (full || kind === 'levelUp') {
      play({ badge: 'fanfare', quest: 'ding', kudos: 'ding', kudosSent: 'pop', chest: 'blip', focusDone: 'fanfare', focusStart: 'blip', party: 'fanfare', levelUp: 'levelUp', streak: 'fanfare', approved: 'fanfare', completed: 'ding', created: 'pop', allocated: 'whoosh', submitted: 'whoosh', rejected: 'womp', error: 'womp', deleted: 'poof', assignedToMe: 'blip', incomingSubmitted: 'blip', incomingDone: 'blip', voice: 'boing', statusProgress: 'boing', updated: 'pop' }[kind] || 'pop', sound);
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

  // ---- progress (XP / level / streak / quests / badges) ----
  const loadStats = useCallback(async () => {
    if (!user) return;
    try {
      const s = await request('POST', '/api/me/sync', { today: format(new Date(), 'yyyy-MM-dd') });
      const before = refs.current.stats;
      refs.current.stats = s;
      setStats(s);
      const lvKey = `tasky_level_${user.id}`;
      const stKey = `tasky_streak_${user.id}`;
      let prevLevel = null;
      let prevStreak = 0;
      try { prevLevel = Number(localStorage.getItem(lvKey)) || null; prevStreak = Number(localStorage.getItem(stKey)) || 0; } catch { /* ignore */ }
      s.new_quests.forEach((id) => { const q = s.quests.find((x) => x.id === id); if (q) { celebrate('quest', { x: q.title }); floatXp(`+${q.xp} XP`); } });
      if (s.new_badges.length) { setBadgeQueue((q) => [...q, ...s.new_badges]); celebrate('badge', { x: s.new_badges[0].name }); }
      if (prevLevel !== null && s.level > prevLevel) celebrate('levelUp', { x: s.title });
      else if (s.streak > prevStreak && STREAK_MILESTONES.includes(s.streak)) celebrate('streak', { x: s.streak });
      if (s.drop_state === 'ready' && before?.drop_state !== 'ready') setTimeout(() => celebrate('chest'), 1800);
      try { localStorage.setItem(lvKey, String(s.level)); localStorage.setItem(stKey, String(s.streak)); } catch { /* ignore */ }
    } catch { /* progress is a bonus */ }
  }, [user, celebrate, floatXp]);

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
      if (d.type === 'kudosSent') { celebrate('kudosSent'); refreshStatsSoon(); return; }
      if (d.type === 'focus') { celebrate(d.on ? 'focusStart' : 'focusDone'); return; }
      if (d.type === 'say') { say(d.text, d.mood || 'happy'); return; }
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
          if (status === 'Completed') { celebrate('completed'); if (d.entity === 'DailyTask') floatXp('+10 XP'); }
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
        else if (t === 'kudos') celebrate('kudos', { x: d.notification.actor_name || 'A teammate' });
        if (t === 'weekly_approved' || t === 'kudos') refreshStatsSoon();
      }
    };
    window.addEventListener('tasky:fun', onEvent);
    return () => window.removeEventListener('tasky:fun', onEvent);
  }, [celebrate, say, refreshStatsSoon, floatXp]);

  useEffect(() => { sleepSoon(); return () => { const r = refs.current; clearTimeout(r.idle); clearTimeout(r.bubbleTimer); clearTimeout(r.flush); clearTimeout(r.statsTimer); clearTimeout(r.busyTimer); }; }, [sleepSoon]);

  // Track the pointer (for floating XP), idle time (for gentle nudges) and a secret code.
  useEffect(() => {
    const r = refs.current;
    const touch = () => { r.lastActive = Date.now(); };
    const onDown = (e) => { r.pointer = { x: e.clientX, y: e.clientY }; touch(); };
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    const onKey = (e) => {
      touch();
      pos = e.key === code[pos] ? pos + 1 : e.key === code[0] ? 1 : 0;
      if (pos === code.length) {
        pos = 0;
        setPartyOn(true);
        celebrate('party');
        effects.fireworks();
        setTimeout(() => setPartyOn(false), 6000);
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', touch, { passive: true });
    window.addEventListener('keydown', onKey);
    const nudge = setInterval(() => {
      const st = r.stats;
      const idleMs = Date.now() - r.lastActive;
      if (document.hidden || idleMs < 120000 || Date.now() - r.lastNudge < 20 * 60000 || !st) return;
      r.lastNudge = Date.now();
      const left = st.planned_today - st.completed_today;
      if (st.drop_state === 'ready') say('Psst! Your treasure chest is waiting 🎁', 'wave', 7000);
      else if (st.at_risk) say(`Your ${st.streak}-day streak needs one finished task today 🔥`, 'think', 7000);
      else if (left > 0) say(`${left} task${left === 1 ? '' : 's'} left today. You can do it! 💪`, 'wave', 7000);
    }, 30000);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('keydown', onKey);
      clearInterval(nudge);
    };
  }, [celebrate, say]);

  useEffect(() => { document.body.classList.toggle('party', partyOn); }, [partyOn]);

  const poke = () => {
    play('boing', settings.sound);
    say(pick(JOKES), 'wink', 6000);
    sleepSoon();
  };

  const value = useMemo(() => ({ settings, setSettings, stats, celebrate, say, mood, refreshStats: loadStats }), [settings, setSettings, stats, celebrate, say, mood, loadStats]);

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
              <Rich text={bubble.text} />
            </div>
          )}
        </div>
      )}
      <div className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center overflow-hidden" aria-hidden="true">
        {bursts.map((b) => (
          <div key={b.id} className="comic-burst absolute animate-burst"><span><Rich text={b.word} size="1.1em" /></span></div>
        ))}
        {stamp && <div key={stamp} className="approved-stamp animate-stamp">APPROVED!</div>}
      </div>
      <div className="pointer-events-none fixed inset-0 z-[160] overflow-hidden" aria-hidden="true">
        {floaters.map((f) => <div key={f.id} className="xp-float" style={{ left: f.x, top: f.y }}>{f.text}</div>)}
      </div>
      <BadgeUnlock badge={badgeQueue[0]} onClose={() => setBadgeQueue((q) => q.slice(1))} />
    </FunContext.Provider>
  );
}

export function useFun() {
  const ctx = useContext(FunContext);
  if (!ctx) throw new Error('useFun must be used inside <FunProvider>');
  return ctx;
}
