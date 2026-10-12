import { useState } from 'react';
import { Quote, FaceSlightlySmiling, RefreshCw } from 'lucide-react';
import { Se as useStore, be as firstName, oe as cx } from '@/internal/min';

export const QUOTES = [
  ['The secret of getting ahead is getting started.', 'Mark Twain'],
  ['Done is better than perfect.', 'Sheryl Sandberg'],
  ['Quality is not an act, it is a habit.', 'Aristotle'],
  ['Small daily improvements are the key to staggering long-term results.', 'Unknown'],
  ['Every no gets you closer to a yes.', 'Sales proverb'],
  ['Focus on being productive instead of busy.', 'Tim Ferriss'],
  ['Opportunities don’t happen. You create them.', 'Chris Grosser'],
];

export const JOKES = [
  'Why did the SDR bring a ladder? To reach the decision maker. 🪜',
  'My CRM and I have a lot in common: we both need a refresh every morning. ☕',
  'I told my prospect a joke about follow-ups. They didn’t reply. So I told it again. And again. 📬',
  'What do you call a templated message that works? A personalised one, apparently. 🎭',
  'LinkedIn: where "Open to work" meets "Not open to your 5th follow-up". 😅',
  'I’m not procrastinating, I’m doing "prospect research". Very deep research. 🕵️',
  'Meetings booked today: 0. Meetings about meetings: 3. 📅',
];

const STORAGE_KEY = 'ls-qotd';

/** Greeting header plus the quote / joke of the day card (toggle persisted in localStorage "ls-qotd"). */
export function QuoteOfTheDay({ extra }) {
  const me = useStore((s) => s.me);
  useStore((s) => s.profiles);
  const dayIndex = Math.floor(Date.now() / 864e5);
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'quote';
    } catch {
      return 'quote';
    }
  });
  const [offset, setOffset] = useState(0);

  const toggleMode = () => {
    const next = mode === 'quote' ? 'joke' : 'quote';
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  const quote = QUOTES[(dayIndex + offset) % QUOTES.length];
  const joke = JOKES[(dayIndex + offset) % JOKES.length];

  return (
    <div className="grid items-center gap-3 md:grid-cols-[auto_1fr]">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Hi {firstName(me)} 👋</h1>
          <p className="text-xs text-muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {extra}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-soft md:ml-auto md:max-w-xl">
        <span
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            mode === 'quote' ? 'bg-accent-soft text-accent-ink' : 'bg-butter text-butter-ink',
          )}
        >
          {mode === 'quote' ? <Quote size={15} /> : <FaceSlightlySmiling size={15} />}
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted">
            {mode === 'quote' ? 'Quote of the day' : 'Joke of the day'}
          </span>
          {mode === 'quote' ? (
            <>
              “{quote[0]}” <span className="text-muted">- {quote[1]}</span>
            </>
          ) : (
            joke
          )}
        </p>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            className="focus-ring rounded-lg px-2 py-0.5 text-[11px] font-semibold text-accent-ink hover:bg-surface-2"
            onClick={toggleMode}
          >
            {mode === 'quote' ? 'Joke instead' : 'Quote instead'}
          </button>
          <button
            aria-label="Another one"
            className="focus-ring flex items-center justify-center rounded-lg py-0.5 text-muted hover:bg-surface-2"
            onClick={() => setOffset((n) => n + 1)}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuoteOfTheDay;
