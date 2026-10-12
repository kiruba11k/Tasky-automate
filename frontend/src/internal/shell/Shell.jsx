import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { LogOut, MessageCircle, Palette, Settings } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
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
import { DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV, PEOPLE_NAV, PROFILE_NAV, DAILY_NAV, TEAM_NAV, TEAM_UPDATES_NAV } from './navItems';
import { isAdminTier, isApprover } from '@/internal/lib/constants';

const ROLE_GROUPS = [
  ['pm', 'Project managers'],
  ['resource', 'Resources'],
  ['manager', 'Manager'],
  ['founder', 'Founders'],
];

/** Whole authenticated layout: side nav, top bar, routes, chat, mascot, toaster (original: `aue`). */
export function Shell() {
  const { me, notices, projects } = useStore();
  const { logout } = useAuth();
  const person = PEOPLE.find((p) => p.id === me);
  const [chatOpen, setChatOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const unreadChat = notices.filter((n) => n.to === me && !n.read && n.text.includes('anonymous')).length;
  const navigate = useNavigate();
  useNoticeToasts();
  const [themeOpen, setThemeOpen] = useState(false);
  const isManager = isManagerRole(person.role); // manager or founder: the main admins
  const isAdmin = isAdminTier(person.role); // main admins and project managers
  const isPm = projects.some((p) => isProjectPm(p, me) && p.status === 'active');
  const pending = isApprover(me) ? projects.filter((p) => p.status === 'pending').length : 0; // projects waiting for this approver
  const baseItems = [
    ...(isManager
      ? [DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV, PEOPLE_NAV]
      : isAdmin
        ? [DASHBOARD_NAV, TEAM_NAV, PROJECTS_NAV, ASSIGN_NAV, PEOPLE_NAV, TEAM_UPDATES_NAV]
        : isPm
          ? [DASHBOARD_NAV, PROJECTS_NAV, ASSIGN_NAV]
          : [DASHBOARD_NAV, PROJECTS_NAV]),
    PROFILE_NAV,
  ];
  const badgeFor = (item) => (isAdmin && (isManager ? item === DASHBOARD_NAV : item === TEAM_NAV) ? pending : 0);
  const navItems = [DAILY_NAV, ...baseItems.map((item) => ({ ...item, badge: badgeFor(item) }))];
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
          {isAdmin && (
            <button
              aria-label={isApprover(me) ? 'Onboard a new project' : 'Propose a new project'}
              title={isApprover(me) ? 'Onboard a new project' : 'Propose a new project'}
              className={iconButton}
              onClick={() => setProjectDialogOpen(true)}
            >
              <Settings size={18} />
            </button>
          )}
          <button aria-label="Theme" title="Theme" className={iconButton} onClick={() => setThemeOpen(true)}>
            <Palette size={18} />
          </button>
          <button aria-label="Sign out" title="Sign out" className={iconButton} onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </nav>
      <div className="relative z-[1] min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-extrabold tracking-tight">Lead Strategus</p>
            <span className="hidden text-xs text-muted sm:inline">Tracker</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-xs">
            <Avatar id={me} size="sm" />
            <span className="min-w-0 truncate font-semibold">
              {fullName(me)} · {person.title}
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Routes>
            <Route path="/" element={isManager ? <ManagerDashboard /> : <MemberDashboard />} />
            <Route path="/projects" element={isAdmin ? <ManagerProjects /> : <MemberProjects />} />
            <Route path="/daily" element={isManager ? <ManagerDaily /> : <MemberDaily />} />
            <Route path="/profile" element={<ProfilePage />} />
            {isAdmin && !isManager && <Route path="/team" element={<ManagerDashboard />} />}
            {isAdmin && !isManager && <Route path="/team-updates" element={<ManagerDaily />} />}
            {(isAdmin || isPm) && <Route path="/assign" element={<AssignPage key={me} />} />}
            {isAdmin && <Route path="/people" element={<PeoplePage />} />}
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
