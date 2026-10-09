import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from 'lucide-react';
import { request } from '@/api/client';
import { Panel, today } from './ui';

const MOODS = [['sunny', 'Sunny', Sun, 'text-yellow-300'], ['partly', 'Mostly sunny', CloudSun, 'text-amber-300'], ['cloudy', 'Cloudy', Cloud, 'text-slate-300'], ['rainy', 'Rainy', CloudRain, 'text-sky-300'], ['stormy', 'Stormy', CloudLightning, 'text-violet-300']];
const SCORE_TO_MOOD = (a) => (a >= 3.3 ? 0 : a >= 2.5 ? 1 : a >= 1.6 ? 2 : a >= 0.8 ? 3 : 4);

/** Team mood weather: tap how your day feels. Only the combined weather is shown, and only when 3+ people answered. */
export default function MoodWeather() {
  const [d, setD] = useState(null);
  const load = useCallback(() => request('GET', `/api/team/mood?today=${today()}`).then(setD).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const pick = async (mood) => { setD((x) => ({ ...x, mine: mood })); try { await request('POST', '/api/mood', { mood, today: today() }); load(); } catch { /* retried next load */ } };
  const latest = d?.week?.filter((w) => w.avg !== null).slice(-1)[0];
  const idx = latest ? SCORE_TO_MOOD(latest.avg) : null;
  const Big = idx !== null ? MOODS[idx][2] : Sun;
  return (
    <Panel title="Team weather" hint="One tap, completely anonymous. The forecast only appears when at least 3 people have answered.">
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center w-24">
          <Big className={`w-14 h-14 mx-auto weather-float ${idx !== null ? MOODS[idx][3] : 'text-slate-600'}`} />
          <div className="text-xs font-bold text-slate-300 mt-1">{idx !== null ? MOODS[idx][1] : 'Forecast pending'}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-1.5">How does your day feel?</div>
          <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Your mood">
            {MOODS.map(([id, label, Icon, color]) => (
              <button key={id} type="button" role="radio" aria-checked={d?.mine === id} aria-label={label} title={label} onClick={() => pick(id)} className={`p-2 rounded-xl border-2 border-slate-900 ${d?.mine === id ? 'bg-slate-600 scale-110' : 'bg-slate-800 hover:bg-slate-700'}`}><Icon className={`w-6 h-6 ${color}`} /></button>
            ))}
          </div>
          <div className="flex gap-1 mt-2 items-end h-8" aria-label="Last five days">
            {(d?.week || []).map((w) => <div key={w.date} title={w.avg === null ? 'Not enough answers' : MOODS[SCORE_TO_MOOD(w.avg)][1]} className={`flex-1 rounded-t ${w.avg === null ? 'bg-slate-700' : 'bg-gradient-to-t from-sky-500 to-yellow-300'}`} style={{ height: `${w.avg === null ? 15 : 20 + (w.avg / 4) * 80}%` }} />)}
          </div>
        </div>
      </div>
    </Panel>
  );
}
