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

const pages = { AIAllocation, Analytics, DailyTasks, Dashboard, Management, ProjectManagement, SheetsSetup, Tasks, Team };

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const currentPageName = location.pathname.split('/').filter(Boolean)[0] || 'Dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <Layout currentPageName={currentPageName}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {Object.entries(pages).map(([name, Page]) => (
          <Route key={name} path={`/${name}`} element={<Page />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Protected />
    </AuthProvider>
  );
}
