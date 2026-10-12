import React, { useState } from 'react';
import {
  Se as useStore,
  oe as clsx,
  ea as canEditProject,
  MR as ProgressChart,
  LR as ProjectInsights,
} from '@/internal/min';
import { ProjectHero } from './ProjectHero';
import { ProjectSidebar } from './ProjectSidebar';
import { TargetsPanel } from './TargetsPanel';
import { WeekPlanner } from './WeekPlanner';
import { MetricsEditor } from './MetricsEditor';
import { WeekNumbers } from './WeekNumbers';
import { MeetingsPanel } from './MeetingsPanel';
import { ProjectFormModal } from './ProjectFormModal';

/** One project: hero header, tabs (progress / targets / numbers / meetings) and the edit modal. */
export function ProjectCard({ p, color }) {
  const me = useStore((s) => s.me);
  const canEdit = canEditProject(p, me);
  const [tab, setTab] = useState('progress');
  const [editOpen, setEditOpen] = useState(false);
  const tabs = [
    ['progress', '📈 Progress'],
    ...(canEdit ? [['targets', '🎯 Targets']] : []),
    ['numbers', "✍️ This week's numbers"],
    ['meetings', `🤝 Meetings (${p.meetings.length})`],
  ];
  const active = tabs.some(([id]) => id === tab) ? tab : 'progress';
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-soft" data-project={p.id}>
      <ProjectHero p={p} color={color} onEdit={() => setEditOpen(true)} />
      <div className="flex flex-wrap gap-1 border-b border-line px-4 pt-3" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setTab(id)}
            className={clsx(
              'focus-ring -mb-px rounded-t-xl border-b-2 px-4 py-2 text-sm font-semibold',
              active === id
                ? 'border-accent text-accent-ink'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-5 p-5">
        {active === 'progress' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <ProgressChart project={p} />
              <ProjectInsights p={p} />
            </div>
            <ProjectSidebar p={p} />
          </div>
        )}
        {active === 'targets' && canEdit && (
          <>
            <WeekPlanner p={p} />
            <div className="grid gap-4 lg:grid-cols-2">
              <TargetsPanel p={p} period="week" />
              <TargetsPanel p={p} period="month" />
            </div>
            <MetricsEditor p={p} />
          </>
        )}
        {active === 'numbers' && <WeekNumbers p={p} canEdit={canEdit} />}
        {active === 'meetings' && <MeetingsPanel p={p} canEdit={canEdit} />}
      </div>
      {canEdit && <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} edit={p} />}
    </div>
  );
}

export default ProjectCard;
