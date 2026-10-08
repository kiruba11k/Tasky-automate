import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Emoji } from '@/icons/Emoji';

const PER_PAGE = 6;
const RARITY = { common: 'border-slate-400/60', rare: 'border-sky-400', epic: 'border-yellow-400' };
const rot = (id) => ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 13) - 6;
const KEY = 'tasky_seen_stickers';

/** The sticker album as a book: page-turn animation, stickers slap onto the page, new finds are highlighted. */
export default function StickerBook({ stickers }) {
  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < stickers.length; i += PER_PAGE) out.push(stickers.slice(i, i + PER_PAGE));
    return out;
  }, [stickers]);
  const spreads = Math.ceil(pages.length / 2);
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState(1);
  const [seen, setSeen] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } });
  const owned = stickers.filter((s) => s.owned);
  const fresh = new Set(owned.filter((s) => !seen.has(s.id)).map((s) => s.id));

  useEffect(() => {
    const t = setTimeout(() => {
      const all = new Set(owned.map((s) => s.id));
      setSeen(all);
      try { localStorage.setItem(KEY, JSON.stringify([...all])); } catch { /* ignore */ }
    }, 3500);
    return () => clearTimeout(t);
  }, [stickers]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (d) => { setDir(d); setSpread((s) => Math.max(0, Math.min(spreads - 1, s + d))); };
  const left = pages[spread * 2] || [];
  const right = pages[spread * 2 + 1] || [];

  const Page = ({ list, no, side }) => (
    <div className={`book-page ${side}`}>
      <div className="grid grid-cols-3 gap-2 flex-1 content-center">
        {list.map((s, i) => (
          <div key={s.id} title={s.owned ? `${s.rarity} sticker` : 'Not found yet'}
            className={`aspect-square grid place-items-center rounded-xl border-2 ${s.owned ? `bg-white/70 ${RARITY[s.rarity]} sticker-slap` : 'border-dashed border-amber-900/30 bg-amber-900/5'} ${fresh.has(s.id) ? 'sticker-new' : ''}`}
            style={s.owned ? { transform: `rotate(${rot(s.id)}deg)`, animationDelay: `${i * 90 + 250}ms` } : undefined}>
            {s.owned ? <Emoji e={s.emoji} size="2.4rem" /> : <span className="text-2xl text-amber-900/30 font-extrabold">?</span>}
            {fresh.has(s.id) && <span className="sticker-new-tag">NEW</span>}
          </div>
        ))}
      </div>
      <div className="text-center text-[11px] font-bold text-amber-900/60 mt-2">{no}</div>
    </div>
  );

  return (
    <div>
      <p className="text-xs text-slate-400 mb-2">Finish a task each day to unlock a chest with a random sticker. Rare and epic ones are harder to find. <b className="text-slate-200">{owned.length}/{stickers.length}</b> collected.</p>
      <div className="book">
        <div key={spread} className={`book-spread ${dir > 0 ? 'flip-next' : 'flip-prev'}`}>
          <Page list={left} no={spread * 2 + 1} side="l" />
          <div className="book-spine" />
          {right.length > 0 ? <Page list={right} no={spread * 2 + 2} side="r" /> : <div className="book-page r" />}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mt-3">
        <button type="button" onClick={() => go(-1)} disabled={spread === 0} aria-label="Previous page" className="p-1.5 rounded-full bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-xs text-slate-400">Pages {spread * 2 + 1}–{Math.min(pages.length, spread * 2 + 2)} of {pages.length}</span>
        <button type="button" onClick={() => go(1)} disabled={spread >= spreads - 1} aria-label="Next page" className="p-1.5 rounded-full bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
