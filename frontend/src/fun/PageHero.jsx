import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { request } from '@/api/client';
import { useFun } from './FunProvider';
import { useTeam } from './team';
import { hasWebGL } from './three/species';

const HeroStage = lazy(() => import('./three/HeroStage'));

const CONFIG = {
  DailyTasks: { title: 'Daily workbench', tagline: 'Clear your desk, one sticky note at a time.', hue: '#1e3a8a' },
  WeeklyTasks: { title: 'The weekly express', tagline: 'All aboard! Five stops, Monday to Friday.', hue: '#065f46' },
  Analytics: { title: 'Number lab', tagline: 'Planned, done and still to go, this week.', hue: '#312e81' },
  Management: { title: 'Gear room', tagline: 'The team’s engine. It spins faster the more gets done.', hue: '#78350f' },
  ProjectManagement: { title: 'Build site', tagline: 'Every step forward adds a block to the tower.', hue: '#7c2d12' },
  Tasks: { title: 'Sorting depot', tagline: 'Crates travel from To do to Done.', hue: '#1e40af' },
  Team: { title: 'Group photo', tagline: 'Say cheese! Everyone on the team, together.', hue: '#831843' },
  AIAllocation: { title: 'Magic lab', tagline: 'The wizard conjures the right task for the right person.', hue: '#4c1d95' },
  SheetsSetup: { title: 'Cloud link', tagline: 'Your tasks flow to Google Sheets, packet by packet.', hue: '#0f766e' },
};
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function useHeroData(page) {
  const { stats } = useFun();
  const { rows } = useTeam(['entity', 'weekly']);
  const [extra, setExtra] = useState({});
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        if (page === 'ProjectManagement') {
          const ps = await request('GET', '/api/entities/Project');
          if (live) setExtra({ progress: ps.length ? ps.reduce((n, p) => n + (Number(p.progress) || 0), 0) / ps.length : 0, count: ps.length });
        } else if (page === 'Tasks') {
          const ts = await request('GET', '/api/entities/Task');
          const c = (s) => ts.filter((t) => s.includes(t.status)).length;
          if (live) setExtra({ todo: c(['Backlog', 'Review']), doing: c(['In Progress']), done: c(['Completed']) });
        }
      } catch { /* decorative */ }
    };
    load();
    return () => { live = false; };
  }, [page]);
  const planned = rows.reduce((n, r) => n + r.planned, 0);
  const done = rows.reduce((n, r) => n + r.done, 0);
  return { pending: Math.max(0, (stats?.planned_today || 0) - (stats?.completed_today || 0)), planned, done, activity: rows.reduce((n, r) => n + r.done_today, 0), members: rows, ...extra };
}

/** A themed 3D banner at the top of each page (a different scene and buddy per page). Dismissible, and off in settings. */
export default function PageHero() {
  const loc = useLocation();
  const page = loc.pathname.split('/').filter(Boolean)[0] || 'Dashboard';
  const { settings } = useFun();
  const cfg = CONFIG[page];
  const data = useHeroData(page);
  const [flash, setFlash] = useState(0);
  const [off, setOff] = useState(() => { try { return localStorage.getItem(`tasky_hero_off_${page}`) === '1'; } catch { return false; } });
  useEffect(() => { try { setOff(localStorage.getItem(`tasky_hero_off_${page}`) === '1'); } catch { setOff(false); } }, [page]);
  if (!cfg || off || !settings.heroes || !settings.view3d || !hasWebGL()) return null;
  const hide = () => { setOff(true); try { localStorage.setItem(`tasky_hero_off_${page}`, '1'); } catch { /* ignore */ } };
  const day = new Date().getDay();
  const chips = {
    DailyTasks: [`${data.pending} to do today`],
    WeeklyTasks: [`Today is ${DAYS[day]}${day >= 1 && day <= 5 ? `, stop ${day} of 5` : ''}`],
    Analytics: [`${data.planned} planned`, `${data.done} done`, `${Math.max(0, data.planned - data.done)} to go`],
    Management: [`${data.activity} finished today`],
    ProjectManagement: [`${Math.round(data.progress || 0)}% average progress`],
    Tasks: [`${data.todo || 0} to do`, `${data.doing || 0} in progress`, `${data.done || 0} done`],
    Team: [`${data.members.length} teammates`],
  }[page] || [];
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 pt-4">
      <section className="page-hero" style={{ '--hero': cfg.hue }} aria-label={cfg.title}>
        <div className="relative z-10 min-w-0 pr-2">
          <h2 className="text-xl font-extrabold text-white">{cfg.title}</h2>
          <p className="text-sm text-slate-200 max-w-xs">{cfg.tagline}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">{chips.map((c) => <span key={c} className="rounded-full bg-black/30 border border-white/15 px-2.5 py-0.5 text-xs font-bold text-white">{c}</span>)}</div>
        </div>
        <div className="hero-canvas">
          <Suspense fallback={null}><HeroStage page={page} data={data} calm={settings.anim === 'calm'} onFlash={() => setFlash((f) => f + 1)} /></Suspense>
        </div>
        {flash > 0 && <div key={flash} className="hero-flash" />}
        <button type="button" onClick={hide} aria-label="Hide this banner" className="absolute right-2 top-2 z-20 p-1 rounded-full bg-black/30 text-white/80 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </section>
    </div>
  );
}
