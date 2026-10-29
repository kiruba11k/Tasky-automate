import { mineFirst } from '@/internal/lib/mine';
import { ReadMore } from '@/internal/ui/ReadMore';
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Se as useStore, Te as Button, rt as Card, Kw as PendingPanel, Tr as PROJECT_COLORS } from '@/internal/min';
import { approverNames } from '@/internal/lib/constants';
import { ProjectCard } from './ProjectCard';
import { ProjectFormModal } from './ProjectFormModal';
import { SentProposalActions } from './SentProposalActions';

/** Projects page for management: every active project, plus onboarding. */
export function ManagerProjects() {
  const projects = useStore((s) => s.projects);
  const me = useStore((s) => s.me);
  // proposals this person sent that are still waiting: they show here so the sender can see they were sent
  const sent = projects.filter((p) => p.status === 'pending' && p.pmId === me);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const colorOf = (p) => PROJECT_COLORS[projects.indexOf(p) % PROJECT_COLORS.length];
  // the projects this person owns or is on come first
  const active = mineFirst(projects, me)
    .filter((p) => p.status === 'active')
    .map((p) => ({ p, color: colorOf(p) }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setOnboardOpen(true)}>
          <Plus size={14} /> Onboard a project
        </Button>
      </div>
      {sent.map((p) => (
        <PendingPanel key={p.id} color="#94A3B8" title={p.name} meta={`Sent for approval to ${approverNames()}`}>
          <div className="p-4 text-sm text-muted">
            <ReadMore text={p.description || 'No description'} />
            <p className="mt-1">Once approved you can set targets and assign tasks.</p>
          </div>
          {p.pmId === me && <SentProposalActions p={p} />}
        </PendingPanel>
      ))}
      {active.map(({ p, color }) => (
        <ProjectCard key={p.id} p={p} color={color} />
      ))}
      {active.length === 0 && sent.length === 0 && (
        <Card>
          <p className="py-6 text-center text-muted">No active projects yet.</p>
        </Card>
      )}
      <ProjectFormModal open={onboardOpen} onClose={() => setOnboardOpen(false)} />
    </div>
  );
}

export default ManagerProjects;
