import StickerBook from './StickerBook';
import { Suspense, lazy } from 'react';
import { useFun } from './FunProvider';
import { useBuddy } from './BuddyContext';
import { hasWebGL } from './three/species';

const TrophyStage = lazy(() => import('./three/TrophyStage'));
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { request } from '@/api/client';
import { format } from 'date-fns';
import { Emoji, Rich } from '@/icons/Emoji';

/** Badges (with progress toward the locked ones) and the sticker album. */
export default function TrophyShelf({ open, onOpenChange }) {
  const [data, setData] = useState(null);
  const { settings } = useFun();
  const { pinned, equipped } = useBuddy();
  const three = settings.view3d && hasWebGL();
  useEffect(() => {
    if (open) request('GET', `/api/me/trophies?today=${format(new Date(), 'yyyy-MM-dd')}`).then(setData).catch(() => setData(null));
  }, [open]);
  const earned = data ? data.badges.filter((b) => b.earned).length : 0;
  const owned = data ? data.stickers.filter((s) => s.owned).length : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-2xl font-extrabold">Trophy shelf</DialogTitle>
        <DialogDescription className="text-slate-400">Everything here comes from real finished work.</DialogDescription>
        {!data ? <p className="text-slate-400 py-8 text-center">Polishing the trophies…</p> : (
          <>
          {three && (
            <div className="relative h-[150px] rounded-xl overflow-hidden border-2 border-slate-900 bg-gradient-to-b from-indigo-950 to-slate-900">
              <Suspense fallback={null}><TrophyStage earned={earned} total={data.badges.length} species={pinned === 'auto' ? 'cat' : pinned} equipped={equipped} calm={settings.anim === 'calm'} /></Suspense>
            </div>
          )}
          <Tabs defaultValue="badges">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="badges">Badges {earned}/{data.badges.length}</TabsTrigger>
              <TabsTrigger value="stickers">Sticker book {owned}/{data.stickers.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="badges" className="mt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                {data.badges.map((b) => (
                  <div key={b.id} className={`rounded-2xl border-2 border-slate-900 p-3 text-center shadow-[3px_3px_0_rgba(0,0,0,.45)] ${b.earned ? 'bg-gradient-to-b from-yellow-400/20 to-slate-800' : 'bg-slate-800/60'}`}>
                    <div className={b.earned ? 'badge-pop' : 'grayscale opacity-40'}><Emoji e={b.emoji} size="2.8rem" /></div>
                    <div className="font-bold mt-1">{b.name}</div>
                    <div className="text-xs text-slate-400">{b.desc}</div>
                    {b.earned
                      ? <div className="text-[11px] text-emerald-300 mt-1">Earned{b.earned_on ? ` ${b.earned_on}` : ''}</div>
                      : <div className="mt-2"><div className="h-1.5 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${Math.round((b.progress / b.target) * 100)}%` }} /></div><div className="text-[11px] text-slate-500 mt-0.5">{b.progress}/{b.target}</div></div>}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="stickers" className="mt-3">
              <StickerBook stickers={data.stickers} />
            </TabsContent>
          </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
