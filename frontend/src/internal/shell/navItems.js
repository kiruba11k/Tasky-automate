import { LayoutDashboard, FolderKanban, ClipboardList, Users, CircleUser, NotebookPen, Gauge, ClipboardCheck } from 'lucide-react';

export const DASHBOARD_NAV = { to: '/', label: 'Dashboard', icon: LayoutDashboard }; // q0
export const PROJECTS_NAV = { to: '/projects', label: 'Projects', icon: FolderKanban }; // V0
export const ASSIGN_NAV = { to: '/assign', label: 'Assign', icon: ClipboardList }; // HM
export const PEOPLE_NAV = { to: '/people', label: 'People', icon: Users }; // nue
export const PROFILE_NAV = { to: '/profile', label: 'Profile', icon: CircleUser }; // rue
export const DAILY_NAV = { to: '/daily', label: 'Tasks update', icon: NotebookPen, badge: 0 };
// Project managers are admins too: besides their own dashboard and day they get the team-wide pages.
export const TEAM_NAV = { to: '/team', label: 'Team', icon: Gauge };
export const TEAM_UPDATES_NAV = { to: '/team-updates', label: 'Team updates', icon: ClipboardCheck };
