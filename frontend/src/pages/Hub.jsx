import React, { Suspense, lazy, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emitFun } from '@/fun/bus';
import { Emoji } from '@/icons/Emoji';
import { Panel, subtle, primary, field } from '@/hub/ui';
import BossBattle from '@/hub/BossBattle';
import Celebrations from '@/hub/Celebrations';
import MoodWeather from '@/hub/MoodWeather';
import ShoutWall from '@/hub/ShoutWall';
import Coffee from '@/hub/Coffee';
import PetCard from '@/hub/PetCard';
import Wellness from '@/hub/Wellness';
import Standup from '@/hub/Standup';
import Retro from '@/hub/Retro';
import Ideas from '@/hub/Ideas';
import Trivia from '@/hub/Trivia';
import GuessGame from '@/hub/GuessGame';
import WordGame from '@/hub/WordGame';
import Wheel from '@/hub/Wheel';
import Bingo from '@/hub/Bingo';
import Flappy from '@/hub/Flappy';
import Wrapped from '@/hub/Wrapped';
import { MemoryGame } from '@/fun/Arcade';

const ArcadeGame = lazy(() => import('@/fun/ArcadeGame'));

function Launch() {
  const [name, setName] = useState('');
  return (
    <Panel title="Launch moment" hint="Shipped something? Count down together and watch the rocket go.">
      <div className="flex gap-2">
        <input className={field} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="What are we launching?" aria-label="Launch name" />
        <button type="button" className={primary} onClick={() => emitFun({ type: 'launch', name: name.trim() || 'Launch' })}><Emoji e="🚀" /> Launch</button>
      </div>
    </Panel>
  );
}

function Games() {
  return (
    <Tabs defaultValue="word">
      <TabsList className="bg-slate-800 flex-wrap h-auto">
        {[['word', 'Word of the day'], ['trivia', 'Trivia'], ['guess', 'Guess who'], ['bingo', 'Work bingo'], ['wheel', 'Daily wheel'], ['flappy', 'Flappy bird'], ['dash', 'Cheese dash'], ['memory', 'Memory']].map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="word" className="mt-3"><WordGame /></TabsContent>
      <TabsContent value="trivia" className="mt-3"><Trivia /></TabsContent>
      <TabsContent value="guess" className="mt-3"><GuessGame /></TabsContent>
      <TabsContent value="bingo" className="mt-3"><Bingo /></TabsContent>
      <TabsContent value="wheel" className="mt-3"><Wheel /></TabsContent>
      <TabsContent value="flappy" className="mt-3"><Flappy /></TabsContent>
      <TabsContent value="dash" className="mt-3"><Suspense fallback={null}><ArcadeGame /></Suspense></TabsContent>
      <TabsContent value="memory" className="mt-3"><MemoryGame /></TabsContent>
    </Tabs>
  );
}

const TABS = [
  ['team', 'Team', () => <div className="grid gap-4 lg:grid-cols-2"><BossBattle /><MoodWeather /><Celebrations /><Coffee /><Launch /></div>],
  ['wall', 'Shout-outs & ideas', () => <div className="grid gap-4 lg:grid-cols-2"><ShoutWall /><Ideas /></div>],
  ['rituals', 'Standup & retro', () => <div className="grid gap-4"><Standup /><Retro /></div>],
  ['wellness', 'Wellness & focus', () => <Wellness />],
  ['games', 'Games', Games],
  ['pet', 'My pet', () => <div className="max-w-xl"><PetCard /></div>],
];

/** Team spirit hub: everything social and playful, in one place. */
export default function Hub() {
  const [wrapped, setWrapped] = useState(false);
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Team hub</h1>
        <button type="button" className={subtle} onClick={() => setWrapped(true)}><Emoji e="🎁" /> My week, wrapped</button>
      </div>
      <Tabs defaultValue="team">
        <TabsList className="bg-slate-800 flex-wrap h-auto">{TABS.map(([v, l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}</TabsList>
        {TABS.map(([v, , C]) => <TabsContent key={v} value={v} className="mt-4"><C /></TabsContent>)}
      </Tabs>
      <Wrapped open={wrapped} onOpenChange={setWrapped} />
    </div>
  );
}
