import React, { useMemo, useState } from 'react';
import { Check, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Emoji } from '@/icons/Emoji';
import { useFun } from '@/fun/FunProvider';
import { buildCustomTheme, DEFAULT_SPEC, validateCustomSpec } from './custom';
import { resolveTheme } from './engine';
import { useTheme } from './ThemeProvider';

const Switch = ({ label, hint, on, onChange }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-sm text-white">{label}{hint && <span className="block text-[11px] text-slate-400">{hint}</span>}</span>
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full border-2 border-slate-950 transition-colors relative shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#fff] transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  </div>
);

/** A miniature app drawn with the theme's own colours, so you see the look before choosing it. */
export function ThemePreview({ def }) {
  const { tokens: t } = useMemo(() => resolveTheme(def), [def]);
  const f = t.families;
  return (
    <div className="rounded-xl overflow-hidden border-2 text-left" style={{ background: t.page, borderColor: t.border }} aria-hidden="true">
      <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ background: t.inset }}>
        <span className="w-3 h-3 rounded-md" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />
        <span className="h-1.5 w-10 rounded-full" style={{ background: t.muted }} />
        <span className="ml-auto h-1.5 w-6 rounded-full" style={{ background: t.primary }} />
      </div>
      <div className="p-2 space-y-1.5">
        <div className="rounded-lg p-2 border" style={{ background: t.card, borderColor: t.border }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${def.mascot?.[0] || t.primary}, ${def.mascot?.[1] || t.secondary})`, border: `2px solid ${t.text}33` }} />
            <div className="space-y-1 flex-1">
              <div className="h-1.5 w-3/4 rounded-full" style={{ background: t.text }} />
              <div className="h-1.5 w-1/2 rounded-full" style={{ background: t.muted }} />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className="h-4 px-2 rounded-md text-[8px] font-bold grid place-items-center" style={{ background: f.blue[600], color: '#fff' }}>Save</span>
          <span className="h-4 px-2 rounded-md text-[8px] font-bold grid place-items-center" style={{ background: f.purple[600], color: '#fff' }}>New</span>
          <span className="h-4 px-2 rounded-md text-[8px] font-bold grid place-items-center border" style={{ borderColor: t.border, color: t.text2 }}>Done</span>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ def, selected, onPick }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={() => onPick(def.id)} className={`group text-left rounded-2xl border-2 p-2 transition-colors bg-slate-800/60 ${selected ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-700 hover:border-slate-500'}`}>
      <ThemePreview def={def} />
      <div className="flex items-center gap-1.5 mt-2 px-1">
        <Emoji e={def.icon} size="1.2rem" />
        <span className="font-bold text-sm text-white">{def.name}</span>
        {selected && <Check className="w-4 h-4 text-emerald-400 ml-auto" aria-label="Selected" />}
      </div>
      <div className="px-1 text-[11px] text-slate-400">{def.tagline}</div>
    </button>
  );
}

