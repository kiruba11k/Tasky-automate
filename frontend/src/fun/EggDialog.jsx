import React, { Suspense, lazy, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { request } from '@/api/client';
import { effects } from './effects';
import { play } from './sounds';
import { emitFun } from './bus';
import { format } from 'date-fns';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { SPECIES, buddyFor, hasWebGL } from './three/species';
import { Emoji } from '@/icons/Emoji';

const EggStage = lazy(() => import('./three/EggStage'));

/** Hatch a mystery egg: earned by finishing work. Hatches into a new buddy or an accessory. */
export default function EggDialog({ open, onOpenChange }) {
  const { settings } = useFun();
  const { eggs, equipped, pin, equip, refresh } = useBuddy();
  const [phase, setPhase] = useState('ready'); // ready | shake | burst | reveal
  const [prize, setPrize] = useState(null);
  const [error, setError] = useState('');
  const calm = settings.anim === 'calm';
  const three = settings.view3d && hasWebGL();

  const close = (o) => { if (!o) { setPhase('ready'); setPrize(null); setError(''); refresh(); } onOpenChange(o); };

  const hatch = async () => {
    setError('');
    setPhase('shake');
    play('boing', settings.sound);
    try {
      const [res] = await Promise.all([request('POST', '/api/me/hatch', { today: format(new Date(), 'yyyy-MM-dd') }), new Promise((r) => setTimeout(r, 1500))]);
      setPhase('burst');
      play('bonk', settings.sound);
      setTimeout(() => {
        setPrize(res);
        setPhase('reveal');
        if (settings.anim === 'full') effects.big();
        play('fanfare', settings.sound);
        emitFun({ type: 'hatched' });
      }, 750);
    } catch (e) {
      setError(e.message);
      setPhase('ready');
    }
  };

  const wear = async () => { try { if (prize.kind === 'accessory') await equip(prize.slot, prize.id); else await pin(prize.id); } catch (e) { setError(e.message); return; } close(false); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white text-center">
        <DialogTitle className="text-xl font-extrabold">Mystery egg</DialogTitle>
        <DialogDescription className="text-slate-400">
          {eggs.available > 0 ? `${eggs.available} egg${eggs.available > 1 ? 's' : ''} ready to hatch!` : `Finish ${Math.max(1, eggs.next_at - eggs.done)} more task${eggs.next_at - eggs.done === 1 ? '' : 's'} to earn the next egg.`}
        </DialogDescription>
        <div className="h-52 grid place-items-center">
          {three ? (
            <Suspense fallback={null}>
              <EggStage phase={phase} prize={prize} equipped={equipped} calm={calm} />
            </Suspense>
          ) : <div className={phase === 'shake' ? 'chest-shake' : 'tasky-bob'}><Emoji e="🥚" size="6rem" /></div>}
        </div>
        {phase === 'reveal' && prize && (
          <p className="text-sm text-slate-200">
            {prize.kind === 'buddy'
              ? <>Meet <b className="text-yellow-300">{SPECIES[prize.id]?.name}</b> the {prize.id}! {prize.is_new ? 'A new buddy for your collection.' : 'You had this one already.'}</>
              : <>You found <b className="text-yellow-300">{prize.name}</b> ({prize.slot}). {prize.is_new ? 'Wear it with pride!' : 'Already in your wardrobe.'}</>}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {phase === 'ready' && <Button onClick={hatch} disabled={eggs.available < 1} className="bg-yellow-400 hover:bg-yellow-300 text-ink font-extrabold">{eggs.available > 0 ? 'Hatch it!' : 'Not yet'}</Button>}
        {(phase === 'shake' || phase === 'burst') && <Button disabled className="bg-yellow-400 text-ink font-extrabold">Something is happening…</Button>}
        {phase === 'reveal' && (
          <div className="flex gap-2 justify-center">
            <Button onClick={wear} className="bg-emerald-500 hover:bg-emerald-400 text-ink font-bold">{prize.kind === 'accessory' ? 'Wear it now' : 'Make it my buddy'}</Button>
            <Button variant="outline" onClick={() => close(false)} className="bg-transparent border-slate-600 text-slate-200">Later</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
