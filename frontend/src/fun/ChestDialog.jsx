import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { request } from '@/api/client';
import { effects } from './effects';
import { play } from './sounds';
import { useFun } from './FunProvider';

const RARITY = { common: ['Common', 'text-slate-300', 'shadow-[0_0_0_4px_rgba(148,163,184,.4)]'], rare: ['Rare!', 'text-sky-300', 'shadow-[0_0_28px_6px_rgba(56,189,248,.7)]'], epic: ['EPIC!!', 'text-yellow-300', 'shadow-[0_0_36px_10px_rgba(250,204,21,.85)]'] };

/** Daily treasure chest: unlocked by finishing a task, holds a collectible sticker. */
export default function ChestDialog({ open, onOpenChange, onOpened, today }) {
  const { settings } = useFun();
  const [phase, setPhase] = useState('closed'); // closed | opening | open
  const [prize, setPrize] = useState(null);
  const [error, setError] = useState('');

  const reset = (o) => { if (!o) { setPhase('closed'); setPrize(null); setError(''); } onOpenChange(o); };

  const openChest = async () => {
    setPhase('opening');
    setError('');
    play('boing', settings.sound);
    try {
      const [res] = await Promise.all([request('POST', '/api/me/daily-drop', { today }), new Promise((r) => setTimeout(r, 1100))]);
      setPrize(res);
      setPhase('open');
      if (settings.anim === 'full') { if (res.sticker.rarity === 'epic') effects.fireworks(); else effects.big(); }
      play(res.sticker.rarity === 'common' ? 'ding' : 'fanfare', settings.sound);
      onOpened?.();
    } catch (e) {
      setError(e.message);
      setPhase('closed');
    }
  };

  const r = prize && RARITY[prize.sticker.rarity];
  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white text-center">
        <DialogTitle className="text-xl font-extrabold">Treasure chest</DialogTitle>
        <DialogDescription className="text-slate-400">Earned by finishing tasks today. Collect all the stickers!</DialogDescription>
        <div className="h-40 grid place-items-center">
          {phase !== 'open' && <div className={`text-8xl ${phase === 'opening' ? 'chest-shake' : 'tasky-bob'}`} aria-hidden="true">{phase === 'opening' ? '🎁' : '🎁'}</div>}
          {phase === 'open' && (
            <div className="flex flex-col items-center gap-1">
              <div className={`sticker-pop grid place-items-center w-24 h-24 rounded-3xl bg-slate-800 text-6xl ${r[2]}`} aria-label={`Sticker ${prize.sticker.emoji}`}>{prize.sticker.emoji}</div>
              <div className={`font-extrabold ${r[1]}`}>{r[0]}</div>
            </div>
          )}
        </div>
        {phase === 'open' && <p className="text-sm text-slate-300">{prize.is_new ? 'New sticker added to your album!' : 'Already in your album — bonus XP instead.'} <span className="text-emerald-300 font-bold">+{prize.xp} XP</span></p>}
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {phase === 'closed' && <Button onClick={openChest} className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-extrabold">Open it!</Button>}
        {phase === 'opening' && <Button disabled className="bg-yellow-400 text-slate-900 font-extrabold">Opening…</Button>}
        {phase === 'open' && <Button onClick={() => reset(false)} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold">Nice!</Button>}
      </DialogContent>
    </Dialog>
  );
}
