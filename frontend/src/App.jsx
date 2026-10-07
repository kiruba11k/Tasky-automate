import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './Layout';
import AIAllocation from './pages/AIAllocation';
import Analytics from './pages/Analytics';
import DailyTasks from './pages/DailyTasks';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import ProjectManagement from './pages/ProjectManagement';
import SheetsSetup from './pages/SheetsSetup';
import Tasks from './pages/Tasks';
import Team from './pages/Team';

const pages = { AIAllocation, Analytics, DailyTasks, Dashboard, Management, ProjectManagement, SheetsSetup, Tasks, Team };

export default function App() {
  const location = useLocation();
  const currentPageName = location.pathname.split('/').filter(Boolean)[0] || 'Dashboard';

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
