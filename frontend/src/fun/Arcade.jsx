import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ArcadeGame from './ArcadeGame';
import { effects } from './effects';
import { Emoji } from '@/icons/Emoji';

const FACES = ['🐱', '🐶', '🦊', '🐼', '🦉', '🐸', '🦄', '🐉'];
const BEST = 'tasky_memory_best';
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/** Memory Match: flip two cards to find the buddy pairs. Fewer moves is better. */
export function MemoryGame() {
  const deal = useCallback(() => shuffle([...FACES, ...FACES].map((f, i) => ({ id: i, f }))), []);
  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } });
  const lock = useRef(false);
  const won = matched.length === cards.length;

  useEffect(() => {
    if (!won) return;
    effects.stars();
    setBest((b) => { const nb = b ? Math.min(b, moves) : moves; try { localStorage.setItem(BEST, String(nb)); } catch { /* ignore */ } return nb; });
  }, [won]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = (c) => {
    if (lock.current || open.includes(c.id) || matched.includes(c.id)) return;
    const next = [...open, c.id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      lock.current = true;
      const [a, b] = next.map((id) => cards.find((x) => x.id === id));
      setTimeout(() => { if (a.f === b.f) setMatched((m) => [...m, a.id, b.id]); setOpen([]); lock.current = false; }, a.f === b.f ? 450 : 850);
    }
  };
  const again = () => { setCards(deal()); setOpen([]); setMatched([]); setMoves(0); lock.current = false; };

  return (
    <div className="text-center">
      <div className="flex justify-between text-xs font-bold text-slate-200 px-1 mb-2"><span>Memory Match</span><span>Moves {moves}{best ? ` · Best ${best}` : ''}</span></div>
      <div className="memory-grid">
        {cards.map((c) => {
          const up = open.includes(c.id) || matched.includes(c.id);
          return (
            <button key={c.id} type="button" onClick={() => flip(c)} aria-label={up ? c.f : 'Hidden card'} aria-pressed={up} className={`memory-card ${up ? 'up' : ''} ${matched.includes(c.id) ? 'done' : ''}`}>
              <span className="memory-face front"><Emoji e="🎲" size="1.6rem" /></span>
              <span className="memory-face back"><Emoji e={c.f} size="2.2rem" /></span>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-slate-300 mt-2 min-h-[1.5rem]">{won ? <>You found them all in {moves} moves! <button type="button" onClick={again} className="underline font-bold">Play again</button></> : 'Find the matching buddies.'}</div>
    </div>
  );
}

/** The arcade: a couple of tiny games for a quick break. */
export function ArcadeDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-xl font-extrabold">Arcade</DialogTitle>
        <DialogDescription className="text-slate-400">Two tiny games for a quick break.</DialogDescription>
        <Tabs defaultValue="dash">
          <TabsList className="bg-slate-800"><TabsTrigger value="dash">Cheese Dash</TabsTrigger><TabsTrigger value="memory">Memory Match</TabsTrigger></TabsList>
          <TabsContent value="dash" className="mt-3">{open && <ArcadeGame />}</TabsContent>
          <TabsContent value="memory" className="mt-3"><MemoryGame /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
