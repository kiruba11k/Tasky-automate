import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { MessageCircle, Palette, RotateCcw, Settings } from 'lucide-react';
import {
  Se as useStore,
  Qe as PEOPLE,
  mV as PERSON_IDS,
  nt as fullName,
  xn as isManagerRole,
  ea as isProjectPm,
  Ye as toast,
  qh as ProjectDialog,
  uR as Toaster,
  qU as MemberDashboard,
  KU as ManagerDashboard,
  iW as MemberProjects,
  aW as ManagerProjects,
  qle as MemberDaily,
  Ule as ManagerDaily,
  Ale as ProfilePage,
  Gle as AssignPage,
  eue as PeoplePage,
} from '@/internal/min';
import { cx } from '@/internal/ui/cx';
import { Avatar } from '@/internal/ui/Avatar';
import { ThemeEffects } from '@/internal/ui/ThemeEffects';
import { FloatingDoodles } from '@/internal/ui/FloatingDoodles';
import { ThemeDialog } from '@/internal/ui/ThemeDialog';
import { AnonymousChat } from './AnonymousChat';
import { Mascot } from './Mascot';
import { useNoticeToasts } from './useNoticeToasts';
import { DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV, PEOPLE_NAV, PROFILE_NAV, DAILY_NAV } from './navItems';

const ROLE_GROUPS = [
  ['pm', 'Project managers'],
  ['resource', 'Resources'],
  ['manager', 'Manager'],
  ['founder', 'Founders'],
];

/** Whole authenticated layout: side nav, top bar, routes, chat, mascot, toaster (original: `aue`). */
export function Shell() {
  const { me, notices, projects, setMe, reset } = useStore();
  const person = PEOPLE.find((p) => p.id === me);
  const [chatOpen, setChatOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const unreadChat = notices.filter((n) => n.to === me && !n.read && n.text.includes('anonymous')).length;
  const navigate = useNavigate();
  useNoticeToasts();
  const [themeOpen, setThemeOpen] = useState(false);
  const isManager = isManagerRole(person.role);
  const isPm = projects.some((p) => isProjectPm(p, me) && p.status === 'active');
  const baseItems = [
    ...(isManager
      ? [DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV, PEOPLE_NAV]
      : isPm
        ? [DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV]
        : [DASHBOARD_NAV, PROJECTS_NAV]),
    PROFILE_NAV,
  ];
  const navItems = [DAILY_NAV, ...baseItems.map((item) => ({ ...item, badge: 0 }))];
  const iconButton = 'focus-ring rounded-xl p-2 text-muted hover:bg-surface-2';

  return (
    <div className="relative flex min-h-screen bg-bg">
      <ThemeEffects />
      <FloatingDoodles />
      <nav className="sticky top-0 z-10 flex h-screen w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3">
        <img
          src="/logo.jpg"
          alt="Lead Strategus"
          className="mb-3 h-11 w-11 rounded-xl bg-white object-contain p-0.5"
        />
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cx(
                'focus-ring relative flex w-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-semibold leading-tight',
                isActive ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-surface-2',
              )
            }
          >
            <item.icon size={20} className="shrink-0" />
            <span className="block w-full text-center">{item.label}</span>
            {item.badge > 0 && (
              <span className="absolute right-2 top-1 rounded-full bg-coral-strong px-1.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col items-center gap-2">
          {isManager && (
            <button
              aria-label="Onboard a new project"
              title="Onboard a new project"
              className={iconButton}
              onClick={() => setProjectDialogOpen(true)}
            >
              <Settings size={18} />
            </button>
          )}
          <button aria-label="Theme" title="Theme" className={iconButton} onClick={() => setThemeOpen(true)}>
            <Palette size={18} />
          </button>
          <button
            aria-label="Reset demo data"
            title="Reset demo data"
            className={iconButton}
            onClick={() => {
              reset();
              toast({ title: 'Demo data reset', tone: 'info' });
            }}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </nav>
      <div className="relative z-[1] min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold tracking-tight">Lead Strategus</p>
            <span className="hidden text-xs text-muted sm:inline">Tracker</span>
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-2 text-xs">
            <Avatar id={me} size="sm" />
            <span className="hidden text-muted sm:inline">Viewing as</span>
            <select
              aria-label="Viewing as"
              className="focus-ring min-w-0 max-w-[11rem] rounded-full bg-surface px-2 py-1 font-semibold sm:max-w-none"
              value={me}
              onChange={(e) => {
                setMe(e.target.value);
                navigate('/');
              }}
            >
              {ROLE_GROUPS.map(([role, label]) => (
                <optgroup key={role} label={label}>
                  {PERSON_IDS.filter((id) => PEOPLE.find((p) => p.id === id)?.role === role).map((id) => (
                    <option key={id} value={id}>
                      {fullName(id)} · {PEOPLE.find((p) => p.id === id)?.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Routes>
            <Route path="/" element={isManager ? <ManagerDashboard /> : <MemberDashboard />} />
            <Route path="/projects" element={isManager ? <ManagerProjects /> : <MemberProjects />} />
            <Route path="/daily" element={isManager ? <ManagerDaily /> : <MemberDaily />} />
            <Route path="/profile" element={<ProfilePage />} />
            {(isManager || isPm) && <Route path="/assign" element={<AssignPage key={me} />} />}
            {isManager && <Route path="/people" element={<PeoplePage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {chatOpen && <div aria-hidden className="fixed inset-0 -z-10" onClick={() => setChatOpen(false)} />}
        {chatOpen && (
          <div className="h-[min(520px,75vh)] w-[min(640px,calc(100vw-2.5rem))] overflow-hidden rounded-card border border-line shadow-lift">
            <AnonymousChat onClose={() => setChatOpen(false)} />
          </div>
        )}
        <button
          aria-label={chatOpen ? 'Minimise chat' : 'Open anonymous chat'}
          onClick={() => {
            setChatOpen((open) => !open);
            notices
              .filter((n) => n.to === me && !n.read && n.text.includes('anonymous'))
              .forEach((n) => useStore.getState().readNotice(n.id));
          }}
          className="focus-ring relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-on shadow-lift transition hover:scale-105"
        >
          <MessageCircle size={24} />
          {unreadChat > 0 && !chatOpen && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-coral-strong px-1.5 text-[10px] font-bold text-white">
              {unreadChat}
            </span>
          )}
        </button>
      </div>
      <ProjectDialog open={projectDialogOpen} onClose={() => setProjectDialogOpen(false)} />
      <ThemeDialog open={themeOpen} onClose={() => setThemeOpen(false)} />
      <Mascot />
      <Toaster />
    </div>
  );
}

export default Shell;
