import { isTrackedPerson } from '@/internal/lib/constants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Se as useStore, Qe as PEOPLE, xn as isManagerRole, $e as dayKey, be as firstName } from '@/internal/min';
import { useTheme } from '@/internal/ui/theme';
import { QUOTES, QUOTE_KIND_LABELS } from '@/internal/ui/quotes';
import { SARCASTIC_QUIPS, MOTIVATION_LINES } from '@/internal/ui/mascotLines';

/** Knight mascot that gives sarcastic quips and real motivation (original: `SU`). */
export function Mascot() {
  const { mascot: enabled } = useTheme();
  const me = useStore((s) => s.me);
  const tasks = useStore((s) => s.tasks);
  const daily = useStore((s) => s.daily);
  const [line, setLine] = useState(null);
  const [tick, setTick] = useState(0);
  const counters = useRef({ said: 0, quip: 0, boost: 0 });
  const isManager = isManagerRole(PEOPLE.find((p) => p.id === me)?.role);
  const openTasks = tasks.filter(
    (t) => t.assigneeId === me && (t.status === 'todo' || t.status === 'in_progress' || t.status === 'changes'),
  ).length;
  const today = dayKey(0);
  const myDay = daily[`${me}|${today}`];
  const missingTargets = isManager
    ? PEOPLE.filter((p) => isTrackedPerson(p) && !daily[`${p.id}|${today}`]?.sodAt).length
    : 0;
  const now = new Date();
  const hour = now.getHours();
  const weekday = now.getDay();
  const name = firstName(me);

  const { quips, boosts } = useMemo(() => {
    const quipList = [];
    const isWeekday = weekday >= 1 && weekday <= 5;
    const boostList = [];
    if (openTasks > 0)
      quipList.push(
        `${openTasks} open task${openTasks === 1 ? '' : 's'}, ${name}. They won't finish themselves. I checked. Twice. 🕵️`,
      );
    if (openTasks >= 5)
      quipList.push(`${openTasks} open tasks and you're reading a cartoon knight. Priorities, ${name}. 👀`);
    if (openTasks === 0)
      quipList.push("Zero open tasks? Either you're a legend or someone forgot to assign you work. 🤔");
    if (isWeekday && isManager && missingTargets > 0)
      quipList.push(
        `${missingTargets} ${missingTargets === 1 ? "person hasn't" : "people haven't"} set today's targets. I'd chase them myself, but no legs. Just vibes. 🤷`,
      );
    if (isWeekday && !isManager && !myDay?.sodAt)
      quipList.push("No targets set for today. Bold strategy. Let's see how it plays out. 🍿");
    if (isWeekday && !isManager && myDay?.sodAt && !myDay.eodAt)
      quipList.push('Targets locked. Now for the tiny detail called "doing them". 🔒');
    if (isWeekday && !isManager && hour >= 17 && !myDay?.eodAt)
      quipList.push(`It's ${hour - 12}pm and no end of day update. It won't write itself. I tried. No thumbs. 🛡️`);
    if (hour === 12) quipList.push('Lunch is in under an hour. Look busy until then. Or, wild idea, be busy. 🍽️');
    if (hour === 13) quipList.push("Lunch is 1pm to 2pm. It's a time block, not a lifestyle. 🥪");
    if (weekday === 1) quipList.push('Monday. The inbox has been breeding all weekend. Good luck. 📬');
    if (weekday === 5) quipList.push(`It's Friday. "Weekend plans" is still not a task type. Nice try. 🎉`);
    if (openTasks === 0) boostList.push('All caught up. Take a moment to be proud of that. 🌟');
    else if (openTasks <= 3)
      boostList.push(`Only ${openTasks} left. Pick the hardest one first and the rest will feel easy. 💡`);
    if (!isManager && myDay?.eodAt) boostList.push('End of day sent. Well done, now switch off and recharge. 🌙');
    if (!isManager && !myDay?.sodAt) boostList.push('Set three clear targets for today. Clarity is half the work. 🧭');
    if (isManager)
      boostList.push('A quick word of thanks to someone on the team today goes further than you think. 💬');
    if (weekday === 1) boostList.push('Fresh week, fresh start. Set your targets and own it. 🌅');
    if (weekday === 5) boostList.push('Finish the week strong. Monday you will be grateful. 🏁');
    return { quips: [...quipList, ...SARCASTIC_QUIPS], boosts: [...boostList, ...MOTIVATION_LINES] };
  }, [openTasks, myDay, hour, weekday, name, isManager, missingTargets]);

  const nextLine = () => {
    const c = counters.current;
    const slot = c.said % 4;
    c.said += 1;
    if (slot === 3)
      return c.quip++ % 2 === 0
        ? { kind: 'sarcastic', text: quips[Math.floor(c.quip / 2) % quips.length] }
        : { kind: 'motivation', text: boosts[c.boost++ % boosts.length] };
    const q = QUOTES[(Math.floor(Math.random() * QUOTES.length) + c.said * 7) % QUOTES.length];
    return { kind: q.kind, text: q.text, by: q.by };
  };
  const speak = () => {
    setTick((n) => n + 1);
    setLine(nextLine());
  };
  const speakRef = useRef(speak);
  speakRef.current = speak;

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => speakRef.current(), 12e4);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!line) return;
    const timer = setTimeout(() => setLine(null), 8e3);
    return () => clearTimeout(timer);
  }, [line, tick]);

  if (!enabled) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-[84px] z-30 flex items-end gap-2 sm:left-[92px]">
      <button
        aria-label="Mascot: click for a quote, a life lesson or some motivation"
        data-testid="mascot"
        onClick={speak}
        className="focus-ring ls-bob pointer-events-auto shrink-0 rounded-full"
      >
        <img
          src="/mascot.webp"
          alt="Lead Strategus knight mascot"
          className="h-16 w-16 object-contain drop-shadow-lg sm:h-24 sm:w-24"
        />
      </button>
      {line && (
        <div
          key={tick}
          role="status"
          data-testid="mascot-line"
          data-kind={line.kind}
          className="ls-pop pointer-events-auto relative mb-10 max-w-[min(20rem,calc(100vw-12rem))] rounded-2xl border-2 border-ink bg-surface px-4 py-3 text-sm font-semibold shadow-lift sm:mb-14"
        >
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-muted">
            {line.by ? QUOTE_KIND_LABELS[line.kind] : line.kind === 'motivation' ? 'Real talk' : 'Sarcasm mode'}
          </span>
          {line.by ? (
            <>
              <span className="italic">“{line.text}”</span>
              <span className="mt-1 block text-xs font-bold text-accent-ink">{line.by}</span>
            </>
          ) : (
            line.text
          )}
          <button
            aria-label="Dismiss"
            className="absolute -right-2 -top-2 rounded-full border border-line bg-surface p-0.5"
            onClick={() => setLine(null)}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Mascot;
