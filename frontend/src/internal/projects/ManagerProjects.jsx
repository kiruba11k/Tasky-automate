import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Se as useStore, Te as Button, rt as Card, Tr as PROJECT_COLORS } from '@/internal/min';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';

/** Projects page for management: every active project, plus onboarding. */
export function ManagerProjects() {
  const projects = useStore((s) => s.projects);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const active = projects
    .map((p, i) => ({ p, color: PROJECT_COLORS[i % PROJECT_COLORS.length] }))
    .filter(({ p }) => p.status === 'active');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setOnboardOpen(true)}>
          <Plus size={14} /> Onboard a project
        </Button>
      </div>
      {active.map(({ p, color }) => (
        <ProjectCard key={p.id} p={p} color={color} />
      ))}
      {active.length === 0 && (
        <Card>
          <p className="py-6 text-center text-muted">No active projects yet.</p>
        </Card>
      )}
      <ProjectFormModal open={onboardOpen} onClose={() => setOnboardOpen(false)} />
    </div>
  );
}

export default ManagerProjects;
