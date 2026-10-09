import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bird, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { request } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useFun } from './FunProvider';
import { emitFun } from './bus';
import { play } from './sounds';
import { hasWebGL, SPECIES } from './three/species';
import { BIRDS, BIRD_IDS } from './three/Bird3D';
import { Emoji } from '@/icons/Emoji';

const BirdFlights = lazy(() => import('./three/BirdFlights'));
const BirdPerch = lazy(() => import('./three/BirdPerch'));
const BirdPreviewStage = lazy(() => import('./three/BirdPreviewStage'));
const PREVIEW_POSES = ['perch', 'sing', 'dance', 'love', 'wave', 'puff', 'preen', 'hop'];
const BANNERS = ['You are doing great!', 'Nice work, team!', 'Stretch break?', 'Hydrate!', 'Almost Friday!', 'Tiny steps count', 'Ship it!', 'Take a deep breath', 'You got this!', 'High five!', 'Snack time?', 'Proud of you!', 'Keep going!'];
const CHEERS = ['Nice one!', 'Task done!', 'Boom!', 'Great job!', 'Crushed it!'];
const PASTELS = ['#fde68a', '#bae6fd', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa'];
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (l) => l[Math.floor(Math.random() * l.length)];
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const MAX = 280;

/** Header button: opens the composer; shows how many birds are waiting for you. */
export function BirdButton() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = (e) => setN(e.detail?.count || 0);
    window.addEventListener('tasky:birds', on);
    return () => window.removeEventListener('tasky:birds', on);
  }, []);
  return (
    <button type="button" onClick={() => emitFun({ type: 'birdCompose' })} aria-label={n ? `Send an anonymous bird (${n} waiting for you)` : 'Send an anonymous bird'} title="Bird post: send an anonymous message" className="relative p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white">
      <Bird className={`w-4 h-4 ${n ? 'text-sky-300' : ''}`} />
      {n > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{n}</span>}
    </button>
  );
}

