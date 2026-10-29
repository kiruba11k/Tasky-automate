import { ReadMore } from '@/internal/ui/ReadMore';
import { MIN_TIMED, unfinishedAssigned } from '@/internal/lib/domain';
import { resolvePeriod } from '@/internal/lib/dates';
import { personStat, effortCompletion, pickStars, pickProject } from '@/internal/lib/spotlightPick';
import { useMemo, useState } from 'react';
import { Sparkles, Trophy, Crown } from 'lucide-react';
import {
  Se as useStore,
  Qe as PEOPLE,
  ic as buildPeopleStats,
  Dh as personSeries,
  tc as metricInPeriod,
  Rh as ProgressBar,
  vt as Avatar,
  Ya as Modal,
  nt as personName,
  be as firstName,
  oe as cx,
} from '@/internal/min';

/** Star(s) of a role this month: { people: [{...person, row}], team } (several people when they tie on everything), or undefined. */
function topByRole(stats, role) {
  const ids = new Set(PEOPLE.filter((p) => p.role === role).map((p) => p.id));
  const picked = pickStars(stats.filter((r) => ids.has(r.personId)), MIN_TIMED);
  return picked && { team: !!picked.team, people: picked.rows.map((row) => ({ ...PEOPLE.find((p) => p.id === row.personId), row })) };
}

/** Card text for a role's stars: shared names, the first one's avatar and stats, or a whole-team note when no one stands out. */
function starCard(star) {
  if (!star) return { id: undefined, name: 'Not picked yet', stat: '' };
  if (star.team) return { id: undefined, name: 'Whole team', stat: 'Everyone is level this month' };
  const first = star.people[0];
  return { id: first.id, name: star.people.map((p) => firstName(p.id)).join(' & '), stat: personStat(first.row) };
}

