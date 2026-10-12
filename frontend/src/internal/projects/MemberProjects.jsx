import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Se as useStore, Te as Button, rt as Card, Kw as PendingPanel, Tr as PROJECT_COLORS } from '@/internal/min';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';

/** Projects page for team members / project managers: only projects they are part of. */
export function MemberProjects() {
  const { me, projects } = useStore();
  const [proposeOpen, setProposeOpen] = useState(false);
  const mine = projects
    .map((p, i) => ({ p, color: PROJECT_COLORS[i % PROJECT_COLORS.length] }))
    .filter(({ p }) => p.pmId === me || p.teamIds.includes(me) || (p.admins ?? []).includes(me));
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setProposeOpen(true)}>
          <Plus size={14} /> Propose a project
        </Button>
      </div>
      {mine.length === 0 && (
        <Card>
          <p className="py-6 text-center text-muted">You're not on any project yet.</p>
        </Card>
      )}
      {mine.map(({ p, color }) =>
        p.status === 'pending' ? (
          <PendingPanel key={p.id} color="#94A3B8" title={p.name} meta="Waiting for management approval">
            <p className="p-4 text-sm text-muted">
              {p.description || 'No description'} · Once approved you can set targets and assign tasks.
            </p>
          </PendingPanel>
        ) : (
          <ProjectCard key={p.id} p={p} color={color} />
        ),
      )}
      <ProjectFormModal open={proposeOpen} onClose={() => setProposeOpen(false)} />
    </div>
  );
}

export default MemberProjects;
