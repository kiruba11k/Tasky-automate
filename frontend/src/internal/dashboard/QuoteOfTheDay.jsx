import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Quote, FaceSlightlySmiling, RefreshCw } from 'lucide-react';
import { Se as useStore, be as firstName, oe as cx } from '@/internal/min';
import { quoteOfTheDay } from '../ui/quotes';

export const JOKES = [
  'Why did the SDR bring a ladder? To reach the decision maker. 🪜',
  'My CRM and I have a lot in common: we both need a refresh every morning. ☕',
  'I told my prospect a joke about follow-ups. They didn’t reply. So I told it again. And again. 📬',
  'What do you call a templated message that works? A personalised one, apparently. 🎭',
  'LinkedIn: where "Open to work" meets "Not open to your 5th follow-up". 😅',
  'I’m not procrastinating, I’m doing "prospect research". Very deep research. 🕵️',
  'Meetings booked today: 0. Meetings about meetings: 3. 📅',
];

/** Greeting header plus the quote / joke of the day card (the quote / joke choice is saved in the profile). */
export function QuoteOfTheDay({ extra }) {
  const me = useStore((s) => s.me);
  useStore((s) => s.profiles);
  const dayIndex = Math.floor(Date.now() / 864e5);
  const setProfile = useStore((s) => s.setProfile);
  const mode = useStore((s) => s.profiles[s.me]?.qotd) || 'quote'; // saved in the profile, so it follows the person to any device
  const [offset, setOffset] = useState(0);

  const toggleMode = () => setProfile(me, { qotd: mode === 'quote' ? 'joke' : 'quote' });

  const quote = quoteOfTheDay(offset);
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
      <div
        className="relative overflow-hidden rounded-2xl p-[1.5px] shadow-soft md:ml-auto md:max-w-xl"
        data-testid="qotd"
        style={{
          background:
            mode === 'quote'
              ? 'linear-gradient(120deg, #1D3FA0, #7C3AED, #DB2777)'
              : 'linear-gradient(120deg, #F59E0B, #F97316)',
        }}
      >
        <div className="relative flex items-center gap-3 rounded-[15px] bg-surface px-4 py-3">
          <span
            aria-hidden
            className="pointer-events-none absolute -left-1 -top-5 select-none font-serif text-[84px] leading-none text-accent/10"
          >
            “
          </span>
          <span
            className={cx(
              'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-soft',
              mode === 'quote'
                ? 'bg-gradient-to-br from-accent to-[#7C3AED]'
                : 'bg-gradient-to-br from-[#F59E0B] to-[#F97316]',
            )}
          >
            {mode === 'quote' ? <Quote size={16} /> : <FaceSlightlySmiling size={16} />}
          </span>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}${offset}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="relative min-w-0 flex-1"
            >
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                {mode === 'quote' ? 'Quote of the day' : 'Joke of the day'}
              </span>
              {mode === 'quote' ? (
                <>
                  <p className="mt-0.5 text-[15px] font-semibold italic leading-snug text-ink">“{quote.text}”</p>
                  <p className="mt-0.5 text-xs font-semibold text-accent-ink">{quote.by}</p>
                </>
              ) : (
                <p className="mt-0.5 text-sm font-medium">{joke}</p>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="relative flex shrink-0 flex-col items-center gap-1">
            <button
              className="focus-ring rounded-lg px-2 py-0.5 text-[11px] font-semibold text-accent-ink hover:bg-surface-2"
              onClick={toggleMode}
            >
              {mode === 'quote' ? 'Joke instead' : 'Quote instead'}
            </button>
            <motion.button
              whileTap={{ rotate: 180 }}
              aria-label="Another one"
              className="focus-ring flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface-2"
              onClick={() => setOffset((n) => n + 1)}
            >
              <RefreshCw size={12} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuoteOfTheDay;