/** One star's numbers and their eight-week on-time bars. */
function PersonDetail({ person, series: weeklySeries, open = [] }) {
  return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar id={person.id} size="lg" />
          <div>
            <p className="text-lg font-bold">{personName(person.id)}</p>
            <p className="text-sm text-muted">{person.title}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['On time this month', person.row.onTime == null ? 'n/a' : `${person.row.onTime}%`],
            ['Work done this month', `${person.row.tasks} of ${person.row.assigned}`],
            ['Assigned work done (by size)', effortCompletion(person.row) == null ? 'n/a' : `${effortCompletion(person.row)}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-2 p-3">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
        {open.length > 0 && (
          <div data-testid="spotlight-open">
            <p className="text-xs font-semibold text-muted">Counted as not done yet ({open.length})</p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {open.slice(0, 8).map((o, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="tabular-nums text-muted">{o.date.slice(8, 10)}/{o.date.slice(5, 7)}</span>
                  <span className="font-medium">{o.title}</span>
                  <span className="text-muted">{o.status}</span>
                </li>
              ))}
              {open.length > 8 && <li className="text-muted">and {open.length - 8} more</li>}
            </ul>
          </div>
        )}
        <p className="text-xs font-semibold text-muted">Tasks finished on time, last eight weeks</p>
        <div className="flex h-20 items-end gap-1">
          {weeklySeries.map((point) => (
            <div
              key={point.key}
              title={`${point.title}: ${point.value == null ? 'not enough timed work' : `${point.value}% on time`}`}
              className="flex-1 rounded-t bg-accent/70"
              style={{ height: `${point.value ?? 0}%` }}
            />
          ))}
        </div>
      </div>
  );
}

/** Monthly "Star Resource / Project of the Month / Star Project Manager" cards with a detail dialog. */
export function Spotlight() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  useStore((s) => s.profiles);
  const [openKey, setOpenKey] = useState(null);
  const daily = useStore((s) => s.daily);

  const stats = useMemo(
    () => buildPeopleStats({ tasks, daily }, 'month', 'current', { people: PEOPLE.map((p) => p.id) }),
    [tasks, daily],
  );
  const winners = useMemo(() => {
    // ranked by progress to this month's targets, whatever the template, so it follows the numbers the day tables feed
    const project = pickProject(projects, (m) => metricInPeriod(m, 'month'));
    return { resource: topByRole(stats, 'resource'), pm: topByRole(stats, 'pm'), project: project?.p, projectPct: project?.pct };
  }, [projects, stats]);

  const month = resolvePeriod('month', 'current');
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });
  const cards = [
    {
      key: 'resource',
      icon: Sparkles,
      title: 'Star Resource',
      ...starCard(winners.resource),
      bg: 'from-[#0E9F6E] via-[#0B7F5B] to-[#065F46]',
    },
    {
      key: 'project',
      icon: Trophy,
      title: 'Project of the Month',
      id: undefined,
      name: winners.project?.name ?? 'Not picked yet',
      stat: winners.project ? `${winners.projectPct}% of this month's targets` : '',
      bg: 'from-[#F59E0B] via-[#D97706] to-[#B45309]',
    },
    {
      key: 'pm',
      icon: Crown,
      title: 'Star Project Manager',
      ...starCard(winners.pm),
      bg: 'from-[#1D3FA0] via-[#2747C9] to-[#4F46E5]',
    },
  ];

  const star = openKey === 'resource' ? winners.resource : openKey === 'pm' ? winners.pm : undefined;
  const people = star?.people ?? [];

  let detail = null;
  if (openKey === 'project' && winners.project) {
    const project = winners.project;
    detail = (
      <div className="space-y-3">
        <ReadMore text={project.description} className="text-sm text-muted" />
        <p className="text-sm">
          Led by <b>{firstName(project.pmId)}</b> · team {project.teamIds.map(firstName).join(', ')}
        </p>
        {project.metrics
          .filter((m) => metricInPeriod(m, 'month'))
          .map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted">{m.label} this month</span>
                <b>
                  {project.month[m.id] ?? 0} / {project.monthTarget[m.id] ?? 0}
                </b>
              </div>
              <ProgressBar value={project.month[m.id] ?? 0} max={project.monthTarget[m.id] ?? 0} tone="sky" />
            </div>
          ))}
      </div>
    );
  } else if (star?.team) {
    detail = <p className="text-sm text-muted">Everyone with enough timed work is level on score, hours and tasks, so no one is singled out this month.</p>;
  } else if (people.length) {
    detail = (
      <div className="space-y-6">
        {people.length > 1 && <p className="text-sm text-muted">Level on score, hours worked and tasks done, so they share the title.</p>}
        {people.map((person) => (
      <PersonDetail key={person.id} person={person} series={personSeries({ tasks, daily }, person.id, 'week', 'onTime', 8)} open={unfinishedAssigned(tasks.filter((t) => t.assigneeId === person.id), daily, person.id, month.from, month.to)} />
        ))}
      </div>
    );
  }

  return (
    <>
      <section aria-labelledby="spotlight-h">
        <div className="mb-2 flex items-end justify-between">
          <h2 id="spotlight-h" className="flex items-center gap-2 text-base font-extrabold tracking-tight">
            <span className="text-lg">🏆</span> {monthName} Spotlight
          </h2>
          <span className="text-xs text-muted">Tap a card to see why</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                onClick={() => setOpenKey(card.key)}
                className={cx(
                  'focus-ring group relative overflow-hidden rounded-card bg-gradient-to-br px-4 py-3 text-left text-white shadow-lift transition hover:-translate-y-1 hover:shadow-2xl',
                  card.bg,
                )}
              >
                <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-sm" />
                <span className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" />
                <span className="pointer-events-none absolute right-4 top-4 text-white/25 transition group-hover:rotate-12 group-hover:text-white/40">
                  <Icon size={40} strokeWidth={1.5} />
                </span>
                <span className="relative inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                  <Icon size={12} /> {card.title}
                </span>
                <span className="relative mt-2 flex items-center gap-3">
                  {card.id ? (
                    <span className="rounded-full p-0.5 ring-2 ring-white/70">
                      <Avatar id={card.id} size="md" />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">🚀</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-base font-extrabold leading-tight">{card.name}</span>
                    <span className="block text-xs text-white/85">{card.stat}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <Modal
        open={!!openKey}
        onClose={() => setOpenKey(null)}
        title={cards.find((c) => c.key === openKey)?.title ?? ''}
        size="md"
      >
        {detail}
      </Modal>
    </>
  );
}

export default Spotlight;
