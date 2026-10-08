import { Link } from 'react-router-dom';
import React from 'react';
import { useState } from 'react';
import TrophyShelf from './TrophyShelf';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFun } from './FunProvider';
import { emitFun } from './bus';
import ArcadeGame from './ArcadeGame';
import { Emoji, Rich } from '@/icons/Emoji';

const Toggle = ({ label, on, onChange, hint }) => (
  <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
    <span className="text-sm text-slate-200">{label}{hint && <span className="block text-[11px] text-slate-500">{hint}</span>}</span>
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full border-2 border-slate-900 transition-colors relative ${on ? 'bg-emerald-400' : 'bg-slate-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  </label>
);

/** Header chip: level + XP bar + streak. Opens a panel with progress details and the fun settings. */
export default function ProgressChip() {
  const { stats, settings, setSettings } = useFun();
  const [shelf, setShelf] = useState(false);
  const [arcade, setArcade] = useState(false);
  const span = stats ? Math.max(1, stats.next_level_xp - stats.level_start_xp) : 1;
  const pct = stats ? Math.min(100, Math.round(((stats.xp - stats.level_start_xp) / span) * 100)) : 0;

  return (
    <>
    <TrophyShelf open={shelf} onOpenChange={setShelf} />
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" data-fun-target="xp" aria-label="Your level and fun settings" className="chip-sticker flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-800/70 pl-1.5 pr-3 py-1 text-xs text-white">
          <span className="grid place-items-center w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-400 to-blue-500 font-extrabold text-[11px] text-ink">{stats ? stats.level : '…'}</span>
          <span className="hidden md:flex flex-col leading-tight text-left">
            <span className="font-semibold whitespace-nowrap">{stats ? stats.title : "Loading"}</span>
            <span className="h-1.5 w-20 rounded-full bg-slate-700 overflow-hidden"><span className="block h-full bg-gradient-to-r from-emerald-400 to-yellow-300 transition-all duration-700" style={{ width: `${pct}%` }} /></span>
          </span>
          {stats?.streak > 0 && <span title={`${stats.streak}-day streak`} className="font-bold text-orange-300 inline-flex items-center"><Emoji e="🔥" />{stats.streak}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-slate-900 border-slate-700 text-white">
        {stats && (
          <div className="space-y-2 pb-3 mb-3 border-b border-slate-700">
            <div className="text-lg font-extrabold">Level {stats.level} · {stats.title}</div>
            <div className="h-3 rounded-full bg-slate-700 overflow-hidden border border-slate-900"><div className="h-full bg-gradient-to-r from-emerald-400 to-yellow-300 xp-bar" style={{ width: `${pct}%` }} /></div>
            <div className="text-xs text-slate-400">{stats.xp} XP · {stats.next_level_xp - stats.xp} to level {stats.level + 1}</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-800 p-2"><div className="text-lg font-bold">{stats.completed_total}</div>tasks done</div>
              <div className="rounded-lg bg-slate-800 p-2"><div className="text-lg font-bold">{stats.approved_total}</div>approved</div>
              <div className="rounded-lg bg-slate-800 p-2"><div className="text-lg font-bold flex items-center justify-center gap-1"><Emoji e="🔥" /> {stats.streak}</div>day streak</div>
            </div>
            <p className="text-[11px] text-slate-500">+10 XP per finished daily task, +40 per approved weekly task, +15 per daily quest, +25 per badge.</p>
            <button type="button" onClick={() => setShelf(true)} className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-sm font-bold"><Emoji e="🏆" /> Open trophy shelf</button>
          </div>
        )}
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Fun settings</div>
        <div className="py-1.5">
          <div className="text-sm text-slate-200 mb-1">Progress style</div>
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Progress style">
            {[['chase', 'Cat & mouse'], ['rocket', 'Rocket'], ['balloon', 'Balloon'], ['classic', 'Classic bar']].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={settings.progress === v} onClick={() => setSettings({ progress: v })} className={`rounded-lg border-2 border-slate-900 py-1 text-[11px] font-bold ${settings.progress === v ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>{l}</button>
            ))}
          </div>
        </div>
        <Toggle label="3D characters" hint="Buddies and the chase are drawn in 3D (turn off on slow devices)" on={settings.view3d} onChange={(v) => setSettings({ view3d: v })} />
        <Link to="/Cast" className="block text-center rounded-lg border-2 border-slate-900 bg-slate-800 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700">Meet the cast and pick your buddy</Link>
        <Toggle label="Page scenes" hint="A themed 3D banner with a different buddy on each page" on={settings.heroes} onChange={(v) => setSettings({ heroes: v })} />
        <Toggle label="Click sparkles" hint="Stars pop when you press buttons" on={settings.sparkles} onChange={(v) => setSettings({ sparkles: v })} />
        <Toggle label="Screensaver" hint="After 5 idle minutes the cast bounces around" on={settings.saver} onChange={(v) => setSettings({ saver: v })} />
        <Toggle label="Daily rhythm" hint="Morning wake-up, Friday party, end-of-day pack-up" on={settings.rhythm} onChange={(v) => setSettings({ rhythm: v })} />
        <Toggle label="Seasonal weather" hint="Leaves, snow, petals, sparkles" on={settings.season} onChange={(v) => setSettings({ season: v })} />
        <Toggle label="Wandering critters" hint="Now and then the cat chases the mouse across the screen" on={settings.critters} onChange={(v) => setSettings({ critters: v })} />
        <Toggle label="Cartoon look" on={settings.cartoon} onChange={(v) => setSettings({ cartoon: v })} />
        <Toggle label="Celebrations" hint="Confetti, comic bursts, stamps" on={settings.anim === 'full'} onChange={(v) => setSettings({ anim: v ? 'full' : 'calm' })} />
        <Toggle label="Sound effects" on={settings.sound} onChange={(v) => setSettings({ sound: v })} />
        <Toggle label="Tasky the mascot" on={settings.mascot} onChange={(v) => setSettings({ mascot: v })} />
        <div className="grid grid-cols-2 gap-1 pt-2">
          <button type="button" onClick={() => emitFun({ type: 'parade' })} className="rounded-lg border-2 border-slate-900 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-bold text-slate-200">Team parade</button>
          <button type="button" onClick={() => emitFun({ type: 'rhythm', which: 'pack' })} className="rounded-lg border-2 border-slate-900 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-bold text-slate-200">End my day</button>
          <button type="button" onClick={() => setArcade(true)} className="rounded-lg border-2 border-slate-900 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-bold text-slate-200 col-span-2">Play Cheese Dash</button>
        </div>
        {arcade && <div className="pt-2"><ArcadeGame onClose={() => setArcade(false)} /></div>}
      </PopoverContent>
    </Popover>
    </>
  );
}
