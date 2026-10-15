import { mineFirst } from '@/internal/lib/mine';
import { ReadMore } from '@/internal/ui/ReadMore';
import React from 'react';
import { Check, X, CalendarClock } from 'lucide-react';
import {
  Se as useStore,
  $e as dayKey,
  Qe as PEOPLE,
  Tr as PROJECT_COLORS,
  xn as isMemberRole,
  yt as formatDate,
  nt as personName,
  be as firstName,
  rt as Card,
  dt as CardTitle,
  vt as Avatar,
  qe as Badge,
  Te as Button,
  lt as runAction,
  Ye as toast,
  OR as ManagerWidgetA,
  IR as ManagerWidgetB,
  BR as ManagerWidgetC,
  MR as ProjectSummary,
  LR as ProjectProgress,
  zR as ManagerWidgetD,
  Kw as ProjectPanel,
} from '@/internal/min';
import { WeekGlance } from './WeekGlance';
import { AssignmentDifficulty } from './AssignmentDifficulty';
import { isApprover, approverNames, isTrackedPerson } from '../lib/constants';

/** Manager / founder dashboard, route "/". (bundle: KU) */
export function ManagerDashboard() {
  const { me, projects, tasks, decideProject } = useStore();
  const canDecide = isApprover(me);
  const pending = projects.filter((p) => p.status === 'pending');
  const active = mineFirst(projects, me).filter((p) => p.status === 'active');
  const today = dayKey(0);
  const meetings = active
    .flatMap((p) => p.meetings.filter((m) => m.date >= today).map((m) => ({ ...m, project: p.name })))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 6);
  const team = PEOPLE.filter(isTrackedPerson).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-5">
      <ManagerWidgetA />
      <ManagerWidgetB />
      <WeekGlance />
      {pending.length > 0 && (
        <Card>
          <CardTitle>Projects waiting for approval</CardTitle>
          <ul className="divide-y divide-line">
            {pending.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar id={project.pmId} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-xs text-muted">
                    {'Proposed by '}
                    {firstName(project.pmId)}
                    {' · '}
                    <ReadMore as="span" text={project.description || 'No description'} limit={120} />
                    {' · '}
                    {formatDate(project.startDate)}
                    {' to '}
                    {formatDate(project.endDate)}
                  </p>
                </div>
                {canDecide ? (<>
                <Button
                  onClick={() =>
                    runAction(() => {
                      decideProject(project.id, true);
                      toast({ title: `${project.name} approved`, tone: 'success' });
                    })
                  }
                >
                  <Check size={13} /> Approve
                </Button>
                <Button
                  tone="ghost"
                  className="border border-line"
                  onClick={() => runAction(() => decideProject(project.id, false))}
                >
                  <X size={13} /> Decline
                </Button>
                </>) : (
                  <span className="text-xs text-muted">Waiting for {approverNames()}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ManagerWidgetC />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {active.map((project, index) => (
          <ProjectPanel
            key={project.id}
            color={PROJECT_COLORS[index % PROJECT_COLORS.length]}
            title={project.name}
            meta={`PM ${firstName(project.pmId)}`}
          >
            <div className="space-y-4 p-4">
              <ProjectSummary project={project} />
              <ProjectProgress p={project} compact />
            </div>
          </ProjectPanel>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <AssignmentDifficulty />
        <div className="space-y-5">
          <Card>
            <CardTitle>Upcoming meetings</CardTitle>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted">No meetings scheduled yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {meetings.map((meeting) => (
                  <li key={meeting.id} className="flex items-center gap-3 py-2 text-sm">
                    <CalendarClock size={16} className="text-accent" />
                    <span className="flex-1">
                      <b>{meeting.company}</b>{' '}
                      <span className="text-muted">
                        {'· '}
                        {meeting.contact}
                        {' · '}
                        {meeting.project}
                      </span>
                    </span>
                    <span className="text-muted">
                      {formatDate(meeting.date)}
                      {', '}
                      {meeting.time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>Team today</CardTitle>
            <ul className="divide-y divide-line">
              {team.map((person) => {
                const mine = tasks.filter(
                  (t) =>
                    t.assigneeId === person.id &&
                    (t.date === today || (t.date < today && t.status !== 'done')),
                );
                const open = mine.filter((t) => t.status !== 'done' && t.status !== 'in_review').length;
                return (
                  <li key={person.id} className="flex items-center gap-3 py-2 text-sm">
                    <Avatar id={person.id} size="sm" />
                    <span className="flex-1">
                      {personName(person.id)}{' '}
                      <span className="text-xs text-muted">
                        {'· '}
                        {person.title}
                      </span>
                    </span>
                    <Badge tone="mint">
                      {mine.filter((t) => t.status === 'done').length}
                      {' done'}
                    </Badge>
                    <Badge tone="lavender">
                      {mine.filter((t) => t.status === 'in_review').length}
                      {' in review'}
                    </Badge>
                    <Badge tone="grey">
                      {open}
                      {' open'}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
      <ManagerWidgetD />
    </div>
  );
}

export default ManagerDashboard;
