import animate from 'tailwindcss-animate';

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
        'accent-blue': '#3b82f6',
        'accent-green': '#10b981',
        'accent-purple': '#8b5cf6',
        'accent-pink': '#ec4899',
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
  plugins: [animate],
};
