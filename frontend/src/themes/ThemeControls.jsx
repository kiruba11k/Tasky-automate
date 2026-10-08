import React, { useState } from 'react';
import { Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import ThemePicker from './ThemePicker';

/** Header controls: quick light/dark switch and the theme gallery. */
export default function ThemeControls() {
  const { theme, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const btn = 'p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white';
  return (
    <>
      <button type="button" onClick={toggleMode} aria-label={theme.mode === 'dark' ? 'Switch to a light theme' : 'Switch to a dark theme'} title={theme.mode === 'dark' ? 'Switch to light' : 'Switch to dark'} className={btn}>
        {theme.mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="Choose a theme" title={`Theme: ${theme.name}`} className={btn}><Palette className="w-4 h-4" /></button>
      <ThemePicker open={open} onOpenChange={setOpen} />
    </>
  );
}