function Composer({ open, onOpenChange, onSent }) {
  const [people, setPeople] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [everyone, setEveryone] = useState(false);
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [bird, setBird] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [poseIdx, setPoseIdx] = useState(0);
  const [shuffle, setShuffle] = useState(0);
  const { settings: fun } = useFun();
  useEffect(() => { if (bird) return undefined; const t = setInterval(() => setShuffle((x) => x + 1), 3500); return () => clearInterval(t); }, [bird]);
  const previewType = bird || BIRD_IDS[shuffle % BIRD_IDS.length];

  useEffect(() => {
    if (!open) return;
    setError('');
    request('GET', '/api/birds/recipients').then(setPeople).catch((e) => setError(e.message));
  }, [open]);

  const shown = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const count = everyone ? people.length : picked.size;
  const toggle = (id) => { setEveryone(false); setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const valid = count > 0 && text.trim().length > 0 && text.length <= MAX;

  const send = async () => {
    setBusy(true); setError('');
    try {
      await request('POST', '/api/birds', { to: everyone ? 'all' : [...picked], text, bird: bird || undefined });
      onSent(count, bird);
      setText(''); setPicked(new Set()); setEveryone(false); setBird(''); setQ('');
      onOpenChange(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-xl font-extrabold flex items-center gap-2"><Bird className="w-5 h-5 text-sky-300" />Bird post</DialogTitle>
        <DialogDescription className="text-slate-300">
          Send an anonymous message. Nobody will see who it came from, and it flies away 5 minutes after it is opened. Be kind: anyone can pause birds in their settings.
        </DialogDescription>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold text-slate-200">To</span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={everyone} onChange={(e) => { setEveryone(e.target.checked); if (e.target.checked) setPicked(new Set()); }} />Everyone ({people.length})</label>
            </div>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teammates…" aria-label="Search teammates" className="bg-slate-800 border-slate-600 text-white mb-1.5 h-9" />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800" role="group" aria-label="Recipients">
              {shown.length === 0 && <div className="p-3 text-xs text-slate-500">{people.length ? 'No match.' : 'Nobody else is here yet.'}</div>}
              {shown.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-800">
                  <input type="checkbox" checked={everyone || picked.has(p.id)} disabled={everyone} onChange={() => toggle(p.id)} />
                  <span className="flex-1 truncate">{p.name}</span>
                </label>
              ))}
            </div>
            {!everyone && shown.length > 1 && <button type="button" onClick={() => { setPicked(new Set(shown.map((p) => p.id))); }} className="mt-1 text-xs text-sky-300 underline">Select all shown</button>}
          </div>
          <div>
            <label htmlFor="bird-text" className="text-sm font-bold text-slate-200">Message</label>
            <Textarea id="bird-text" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX + 40))} rows={4} placeholder="A kind word, a thank-you, a joke…" className="bg-slate-800 border-slate-600 text-white mt-1" />
            <div className={`text-right text-[11px] ${text.length > MAX ? 'text-red-400' : 'text-slate-500'}`}>{text.length}/{MAX}</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200 mb-1">Messenger</div>
            {fun.view3d && hasWebGL() && (
              <button type="button" onClick={() => setPoseIdx((i) => i + 1)} aria-label="Make the bird strike another pose" title="Tap the bird!" className="mx-auto mb-1 block rounded-xl bg-gradient-to-b from-sky-900/40 to-slate-800/40 border-2 border-slate-900">
                <Suspense fallback={<div style={{ width: 150, height: 130 }} />}><BirdPreviewStage type={previewType} pose={PREVIEW_POSES[poseIdx % PREVIEW_POSES.length]} calm={fun.anim === 'calm'} width={170} height={130} /></Suspense>
              </button>
            )}
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Messenger bird">
              <button type="button" role="radio" aria-checked={bird === ''} onClick={() => setBird('')} className={`rounded-lg border-2 border-slate-900 px-2.5 py-1 text-xs font-bold ${bird === '' ? 'bg-yellow-300 text-ink' : 'bg-slate-800 text-slate-200'}`}>Surprise me</button>
              {BIRD_IDS.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={bird === id} onClick={() => setBird(id)} className={`rounded-lg border-2 border-slate-900 px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 ${bird === id ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>
                  <span className="w-3 h-3 rounded-full border border-slate-900" style={{ background: BIRDS[id].breast }} />{BIRDS[id].name}
                </button>
              ))}
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={send} disabled={!valid || busy} className="bg-sky-500 hover:bg-sky-400 text-ink font-extrabold"><Send className="w-4 h-4 mr-1.5" />{busy ? 'Sending…' : count > 1 ? `Send ${count} birds` : 'Send bird'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A letter from a bird: opening it starts a five-minute countdown, then it folds up and flies away. */
function Letter({ item, now, onClose, onDismiss }) {
  if (!item) return null;
  const left = item.expires_at ? item.expires_at - now : 0;
  const pct = Math.max(0, Math.min(100, (left / 300000) * 100));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-transparent border-0 shadow-none p-0 text-slate-900 [&>button]:text-white">
        <DialogTitle className="sr-only">A message from a little bird</DialogTitle>
        <DialogDescription className="sr-only">An anonymous message. It disappears five minutes after you opened it.</DialogDescription>
        <div className="bird-letter">
          <div className="bird-letter-seal" aria-hidden="true"><Emoji e="🪶" size="1.4rem" /></div>
          <div className="text-xs font-extrabold tracking-widest text-amber-800/70 mb-2">A LITTLE BIRD TOLD ME…</div>
          <p className="text-lg leading-snug whitespace-pre-wrap break-words font-semibold text-slate-800">{item.text}</p>
          <div className="text-right text-xs text-amber-900/60 mt-3 italic">— anonymous</div>
          <div className="mt-4" role="timer" aria-label="Time before this message flies away">
            <div className="h-2 rounded-full bg-amber-900/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} /></div>
            <div className="flex justify-between text-[11px] text-amber-900/70 mt-1"><span>Flies away in {fmt(left)}</span><button type="button" onClick={onDismiss} className="underline font-bold">Let it fly now</button></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The whole bird post: inbox polling + live signal, composer, the perch in the corner, letters, and the 3D flights. */
export default function BirdPost() {
  const { user } = useAuth();
  const { settings } = useFun();
  const [inbox, setInbox] = useState([]);
  const [landed, setLanded] = useState(new Set());
  const [flights, setFlights] = useState([]);
  const [composer, setComposer] = useState(false);
  const [panel, setPanel] = useState(false);
  const [letterId, setLetterId] = useState(null);
  const [now, setNow] = useState(Date.now());
  const known = useRef(null);
  const sRef = useRef(settings); sRef.current = settings;
  const inRef = useRef(inbox); inRef.current = inbox;
  const three = settings.view3d && hasWebGL();
  const fancy = () => sRef.current.anim === 'full' && sRef.current.view3d && hasWebGL();

  const addFlight = useCallback((f, ms) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFlights((l) => [...l, { id, delay: 0, birds: [], ...f }]);
    setTimeout(() => setFlights((l) => l.filter((x) => x.id !== id)), ms);
  }, []);
  const lastBy = useRef(0);
  const flyby = useCallback((opts = {}) => {
    if (!fancy()) return;
    lastBy.current = Date.now();
    const styles = ['cross', 'cross', 'loop', 'dive', 'flock', 'zigzag'];
    const style = opts.style || pickOne(styles);
    const n = style === 'flock' ? 5 : 1;
    const banner = opts.banner === null ? null : (opts.banner || (style === 'flock' ? null : (Math.random() < 0.8 ? pickOne(BANNERS) : null)));
    const type = pickOne(BIRD_IDS);
    addFlight({ kind: 'by', n, style, dir: Math.random() < 0.5 ? 1 : -1, alt: rnd(0.14, 0.7), seed: rnd(0, 6), birds: n > 1 ? [type] : [type], banner, bannerColor: pickOne(PASTELS), delay: 0, dur: opts.dur || rnd(8, 10.5) }, 12500);
    play('tweet', sRef.current.sound);
  }, [addFlight]);
  const anchor = () => ({ x: window.innerWidth - 16 - 100, y: window.innerHeight - 140 - 56 });

  const load = useCallback(async () => {
    try {
      const list = await request('GET', '/api/birds/inbox');
      const first = known.current === null;
      const fresh = list.filter((b) => !first && !known.current.has(b.id));
      known.current = new Set(list.map((b) => b.id));
      setInbox(list);
      if (first || !fancy()) setLanded(new Set(list.map((b) => b.id)));
      else if (fresh.length) {
        addFlight({ kind: 'in', n: Math.min(3, fresh.length), to: anchor(), birds: fresh.map((b) => b.bird) }, 3600);
        play('tweet', sRef.current.sound);
        setTimeout(() => setLanded((s) => new Set([...s, ...fresh.map((b) => b.id)])), 3000);
      } else setLanded((s) => new Set([...s, ...list.filter((b) => b.opened).map((b) => b.id)]));
    } catch { /* offline or signed out */ }
  }, [addFlight]);

  useEffect(() => {
    if (!user) return undefined;
    known.current = null;
    load();
    const poll = setInterval(() => { if (!document.hidden) load(); }, 30000);
    const onFun = (e) => {
      const d = e.detail || {};
      if (d.type === 'bird') load();
      else if (d.type === 'birdCompose') setComposer(true);
      else if (d.type === 'birdFlyby') flyby(d);
      else if (d.type === 'entity' && sRef.current.flybys !== false && (d.patch?.task_status === 'Completed' || d.patch?.status === 'Completed') && Date.now() - lastBy.current > 60000 && Math.random() < 0.4) setTimeout(() => flyby({ banner: pickOne(CHEERS), style: pickOne(['loop', 'cross', 'dive']) }), 900);
    };
    const onVis = () => { if (!document.hidden) load(); };
    window.addEventListener('tasky:fun', onFun);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(poll); window.removeEventListener('tasky:fun', onFun); document.removeEventListener('visibilitychange', onVis); };
  }, [user?.id, load, flyby]);

  // now and then a bird crosses the screen on whatever page you are on
  useEffect(() => {
    if (!user) return undefined;
    let t;
    const next = (first) => { t = setTimeout(() => { if (!document.hidden && sRef.current.flybys !== false && !document.querySelector('.lunch-screen, .idle-saver, .cast-party')) flyby(); next(false); }, (first ? rnd(25, 45) : rnd(110, 260)) * 1000); };
    next(true);
    return () => clearTimeout(t);
  }, [user?.id, flyby]);

  // tick every second; birds whose letters ran out fly away
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now(); setNow(n);
      const gone = inRef.current.filter((b) => b.opened && b.expires_at && n >= b.expires_at);
      if (gone.length) {
        setInbox((l) => l.filter((b) => !gone.some((g) => g.id === b.id)));
        setLetterId((id) => (gone.some((g) => g.id === id) ? null : id));
        if (fancy()) { const a = anchor(); addFlight({ kind: 'out', n: Math.min(2, gone.length), from: a, birds: gone.map((g) => g.bird) }, 3800); play('whoosh', sRef.current.sound); }
        load();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [addFlight, load]);

  useEffect(() => {
    const waiting = inbox.filter((b) => !b.opened).length;
    window.dispatchEvent(new CustomEvent('tasky:birds', { detail: { count: waiting } }));
  }, [inbox]);

  const open = async (b) => {
    try {
      const r = await request('POST', `/api/birds/${b.id}/open`);
      setInbox((l) => l.map((x) => (x.id === b.id ? { ...x, opened: true, text: r.text, expires_at: r.expires_at } : x)));
      setLetterId(b.id); setPanel(false); play('blip', sRef.current.sound);
    } catch { load(); }
  };
  const dismiss = async (id) => {
    const b = inbox.find((x) => x.id === id);
    setInbox((l) => l.filter((x) => x.id !== id)); setLetterId(null);
    try { await request('DELETE', `/api/birds/${id}`); } catch { /* ignore */ }
    if (b && fancy()) addFlight({ kind: 'out', n: 1, from: anchor(), birds: [b.bird] }, 3800);
  };

  const onSent = (count, bird) => {
    if (fancy()) {
      addFlight({ kind: 'out', n: Math.min(count, 6), from: { x: window.innerWidth / 2, y: window.innerHeight * 0.62 }, birds: bird ? [bird] : [] }, 4200);
      play('tweet', sRef.current.sound);
    }
    emitFun({ type: 'say', text: count > 1 ? `${count} birds are on their way!` : 'Your bird is on its way!', mood: 'wave' });
  };

  const visible = useMemo(() => inbox.filter((b) => landed.has(b.id)), [inbox, landed]);
  const letter = inbox.find((b) => b.id === letterId && b.opened);

  return (
    <>
      <Composer open={composer} onOpenChange={setComposer} onSent={onSent} />
      <Letter item={letter} now={now} onClose={() => setLetterId(null)} onDismiss={() => dismiss(letterId)} />
      {three && flights.length > 0 && <Suspense fallback={null}><BirdFlights flights={flights} /></Suspense>}
      {visible.length > 0 && (
        <div className="bird-tray" style={{ bottom: 'calc(7.5rem + env(safe-area-inset-bottom, 0px))' }}>
          {panel && (
            <div className="bird-panel" role="menu" aria-label="Birds waiting for you">
              <div className="text-xs font-extrabold text-slate-300 px-1 pb-1">Anonymous birds</div>
              {visible.map((b) => (
                <button key={b.id} type="button" role="menuitem" onClick={() => open(b)} className="w-full flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-left text-sm">
                  <span className="w-3 h-3 rounded-full border border-slate-900 shrink-0" style={{ background: BIRDS[b.bird]?.breast }} />
                  <span className="flex-1">{b.opened ? 'Read again' : `A ${BIRDS[b.bird]?.name || 'little'} bird has a letter`}</span>
                  <span className="text-[11px] text-amber-300">{b.opened ? `flies away in ${fmt((b.expires_at || now) - now)}` : 'sealed'}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setPanel((p) => !p)} aria-expanded={panel} aria-label={`${visible.filter((b) => !b.opened).length} anonymous birds waiting`} className="bird-perch">
            {three ? <Suspense fallback={<div style={{ width: 200, height: 112 }} />}><BirdPerch birds={visible} calm={settings.anim === 'calm'} /></Suspense> : <span className="p-3 block"><Emoji e="🕊" size="2.4rem" /></span>}
            {visible.some((b) => !b.opened) && <span className="bird-perch-badge">{visible.filter((b) => !b.opened).length}</span>}
          </button>
        </div>
      )}
    </>
  );
}
