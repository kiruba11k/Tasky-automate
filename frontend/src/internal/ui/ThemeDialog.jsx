import { useState } from 'react';
import { Check } from 'lucide-react';
import { Se as useStore, Ya as Modal } from '@/internal/min';
import { cx } from './cx';
import { Button } from './Button';
import { THEMES, useTheme } from './theme';

const NOW_EMOJIS = ['🏃', '🚀', '🐢', '🦖', '⏰', '☕', '🦄', '🐝'];
const ACCENT_SWATCHES = ['#7C3AED', '#DB2777', '#EA580C', '#059669', '#2563EB', '#DC2626'];
const BACKGROUNDS = [
  ['plain', 'Plain'],
  ['dots', 'Dots'],
  ['confetti', 'Confetti'],
  ['clouds', 'Clouds'],
  ['stars', 'Stars'],
];
const FONTS = [
  ['jakarta', 'Classic'],
  ['fredoka', 'Rounded'],
  ['comic', 'Handwritten'],
  ['bangers', 'Comic headlines'],
];
const CARD_STYLES = [
  ['classic', 'Classic'],
  ['cartoon', 'Cartoon outline'],
  ['bubbly', 'Bubbly'],
];
const BLOCK_STYLES = [
  ['solid', 'Solid'],
  ['striped', 'Striped'],
  ['candy', 'Candy gradient'],
];

const chipClass = (active) =>
  cx(
    'focus-ring rounded-xl border px-3 py-1.5 text-xs font-semibold',
    active ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-muted',
  );

function OptionRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-28 text-muted">{label}</span>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onPick }) {
  return options.map(([key, text]) => (
    <button key={key} className={chipClass(value === key)} onClick={() => onPick(key)}>
      {text}
    </button>
  ));
}

/** Theme picker dialog incl. the "Make your own" editor (original: `wU`). */
export function ThemeDialog({ open, onClose }) {
  const me = useStore((s) => s.me);
  const setProfile = useStore((s) => s.setProfile);
  const theme = useTheme();
  const [showCustom, setShowCustom] = useState(false);
  const custom = theme.custom;
  const updateCustom = (patch) => setProfile(me, { theme: 'custom', custom: { ...custom, ...patch } });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Theme"
      description="Professional and Dark stay exactly as they are. The rest are just for fun."
      size="lg"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.keys(THEMES).map((key) => {
          const preset = THEMES[key];
          const selected = theme.theme === key;
          return (
            <button
              key={key}
              onClick={() => {
                setProfile(me, { theme: key, dark: key === 'dark' });
                setShowCustom(key === 'custom');
              }}
              className={cx(
                'focus-ring relative rounded-2xl border-2 p-2 text-left transition hover:-translate-y-0.5',
                selected ? 'border-accent' : 'border-line',
              )}
            >
              <span className="flex h-14 overflow-hidden rounded-xl">
                {preset.swatch.map((color) => (
                  <span key={color} className="flex-1" style={{ background: color }} />
                ))}
              </span>
              <span className="mt-2 block text-sm font-bold">{preset.name}</span>
              <span className="block text-[11px] text-muted">{preset.blurb}</span>
              {selected && (
                <span className="absolute right-2 top-2 rounded-full bg-accent p-0.5 text-accent-on">
                  <Check size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {(showCustom || theme.theme === 'custom') && (
        <div className="mt-5 space-y-3 rounded-2xl border border-dashed border-line p-4 text-sm">
          <p className="font-bold">Make your own</p>
          <OptionRow label="Base">
            {['light', 'dark'].map((base) => (
              <button key={base} className={chipClass(custom.base === base)} onClick={() => updateCustom({ base })}>
                {base === 'light' ? '☀️ Light' : '🌙 Dark'}
              </button>
            ))}
          </OptionRow>
          <OptionRow label="Accent">
            <input
              aria-label="Accent colour"
              type="color"
              value={custom.accent}
              onChange={(e) => updateCustom({ accent: e.target.value })}
              className="h-8 w-14 cursor-pointer rounded-lg border border-line"
            />
            {ACCENT_SWATCHES.map((color) => (
              <button
                key={color}
                aria-label={`Accent ${color}`}
                className="focus-ring h-7 w-7 rounded-full border-2 border-surface shadow"
                style={{ background: color }}
                onClick={() => updateCustom({ accent: color })}
              />
            ))}
          </OptionRow>
          <OptionRow label="Background">
            <ChipGroup options={BACKGROUNDS} value={custom.background} onPick={(background) => updateCustom({ background })} />
          </OptionRow>
          <OptionRow label="Font">
            <ChipGroup options={FONTS} value={custom.font} onPick={(font) => updateCustom({ font })} />
          </OptionRow>
          <OptionRow label="Cards">
            <ChipGroup options={CARD_STYLES} value={custom.cards} onPick={(cards) => updateCustom({ cards })} />
          </OptionRow>
          <p className="pt-2 font-semibold">My day timeline</p>
          <OptionRow label={'"Now" marker'}>
            {NOW_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                aria-label={`Now marker ${emoji}`}
                className={cx(chipClass(custom.nowEmoji === emoji), 'text-base')}
                onClick={() => updateCustom({ nowEmoji: emoji })}
              >
                {emoji}
              </button>
            ))}
          </OptionRow>
          <OptionRow label="Plan blocks">
            <ChipGroup options={BLOCK_STYLES} value={custom.blocks} onPick={(blocks) => updateCustom({ blocks })} />
          </OptionRow>
        </div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3">
          <img src="/mascot.webp" alt="" className="h-12 w-12 object-contain" />
          <span className="flex-1">
            <b className="block text-sm">Show mascot</b>
            <span className="text-xs text-muted">
              On by default. Click him for a sarcastic quip, then some real motivation. Untick to hide him.
            </span>
          </span>
          <input
            type="checkbox"
            aria-label="Show mascot"
            data-testid="mascot-toggle"
            checked={theme.mascot}
            onChange={(e) => setProfile(me, { mascot: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3">
          <span className="text-3xl">🎈</span>
          <span className="flex-1">
            <b className="block text-sm">Fun extras</b>
            <span className="text-xs text-muted">Floating doodles in the background</span>
          </span>
          <input
            type="checkbox"
            checked={theme.funExtras}
            onChange={(e) => setProfile(me, { fun: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}

export default ThemeDialog;
