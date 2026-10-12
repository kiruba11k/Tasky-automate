import { Se as useStore, eU as DEFAULT_CUSTOM_THEME } from '@/internal/min';
import { listThemes } from '@/themes/registry';
import { resolveTheme } from '@/themes/engine';

/** Accent palette (original: `Tr`). */
export const ACCENT_COLORS = ['#1D3FA0', '#DC2626', '#0E9F6E', '#7C3AED', '#D97706', '#0891B2'];

/** Theme presets (original: `gf`). */
export const THEMES = {
  pro: {
    name: 'Professional',
    blurb: 'The standard Lead Strategus look',
    swatch: ['#F4F6FB', '#1D3FA0', '#DC2626'],
    look: { mode: 'light', bg: 'plain', font: 'jakarta', cards: 'classic', blocks: 'solid', floaters: [] },
  },
  dark: {
    name: 'Professional Dark',
    blurb: 'Same thing, lights off',
    swatch: ['#0B1120', '#789CFF', '#1D3FA0'],
    look: { mode: 'dark', bg: 'plain', font: 'jakarta', cards: 'classic', blocks: 'solid', floaters: [] },
  },
  cartoon: {
    name: 'Cartoon',
    blurb: 'Thick outlines, wobbly cards, doodles',
    swatch: ['#FFF8E7', '#EA580C', '#1F1F1F'],
    look: {
      mode: 'light',
      fun: 'cartoon',
      bg: 'dots',
      font: 'fredoka',
      cards: 'cartoon',
      nowEmoji: '🏃',
      blocks: 'striped',
      floaters: ['⭐', '✏️', '☁️', '🎈', '📎'],
    },
  },
  comic: {
    name: 'Comic Book',
    blurb: 'POW! Halftones and big headlines',
    swatch: ['#FFEC78', '#DC2626', '#000000'],
    look: {
      mode: 'light',
      fun: 'comic',
      bg: 'halftone',
      font: 'bangers',
      cards: 'cartoon',
      nowEmoji: '💥',
      blocks: 'solid',
      floaters: ['💥', '⚡', '💬', '❗'],
    },
  },
  candy: {
    name: 'Candy Pop',
    blurb: 'Sweet pastels and bubbly corners',
    swatch: ['#FFE4F2', '#DB2777', '#A78BFA'],
    look: {
      mode: 'light',
      fun: 'candy',
      bg: 'candy',
      font: 'fredoka',
      cards: 'bubbly',
      nowEmoji: '🍭',
      blocks: 'candy',
      floaters: ['🍬', '🧁', '🍭', '🌈', '🫧'],
    },
  },
  space: {
    name: 'Space Cadet',
    blurb: 'Neon on a starfield',
    swatch: ['#080A1E', '#22D3EE', '#A78BFA'],
    look: {
      mode: 'dark',
      fun: 'space',
      bg: 'stars',
      font: 'jakarta',
      cards: 'classic',
      nowEmoji: '🚀',
      blocks: 'solid',
      floaters: ['🪐', '🛸', '✨', '🌙'],
    },
  },
  custom: {
    name: 'Make your own',
    blurb: 'Pick colours, fonts, emoji…',
    swatch: ['#F5F3FF', '#7C3AED', '#F59E0B'],
    look: {
      mode: 'light',
      fun: 'custom',
      bg: 'confetti',
      font: 'fredoka',
      cards: 'bubbly',
      blocks: 'candy',
      floaters: [],
    },
  },
};

/** The colour themes built for the earlier app (Midnight, Neon Arcade, Forest Night...), offered alongside the presets as `pack:<id>`. */
for (const def of listThemes()) {
  const { tokens } = resolveTheme(def);
  THEMES[`pack:${def.id}`] = {
    name: def.name,
    blurb: def.tagline,
    swatch: [tokens.page, tokens.primary, def.accent || tokens.secondary],
    look: { mode: def.mode, fun: 'pack', pack: def, bg: 'plain', font: def.cartoon ? 'fredoka' : 'jakarta', cards: def.cartoon ? 'cartoon' : 'classic', blocks: 'solid', floaters: [] },
  };
}

/** "#RRGGBB" -> "r g b" channel string (original: `yU`). */
export const hexToRgbChannels = (hex) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '124 58 237';
  const n = parseInt(match[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Resolved look of the current person's theme (original: `ac`). */
export function useTheme() {
  const profile = useStore((s) => s.profiles[s.me]);
  const theme = profile?.theme ?? (profile?.dark ? 'dark' : 'pro');
  const custom = { ...DEFAULT_CUSTOM_THEME, ...profile?.custom };
  const look = THEMES[theme]?.look ?? THEMES.pro.look;
  return {
    ...(theme === 'custom'
      ? {
          mode: custom.base,
          fun: 'custom',
          bg: custom.background,
          font: custom.font,
          cards: custom.cards,
          nowEmoji: custom.nowEmoji,
          blocks: custom.blocks,
          floaters: ['🎉', '✨', '🌈', '⭐', '💫'],
        }
      : look),
    theme,
    custom,
    mascot: profile?.mascot ?? true,
    funExtras: profile?.fun ?? (theme !== 'pro' && theme !== 'dark'),
  };
}
