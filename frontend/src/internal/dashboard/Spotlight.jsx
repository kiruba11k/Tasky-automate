import { ReadMore } from '@/internal/ui/ReadMore';
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
  $e as dayKey,
} from '@/internal/min';

/** Share (%) of the work assigned to a person this month, up to today, that has been done (or null when nothing was assigned). */
function completionThisMonth(tasks, personId) {
  const from = `${dayKey(0).slice(0, 7)}-01`;
  let assigned = 0;
  let done = 0;
  tasks.forEach((t) => {
    if (t.assigneeId !== personId || t.adhoc || t.date < from || t.date > dayKey(0)) return;
    assigned += t.qty;
    if (t.status === 'done') done += Math.min(t.qty, t.doneQty ?? t.qty);
  });
  return assigned ? Math.round((done / assigned) * 100) : null;
}

/** Best person of a role this month, ranked by the average of on-time % and assigned-work-done % (or undefined). */
function topByRole(stats, tasks, role) {
  const ids = new Set(PEOPLE.filter((p) => p.role === role).map((p) => p.id));
  const best = stats
    .filter((r) => ids.has(r.personId) && r.onTime != null && r.tasks > 0)
    .map((row) => {
      const completion = completionThisMonth(tasks, row.personId) ?? 0;
      return { row, completion, score: (row.onTime + completion) / 2 };
    })
    .sort((a, b) => b.score - a.score || b.row.tasks - a.row.tasks)[0];
  return best ? { ...PEOPLE.find((p) => p.id === best.row.personId), row: best.row, completion: best.completion } : undefined;
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
    const project = [...projects.filter((p) => p.status === 'active')].sort(
      (a, b) =>
        (b.month.meetings ?? 0) / Math.max(1, b.monthTarget.meetings ?? 0) -
        (a.month.meetings ?? 0) / Math.max(1, a.monthTarget.meetings ?? 0),
    )[0];
    return { resource: topByRole(stats, tasks, 'resource'), pm: topByRole(stats, tasks, 'pm'), project };
  }, [projects, stats, tasks]);

  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' });
  const cards = [
    {
      key: 'resource',
      icon: Sparkles,
      title: 'Star Resource',
      id: winners.resource?.id,
      name: winners.resource ? personName(winners.resource.id) : 'Not picked yet',
      stat: winners.resource
        ? `${winners.resource.row.onTime}% on time · ${winners.resource.completion}% of assigned work done`
        : '',
      bg: 'from-[#0E9F6E] via-[#0B7F5B] to-[#065F46]',
    },
    {
      key: 'project',
      icon: Trophy,
      title: 'Project of the Month',
      id: undefined,
      name: winners.project?.name ?? 'Not picked yet',
      stat: winners.project ? `${winners.project.month.meetings ?? 0} meetings booked` : '',
      bg: 'from-[#F59E0B] via-[#D97706] to-[#B45309]',
    },
    {
      key: 'pm',
      icon: Crown,
      title: 'Star Project Manager',
      id: winners.pm?.id,
      name: winners.pm ? personName(winners.pm.id) : 'Not picked yet',
      stat: winners.pm ? `${winners.pm.row.onTime}% on time · ${winners.pm.completion}% of assigned work done` : '',
      bg: 'from-[#1D3FA0] via-[#2747C9] to-[#4F46E5]',
    },
  ];

  const person = openKey === 'resource' ? winners.resource : openKey === 'pm' ? winners.pm : undefined;
  const weeklySeries = person ? personSeries({ tasks, daily }, person.id, 'week', 'onTime', 8) : [];

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
  } else if (person) {
    const approved = tasks.filter((t) => t.assigneeId === person.id && t.status === 'done').length;
    detail = (
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
            ['On time this month', `${person.row.onTime}%`],
            ['Tasks done this month', person.row.tasks],
            ['Tasks approved', approved],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-2 p-3">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          ))}
        </div>
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
