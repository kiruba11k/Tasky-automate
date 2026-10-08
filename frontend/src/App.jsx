import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './Layout';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AIAllocation from './pages/AIAllocation';
import Analytics from './pages/Analytics';
import DailyTasks from './pages/DailyTasks';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Management from './pages/Management';
import ProjectManagement from './pages/ProjectManagement';
import SheetsSetup from './pages/SheetsSetup';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import WeeklyTasks from './pages/WeeklyTasks';
import { NotificationProvider } from './notifications/NotificationProvider';
import { FunProvider } from './fun/FunProvider';
import { FocusProvider } from './fun/FocusTimer';
import FunLoader from './fun/FunLoader';

const pages = { AIAllocation, Analytics, DailyTasks, Dashboard, Management, ProjectManagement, SheetsSetup, Tasks, Team, WeeklyTasks };

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const currentPageName = location.pathname.split('/').filter(Boolean)[0] || 'Dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <FunLoader label="Waking up Tasky…" />
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <NotificationProvider>
    <FunProvider>
    <FocusProvider>
    <Layout currentPageName={currentPageName}>
      <div key={location.pathname} className="page-enter">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {Object.entries(pages).map(([name, Page]) => (
          <Route key={name} path={`/${name}`} element={<Page />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </div>
    </Layout>
    </FocusProvider>
    </FunProvider>
    </NotificationProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Protected />
    </AuthProvider>
  );
}
