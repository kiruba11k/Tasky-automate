import './crm.css';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { oe as cx } from '@/internal/min';
import { ActivitiesPage, CompaniesPage, ContactsPage, DataPage, DealsPage, ForecastPage, HomePage, MyActionsPage, RecordPage, ReportsPage, GoalsPage, SettingsPage } from './pages.jsx';

/** Navigation grouped by what people do: their workspace, the sales view, and data upkeep. */
export const CRM_NAV = [
  ['Workspace', [['/crm', 'CRM Home', true], ['/crm/actions', 'My Actions'], ['/crm/contacts', 'Contacts'], ['/crm/companies', 'Companies'], ['/crm/leads', 'Leads / Prospects'], ['/crm/deals', 'Deals'], ['/crm/activities', 'Activities & Meetings']]],
  ['Sales', [['/crm/forecast', 'Pipeline & Forecast'], ['/crm/goals', 'Sales Goals'], ['/crm/reports', 'Reports & Dashboards']]],
  ['Admin', [['/crm/data', 'Data management'], ['/crm/settings', 'Settings']]],
];

export function CrmApp() {
  return (
    <div className="crm-layout" data-testid="crm">
      <nav aria-label="CRM" className="crm-nav space-y-3">
        {CRM_NAV.map(([group, items]) => (
          <div key={group}>
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">{group}</p>
            {items.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={!!end} className={({ isActive }) => cx('focus-ring block rounded-lg px-2 py-1.5 text-sm font-semibold', isActive ? 'bg-accent-soft text-accent-ink' : 'text-muted hover:bg-surface-2')}>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0">
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="actions" element={<MyActionsPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="leads" element={<ContactsPage lifecycle={['prospect', 'lead']} />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path=":type/:id" element={<RecordPage />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
      </div>
    </div>
  );
}
export default CrmApp;
