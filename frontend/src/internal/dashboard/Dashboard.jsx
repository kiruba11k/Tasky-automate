import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Se as useStore,
  Qe as PEOPLE,
  rt as Card,
  dt as CardTitle,
  qe as Badge,
  $e as dayKey,
  ft as addDays,
  yt as formatDate,
  Tr as PROJECT_COLORS,
  PR as onTimeSummary,
} from '@/internal/min';
import { QuoteOfTheDay } from './QuoteOfTheDay';
import { Spotlight } from './Spotlight';
import { lunchFor } from '../lib/dates';
import { dayLoggedMinutes } from '../lib/domain';
import { DayPlanStrip } from './DayPlanStrip';
import { ReviewQueue } from './ReviewQueue';
import { ReviewedByYou } from './ReviewedByYou';
import { ProjectCard } from './ProjectCard';
import { TaskRow } from './TaskRow';

/** Sort order of a person's tasks inside a project card. */
export const STATUS_ORDER = { changes: 0, in_progress: 1, todo: 2, in_review: 3, done: 4 };

/** Member dashboard (route "/"). */
export function Dashboard() {
  const { me, tasks, projects, daily } = useStore();
  const person = PEOPLE.find((p) => p.id === me);
  const today = dayKey(0);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === me && (t.status !== 'done' || t.date === today)),
    [tasks, me, today],
  );
  const myProjects = useMemo(() => {
    const ids = new Set([
      ...projects.filter((p) => p.status === 'active' && (p.hours[me] ?? 0) > 0).map((p) => p.id),
      ...myTasks.map((t) => t.projectId),
    ]);
    return projects
      .map((p, i) => ({ p, color: PROJECT_COLORS[i % PROJECT_COLORS.length], hours: p.hours[me] ?? 0 }))
      .filter((x) => ids.has(x.p.id));
  }, [projects, myTasks, me]);

  if (!person) return null;

  const carried = myTasks.filter((t) => t.date < today);
  const carriedCount = carried.length;
  const carriedFrom = carried.every((t) => t.date === addDays(today, -1))
    ? 'yesterday'
    : carried.every((t) => t.date === carried[0]?.date) && carried[0]
      ? formatDate(carried[0].date)
      : 'earlier days';
  const loggedMinutes = dayLoggedMinutes(tasks, daily, me, today);
  const onTime = onTimeSummary(tasks.filter((t) => t.assigneeId === me));
  const plan = daily[`${me}|${today}`]?.plan ?? [];

  return (
    <div className="space-y-5">
      <QuoteOfTheDay
        extra={
          onTime && (
            <Badge tone="sky">
              {onTime.onTime} of {onTime.total} tasks on time
            </Badge>
          )
        }
      />
      <Spotlight />
      <Card>
        <CardTitle right={<span className="text-xs text-muted">{carriedCount > 0 && `${carriedCount} carried over from ${carriedFrom}`}</span>}>
          My day
        </CardTitle>
        <DayPlanStrip blocks={plan} loggedMinutes={loggedMinutes} lunch={lunchFor(daily, me, today)} />
        <Link
          to="/daily"
          className="focus-ring mt-3 inline-block rounded-lg text-sm font-semibold text-accent-ink hover:underline"
        >
          {plan.length ? 'Edit day plan →' : 'Plan your day in Tasks update →'}
        </Link>
      </Card>
      <ReviewQueue />
      <div className="space-y-5">
        {myProjects.length === 0 && (
          <Card>
            <p className="py-6 text-center text-muted">No projects or tasks for today yet ☀️</p>
          </Card>
        )}
        {myProjects.map(({ p, color, hours }) => {
          const projectTasks = myTasks
            .filter((t) => t.projectId === p.id)
            .sort((a, b) => Number(b.priority) - Number(a.priority) || STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
          return (
            <ProjectCard
              key={p.id}
              color={color}
              title={p.name}
              meta={`${hours ? `${hours}h today` : 'No hours planned'} · ${projectTasks.filter((t) => t.status === 'done').length}/${projectTasks.length} done`}
            >
              {projectTasks.length ? (
                <ul className="divide-y divide-line">
                  {projectTasks.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-muted">No tasks yet for today.</p>
              )}
            </ProjectCard>
          );
        })}
      </div>
      <ReviewedByYou />
    </div>
  );
}

export default Dashboard;
