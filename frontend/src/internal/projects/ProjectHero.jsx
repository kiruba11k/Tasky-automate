import { ReadMore } from '@/internal/ui/ReadMore';
import { isLeadership } from '@/internal/lib/constants';
import React from 'react';
import { Settings2, Crown, ShieldCheck } from 'lucide-react';
import {
  Se as useStore,
  Te as Button,
  vt as Avatar,
  ea as canEditProject,
  Wo as roleOf,
  $e as dayKey,
  Rw as DEFAULT_STANDARDS,
  nt as fullName,
} from '@/internal/min';
import { formatHours } from './projectHelpers';

/** Coloured header of a project card: name, owner/admins and key facts. */
export function ProjectHero({ p, color, onEdit }) {
  const me = useStore((s) => s.me);
  useStore((s) => s.profiles);
  const daysLeft = Math.max(
    0,
    Math.round(
      (new Date(p.endDate + 'T00:00').getTime() - new Date(dayKey(0) + 'T00:00').getTime()) / 864e5,
    ),
  );
  const standards = { ...DEFAULT_STANDARDS, ...p.standards };
  const canEdit = canEditProject(p, me);
  const role =
    p.pmId === me
      ? 'You own this project'
      : p.admins.includes(me)
        ? 'You are a project admin'
        : isLeadership(roleOf(me))
          ? 'Management'
          : 'You are on the team';
  const onTeam = p.teamIds.includes(me) || p.hours[me] != null;
  const facts = [
    ['⏳', `${daysLeft} days`, 'left on the project'],
    [
      '👥',
      `${p.teamIds.length} people`,
      onTeam && p.pmId !== me ? `you: ${formatHours(p.hours[me] ?? 0)} / day` : 'on the team',
    ],
    ['🤝', `${p.month.meetings ?? 0} meetings`, 'booked this month'],
    [
      '⏱️',
      `${Math.round(standards.prospect * 1000) / 100} / ${standards.l1} / ${standards.l2} min`,
      `prospects (per 10) · L1 · L2 standard${p.customStandards.length ? ` · +${p.customStandards.length} custom` : ''}`,
    ],
  ];
  return (
    <div
      className="relative overflow-hidden rounded-t-card p-5 text-white"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc 60%, #0B1B4D)` }}
      data-testid="project-hero"
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">
            {p.client} · {role}
          </p>
          <h2 className="text-2xl font-extrabold text-white">{p.name}</h2>
          {p.description && <ReadMore text={p.description} className="mt-1 max-w-2xl text-sm text-white/85" buttonClassName="text-white" />}
        </div>
        {canEdit && onEdit && (
          <Button
            tone="ghost"
            className="border border-white/40 bg-white/10 text-white hover:bg-white/20"
            onClick={onEdit}
          >
            <Settings2 size={14} /> Edit project details
          </Button>
        )}
      </div>
      <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs" aria-label="Owner and admins">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/15 py-0.5 pl-0.5 pr-2.5 backdrop-blur"
          data-testid="hero-owner"
        >
          <Avatar id={p.pmId} size="sm" />
          <Crown size={12} className="text-amber-200" />
          <span className="text-white/75">Owner</span> <b>{fullName(p.pmId)}</b>
        </span>
        {p.admins.length > 0 ? (
          <span
            className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-white/15 py-0.5 pl-2.5 pr-2.5 backdrop-blur"
            data-testid="hero-admins"
          >
            <ShieldCheck size={12} />
            <span className="text-white/75">Admin{p.admins.length > 1 ? 's' : ''}</span>
            {p.admins.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 font-bold">
                <Avatar id={id} size="sm" />
                {fullName(id)}
              </span>
            ))}
          </span>
        ) : (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70" data-testid="hero-admins">
            No admins yet
          </span>
        )}
      </div>
      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {facts.map(([icon, headline, caption]) => (
          <div key={caption} className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
            <p className="text-sm font-extrabold">
              {icon} {headline}
            </p>
            <p className="text-[11px] text-white/80">{caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProjectHero;
