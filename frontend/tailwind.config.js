import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';
import colors from 'tailwindcss/colors';

// Colour scales are driven by CSS variables so a theme can re-colour every existing bg-*/text-*/border-* class at runtime.
// The defaults below are Tailwind's own values, which is the "Midnight" (original) look.
const FAMILIES = ['slate', 'gray', 'red', 'orange', 'amber', 'yellow', 'green', 'emerald', 'cyan', 'sky', 'blue', 'indigo', 'purple', 'pink'];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`; };
const themed = Object.fromEntries(FAMILIES.map((f) => [f, Object.fromEntries(STEPS.map((s) => [s, `rgb(var(--${f}-${s}) / <alpha-value>)`]))]));
const themeDefaults = plugin(({ addBase }) => addBase({
  ':root': {
    '--c-white': '255 255 255',
    '--accent-green-rgb': '16 185 129', '--accent-blue-rgb': '59 130 246', '--accent-purple-rgb': '139 92 246', '--accent-pink-rgb': '236 72 153',
    ...Object.fromEntries(FAMILIES.flatMap((f) => STEPS.map((s) => [`--${f}-${s}`, rgb(colors[f][s])]))),
  },
}));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        ...themed,
        white: 'rgb(var(--c-white) / <alpha-value>)',
        ink: '#0b1220',
        'accent-blue': 'rgb(var(--accent-blue-rgb) / <alpha-value>)',
        'accent-green': 'rgb(var(--accent-green-rgb) / <alpha-value>)',
        'accent-purple': 'rgb(var(--accent-purple-rgb) / <alpha-value>)',
        'accent-pink': 'rgb(var(--accent-pink-rgb) / <alpha-value>)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6) translateY(12px)', opacity: '0' }, '60%': { transform: 'scale(1.05)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        popCenter: { '0%': { transform: 'translate(-50%, -50%) scale(.6)', opacity: '0' }, '60%': { transform: 'translate(-50%, -50%) scale(1.05)', opacity: '1' }, '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: '1' } },
        popX: { '0%': { transform: 'translateX(-50%) scale(.6)', opacity: '0' }, '60%': { transform: 'translateX(-50%) scale(1.05)', opacity: '1' }, '100%': { transform: 'translateX(-50%) scale(1)', opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(0)' }, '20%': { transform: 'rotate(-14deg)' }, '40%': { transform: 'rotate(12deg)' }, '60%': { transform: 'rotate(-8deg)' }, '80%': { transform: 'rotate(6deg)' } },
        page: { '0%': { opacity: '0', transform: 'translateY(16px) scale(.985)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        bubble: { '0%': { transform: 'scale(.4)', opacity: '0', transformOrigin: 'bottom left' }, '70%': { transform: 'scale(1.06)', opacity: '1' }, '100%': { transform: 'scale(1)' } },
        burst: { '0%': { transform: 'scale(0) rotate(-25deg)', opacity: '0' }, '35%': { transform: 'scale(1.2) rotate(6deg)', opacity: '1' }, '60%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' }, '100%': { transform: 'scale(1.1) rotate(-3deg)', opacity: '0' } },
        stamp: { '0%': { transform: 'scale(3.2) rotate(-28deg)', opacity: '0' }, '45%': { transform: 'scale(.9) rotate(-12deg)', opacity: '1' }, '60%': { transform: 'scale(1.06) rotate(-12deg)' }, '75%': { transform: 'scale(1) rotate(-12deg)', opacity: '1' }, '100%': { transform: 'scale(1) rotate(-12deg)', opacity: '0' } },
      },
      animation: {
        pop: 'pop .35s cubic-bezier(.34,1.56,.64,1) both',
        'pop-center': 'popCenter .35s cubic-bezier(.34,1.56,.64,1) both',
        'pop-x': 'popX .35s cubic-bezier(.34,1.56,.64,1) both',
        wiggle: 'wiggle .7s ease-in-out',
        page: 'page .45s cubic-bezier(.34,1.56,.64,1) both',
        bubble: 'bubble .4s cubic-bezier(.34,1.56,.64,1) both',
        burst: 'burst 1.4s ease-out both',
        stamp: 'stamp 2.1s ease-out both',
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
    },
  },
  plugins: [animate, themeDefaults],
};
