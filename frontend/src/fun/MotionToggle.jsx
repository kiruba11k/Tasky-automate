import React from 'react';
import { Pause, Play } from 'lucide-react';
import { useFun } from './FunProvider';

/** One-click "pause motion" in the header (WCAG 2.2.2: auto-playing animation needs a visible way to stop it). */
export default function MotionToggle() {
  const { settings, setSettings } = useFun();
  const paused = settings.anim === 'calm';
  return (
    <button
      type="button" aria-pressed={paused} onClick={() => setSettings({ anim: paused ? 'full' : 'calm' })}
      aria-label={paused ? 'Resume animations' : 'Pause animations'} title={paused ? 'Resume animations' : 'Pause animations'}
      className="p-2 rounded-lg bg-slate-800/70 border border-slate-700/60 text-slate-300 hover:text-white"
    >
      {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
    </button>
  );
}
