import React, { Suspense, lazy, useState } from 'react';
import { SPECIES, SPECIES_IDS } from '@/fun/three/species';
import { useFun } from '@/fun/FunProvider';
import { useBuddy } from '@/fun/BuddyContext';
import EggDialog from '@/fun/EggDialog';
import ArcadeGame from '@/fun/ArcadeGame';
import { Emoji } from '@/icons/Emoji';

const Buddy3D = lazy(() => import('@/fun/three/Buddy3D'));
const POSES = ['idle', 'run', 'cheer', 'wave', 'study', 'stretch', 'eat', 'yawn', 'dance', 'scared', 'dizzy', 'sleep'];
const SLOT_NAMES = { hat: 'Hats', neck: 'Neckwear', face: 'Glasses' };

/** "Meet the cast": every 3D buddy, with poses to try, a wardrobe of accessories, and the mystery egg. */
export default function Cast() {
  const { settings } = useFun();
  const { pinned, pin, equipped, equip, ownedBuddies, ownedAccessories, accessories, eggs } = useBuddy();
  const [pose, setPose] = useState('idle');
  const [egg, setEgg] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => { setError(''); try { await fn(); } catch (e) { setError(e.message); } };
  const preview = pinned === 'auto' ? 'cat' : pinned;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Meet the cast</h1>
          <p className="text-slate-300 text-sm">Each page has its own buddy. Hatch eggs to unlock more buddies and accessories, then pin a favourite for every page.</p>
        </div>
        <button type="button" onClick={() => setEgg(true)} className="rounded-xl border-2 border-slate-900 bg-yellow-300 text-ink font-extrabold px-4 py-2 shadow-[3px_3px_0_rgba(0,0,0,.5)] flex items-center gap-2">
          <Emoji e="🥚" size="1.4rem" /> {eggs.available > 0 ? `Hatch an egg (${eggs.available})` : 'Mystery egg'}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <div className="glass-effect-enhanced rounded-2xl p-4 grid md:grid-cols-[auto_1fr] gap-4 items-center">
        <Suspense fallback={<div style={{ width: 170, height: 210 }} />}>
          <Buddy3D species={preview} pose="wave" size={170} equipped={equipped} calm={settings.anim === 'calm'} />
        </Suspense>
        <div className="space-y-2">
          <h2 className="font-extrabold text-white">Wardrobe</h2>
          {['hat', 'neck', 'face'].map((slot) => (
            <div key={slot} className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 w-20">{SLOT_NAMES[slot]}</span>
              <button type="button" onClick={() => run(() => equip(slot, null))} aria-pressed={!equipped[slot]} className={`rounded-lg border-2 border-slate-900 px-2.5 py-1 text-xs font-bold ${!equipped[slot] ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>None</button>
              {accessories.filter((a) => a.slot === slot).map((a) => {
                const owned = ownedAccessories.includes(a.id);
                return (
                  <button key={a.id} type="button" disabled={!owned} onClick={() => run(() => equip(slot, a.id))} aria-pressed={equipped[slot] === a.id} title={owned ? a.name : 'Hatch eggs to find this'} className={`rounded-lg border-2 border-slate-900 px-2.5 py-1 text-xs font-bold ${equipped[slot] === a.id ? 'bg-emerald-400 text-ink' : owned ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-slate-600 border-dashed'}`}>
                    {owned ? a.name : '???'}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pose">
        {POSES.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={pose === p} onClick={() => setPose(p)} className={`rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold capitalize ${pose === p ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'}`}>{p}</button>
        ))}
        <button type="button" onClick={() => run(() => pin('auto'))} className={`ml-auto rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold ${pinned === 'auto' ? 'bg-yellow-300 text-ink' : 'bg-slate-800 text-slate-200'}`}>Auto by page</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SPECIES_IDS.map((id) => {
          const owned = ownedBuddies.includes(id);
          return (
            <div key={id} className={`glass-effect-enhanced rounded-2xl p-3 flex flex-col items-center ${owned ? '' : 'opacity-70'}`}>
              <Suspense fallback={<div style={{ height: 160 }} />}>
                <div className={owned ? '' : 'brightness-0 contrast-50'}><Buddy3D species={id} pose={pose} size={150} equipped={owned ? equipped : undefined} calm={settings.anim === 'calm'} /></div>
              </Suspense>
              <div className="font-extrabold text-white">{owned ? SPECIES[id].name : '???'}</div>
              <button type="button" disabled={!owned} onClick={() => run(() => pin(id))} aria-pressed={pinned === id} className={`mt-1 rounded-lg border-2 border-slate-900 px-3 py-1 text-xs font-bold ${pinned === id ? 'bg-emerald-400 text-ink' : 'bg-slate-800 text-slate-200'} disabled:opacity-60`}>{pinned === id ? 'Your buddy' : owned ? 'Pick me' : 'Hatch to unlock'}</button>
            </div>
          );
        })}
      </div>
      <div className="glass-effect-enhanced rounded-2xl p-4 max-w-[460px]"><ArcadeGame /></div>
      <EggDialog open={egg} onOpenChange={setEgg} />
    </div>
  );
}