function CustomBuilder() {
  const { prefs, saveCustom, theme } = useTheme();
  const [spec, setSpec] = useState(prefs.custom || DEFAULT_SPEC);
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const err = validateCustomSpec(spec);
  const preview = err ? null : buildCustomTheme(spec);
  const set = (patch) => { setSpec((s) => ({ ...s, ...patch })); setError(''); };

  const doImport = () => {
    try {
      const parsed = JSON.parse(json);
      const problem = validateCustomSpec(parsed);
      if (problem) throw new Error(problem);
      setSpec(parsed);
      saveCustom(parsed);
      setError('');
    } catch (e) {
      setError(`Could not import: ${e.message}`);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-slate-700 bg-slate-800/40 p-4 space-y-3">
      <div className="grid md:grid-cols-[1fr_14rem] gap-4">
        <div className="space-y-3">
          <label className="block text-sm text-white">Name
            <Input value={spec.name} maxLength={30} onChange={(e) => set({ name: e.target.value })} className="mt-1 bg-slate-800 border-slate-700 text-white" />
          </label>
          <div className="flex gap-2" role="radiogroup" aria-label="Mode">
            {['light', 'dark'].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={spec.mode === m} onClick={() => set({ mode: m })} className={`flex-1 rounded-xl border-2 py-1.5 text-sm font-bold capitalize ${spec.mode === m ? 'border-emerald-400 text-white' : 'border-slate-700 text-slate-300'}`}>{m}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['primary', 'Main colour'], ['secondary', 'Second colour']].map(([k, label]) => (
              <label key={k} className="text-sm text-white">{label}
                <input type="color" value={spec[k]} onChange={(e) => set({ [k]: e.target.value })} className="mt-1 block w-full h-9 rounded-lg border-2 border-slate-700 bg-transparent cursor-pointer" aria-label={label} />
              </label>
            ))}
          </div>
          <label className="block text-sm text-white">Background tint ({Math.round(spec.neutral.hue)}°)
            <input type="range" min="0" max="360" value={spec.neutral.hue} onChange={(e) => set({ neutral: { ...spec.neutral, hue: Number(e.target.value) } })} className="w-full" aria-label="Background tint hue" />
          </label>
          <label className="block text-sm text-white">Tint strength ({Math.round(spec.neutral.sat)}%)
            <input type="range" min="0" max="80" value={spec.neutral.sat} onChange={(e) => set({ neutral: { ...spec.neutral, sat: Number(e.target.value) } })} className="w-full" aria-label="Background tint strength" />
          </label>
        </div>
        <div className="space-y-2">
          {preview ? <ThemePreview def={preview} /> : <p className="text-xs text-amber-300">{err}</p>}
          <Button type="button" disabled={!!err} onClick={() => saveCustom(spec)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-ink font-bold">{theme.id === 'custom' ? 'Update my theme' : 'Use my theme'}</Button>
          <p className="text-[11px] text-slate-400">Text contrast is fixed automatically, whatever colours you pick.</p>
        </div>
      </div>
      <div className="border-t border-slate-700 pt-3 space-y-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!!err} onClick={() => setJson(JSON.stringify(spec, null, 2))} className="bg-transparent border-slate-600 text-slate-200"><Download className="w-4 h-4 mr-1" />Export as JSON</Button>
          <Button type="button" variant="outline" disabled={!json.trim()} onClick={doImport} className="bg-transparent border-slate-600 text-slate-200"><Upload className="w-4 h-4 mr-1" />Import this JSON</Button>
        </div>
        <Textarea value={json} onChange={(e) => setJson(e.target.value)} rows={3} placeholder="Paste a theme from a teammate here, or Export to share yours" className="bg-slate-800 border-slate-700 text-white font-mono text-xs" aria-label="Theme JSON" />
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export default function ThemePicker({ open, onOpenChange }) {
  const { theme, themes, prefs, setThemeId, setAuto } = useTheme();
  const { settings, setSettings } = useFun();
  const [builder, setBuilder] = useState(false);
  const light = themes.filter((t) => t.mode === 'light');
  const dark = themes.filter((t) => t.mode === 'dark');
  const custom = prefs.custom ? buildCustomTheme(prefs.custom) : null;

  const group = (title, list) => (
    <section aria-label={title}>
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-300 mb-2">{title}</h3>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {list.map((d) => <ThemeCard key={d.id} def={d} selected={theme.id === d.id && !prefs.auto} onPick={setThemeId} />)}
      </div>
    </section>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-white">
        <DialogTitle className="text-2xl font-extrabold">Pick your look</DialogTitle>
        <DialogDescription className="text-slate-400">Applies instantly across the whole app and follows you to every device you sign in on.</DialogDescription>
        <div className="grid sm:grid-cols-2 gap-x-6">
          <Switch label="Match my device" hint="Light by day, dark by night, following your system" on={prefs.auto} onChange={setAuto} />
          <Switch label="Cartoon style" hint="Outlined stickers, bouncy buttons and shadows" on={settings.cartoon} onChange={(v) => setSettings({ cartoon: v })} />
        </div>
        <div className="space-y-5 max-h-[58vh] overflow-y-auto pr-1">
          {group('Light themes', light)}
          {group('Dark themes', dark)}
          {custom && group('Yours', [custom])}
          <section aria-label="Make your own theme">
            <button type="button" aria-expanded={builder} onClick={() => setBuilder((b) => !b)} className="text-sm font-extrabold uppercase tracking-wider text-slate-300 hover:text-white">{builder ? '▾' : '▸'} Make your own theme</button>
            {builder && <div className="mt-2"><CustomBuilder /></div>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
