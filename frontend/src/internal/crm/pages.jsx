import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, LayoutGrid, Table2, Phone, Mail, CalendarDays, StickyNote, ListChecks, ArrowRightLeft, Check } from 'lucide-react';
import { Qe as PEOPLE, be as firstName, oe as cx, Te as Button, rt as Card } from '@/internal/min';
import { STAGES, OPEN_STAGES, moveStage, LIFECYCLE, isOpenDeal, stageOf, dealRisk, atRiskDeals, pipelineStats, myActions } from './crmLogic.js';
import { useCrm, saveRecord, removeRecord, logActivity, money, nowIso } from './crmStore.js';
import { stageConversion, closeDateReport, closedByMonth, outcomeReport, goalProgress, GOAL_METRICS } from './reports.js';
import { IndexTable } from './IndexTable.jsx';
import { RecordForm, CompleteActionModal, OwnerSelect, FIELD } from './forms.jsx';
import { isAdminTier } from '../lib/constants.js';
import { toast } from '../kit/toast.js';

const th = 'px-3 py-2 text-left text-xs font-bold text-muted';
const td = 'px-3 py-2 text-sm';
const TYPE_ICON = { call: Phone, email: Mail, meeting: CalendarDays, note: StickyNote, task: ListChecks, stage: ArrowRightLeft };
const RISK_CLASS = { high: 'bg-coral/60 text-coral-ink', medium: 'bg-amber-200 text-amber-900', low: 'bg-mint/60 text-mint-ink' };
export const PageHead = ({ title, children }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);
export const RiskBadge = ({ risk }) => (
  <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', RISK_CLASS[risk.level])} title={risk.reasons.join('. ')}>
    {risk.level === 'low' ? 'On track' : `${risk.level} risk`}
  </span>
);
const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-surface p-3">
    <p className="text-xs text-muted">{label}</p>
    <p className="text-xl font-extrabold tabular-nums">{value}</p>
  </div>
);

const useNames = () => {
  const { companies, contacts } = useCrm();
  return { company: (id) => companies.find((c) => c.id === id)?.name, contact: (id) => contacts.find((c) => c.id === id)?.name };
};

export function ContactsPage({ lifecycle }) {
  const { contacts } = useCrm();
  const names = useNames();
  const [adding, setAdding] = useState(false);
  const rows = lifecycle ? contacts.filter((c) => lifecycle.includes(c.lifecycle)) : contacts;
  const cols = [
    { key: 'name', label: 'Name', get: (r) => r.name },
    { key: 'title', label: 'Title', get: (r) => r.title },
    { key: 'company', label: 'Company', get: (r) => names.company(r.companyId) },
    { key: 'email', label: 'Email', get: (r) => r.email },
    { key: 'phone', label: 'Phone', get: (r) => r.phone },
    { key: 'lifecycle', label: 'Lifecycle', get: (r) => LIFECYCLE.find((l) => l.id === r.lifecycle)?.label },
    { key: 'owner', label: 'Owner', get: (r) => firstName(r.ownerId) },
  ];
  return (
    <>
      <PageHead title={lifecycle ? 'Leads / Prospects' : 'Contacts'}><Button onClick={() => setAdding(true)}><Plus size={14} /> New contact</Button></PageHead>
      <IndexTable type="contact" rows={rows} columns={cols} to={(r) => `/crm/contact/${r.id}`} empty="No contacts yet." filters={[{ key: 'lifecycle', label: 'Lifecycle', kind: 'select', get: (r) => r.lifecycle, show: (v) => LIFECYCLE.find((l) => l.id === v)?.label }, { key: 'company', label: 'Company', kind: 'select', get: (r) => names.company(r.companyId) }]} bulk={[{ key: 'lifecycle', label: 'Lifecycle', options: LIFECYCLE.map((l) => ({ value: l.id, label: l.label })) }]} />
      {adding && <RecordForm type="contact" initial={lifecycle ? { lifecycle: lifecycle[0] } : {}} onClose={() => setAdding(false)} />}
    </>
  );
}

export function CompaniesPage() {
  const { companies, contacts, deals } = useCrm();
  const [adding, setAdding] = useState(false);
  const cols = [
    { key: 'name', label: 'Company', get: (r) => r.name },
    { key: 'domain', label: 'Domain', get: (r) => r.domain },
    { key: 'industry', label: 'Industry', get: (r) => r.industry },
    { key: 'location', label: 'Location', get: (r) => r.location },
    { key: 'contacts', label: 'Contacts', get: (r) => contacts.filter((c) => c.companyId === r.id).length },
    { key: 'deals', label: 'Open deals', get: (r) => deals.filter((d) => d.companyId === r.id && isOpenDeal(d)).length },
    { key: 'owner', label: 'Owner', get: (r) => firstName(r.ownerId) },
  ];
  return (
    <>
      <PageHead title="Companies"><Button onClick={() => setAdding(true)}><Plus size={14} /> New company</Button></PageHead>
      <IndexTable type="company" rows={companies} columns={cols} to={(r) => `/crm/company/${r.id}`} empty="No companies yet." filters={[{ key: 'industry', label: 'Industry', kind: 'select', get: (r) => r.industry }, { key: 'location', label: 'Location', kind: 'select', get: (r) => r.location }]} />
      {adding && <RecordForm type="company" onClose={() => setAdding(false)} />}
    </>
  );
}

function DealCard({ deal, today }) {
  const names = useNames();
  const risk = dealRisk(deal, today);
  return (
    <Link to={`/crm/deal/${deal.id}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/deal', deal.id)} className="focus-ring block rounded-xl border border-line bg-surface p-2.5 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md">
      <p className="truncate text-sm font-bold">{deal.name}</p>
      <p className="text-xs text-muted">{names.company(deal.companyId) ?? 'No company'} · {firstName(deal.ownerId)}</p>
      <p className="mt-1 flex items-center justify-between text-xs"><b className="tabular-nums">{money(deal.amount)}</b><RiskBadge risk={risk} /></p>
      {deal.nextAction && <p className="mt-1 truncate text-[11px] text-muted">Next: {deal.nextAction.title} · {deal.nextAction.due}</p>}
    </Link>
  );
}

export function DealsPage() {
  const { deals, companies, today } = useCrm();
  const names = useNames();
  const [view, setView] = useState('board');
  const { me } = useCrm();
  const moveDealTo = (deal, stage) => {
    const r = moveStage(deal, stage, nowIso());
    if (r.error) return toast({ title: r.error });
    if (r.deal === deal) return;
    saveRecord('deal', r.deal);
    logActivity({ type: 'stage', subject: `Stage: ${stageOf(deal.stage)?.label} to ${stageOf(stage)?.label}`, fromStage: deal.stage, toStage: stage, dealId: deal.id, companyId: deal.companyId, ownerId: me });
  };
  const [adding, setAdding] = useState(false);
  const cols = [
    { key: 'name', label: 'Deal', get: (r) => r.name },
    { key: 'company', label: 'Company', get: (r) => names.company(r.companyId) },
    { key: 'amount', label: 'Amount', get: (r) => r.amount, render: (r) => money(r.amount) },
    { key: 'stage', label: 'Stage', get: (r) => stageOf(r.stage)?.label },
    { key: 'close', label: 'Close date', get: (r) => r.closeDate },
    { key: 'next', label: 'Next action', get: (r) => r.nextAction?.due, render: (r) => (r.nextAction ? `${r.nextAction.title} (${r.nextAction.due})` : '·') },
    { key: 'risk', label: 'Health', get: (r) => dealRisk(r, today).score, sort: (r) => -dealRisk(r, today).score, render: (r) => <RiskBadge risk={dealRisk(r, today)} /> },
    { key: 'owner', label: 'Owner', get: (r) => firstName(r.ownerId) },
  ];
  return (
    <>
      <PageHead title="Deals">
        <div className="flex rounded-full border border-line p-0.5" role="group" aria-label="View">
          {[['board', LayoutGrid, 'Board'], ['table', Table2, 'Table']].map(([id, Icon, label]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)} className={cx('focus-ring flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', view === id ? 'bg-accent-soft text-accent-ink' : 'text-muted')}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setAdding(true)}><Plus size={14} /> New deal</Button>
      </PageHead>
      {view === 'table' ? (
        <IndexTable type="deal" rows={deals} columns={cols} to={(r) => `/crm/deal/${r.id}`} empty="No deals yet." filters={[{ key: 'stage', label: 'Stage', kind: 'select', get: (r) => r.stage, show: (v) => stageOf(v)?.label }, { key: 'source', label: 'Source', kind: 'select', get: (r) => r.source }, { key: 'industry', label: 'Industry', kind: 'select', get: (r) => companies.find((c) => c.id === r.companyId)?.industry }, { key: 'risk', label: 'Health', kind: 'select', get: (r) => dealRisk(r, today).level }, { key: 'amount', label: 'Value', kind: 'number', get: (r) => r.amount }, { key: 'close', label: 'Close', kind: 'date', get: (r) => r.closeDate }]} bulk={[{ key: 'stage', label: 'Stage', options: STAGES.map((st) => ({ value: st.id, label: st.label })) }]} />
      ) : (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-6" data-testid="deal-board">
          {STAGES.map((s) => {
            const list = deals.filter((d) => d.stage === s.id && d.status !== 'nurture');
            return (
              <section
                key={s.id}
                aria-label={s.label}
                data-stage={s.id}
                className="min-w-[14rem] rounded-xl bg-surface-2 p-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const deal = deals.find((d) => d.id === e.dataTransfer.getData('text/deal'));
                  if (deal) moveDealTo(deal, s.id);
                }}
              >
                <h2 className="mb-2 flex justify-between px-1 text-xs font-bold">{s.label}<span className="font-normal text-muted">{list.length} · {money(list.reduce((t, d) => t + (d.amount ?? 0), 0))} · {Math.round(s.prob * 100)}%</span></h2>
                <div className="space-y-2">{list.map((d) => <DealCard key={d.id} deal={d} today={today} />)}</div>
              </section>
            );
          })}
        </div>
      )}
      {adding && <RecordForm type="deal" onClose={() => setAdding(false)} />}
    </>
  );
}

/** Activities across the CRM, newest first. */
export const Timeline = ({ items }) => {
  const names = useNames();
  const { deals } = useCrm();
  return (
    <ol className="space-y-2" data-testid="timeline">
      {items.map((a) => {
        const Icon = TYPE_ICON[a.type] ?? StickyNote;
        return (
          <li key={a.id} className="flex gap-2 rounded-xl border border-line p-2.5 text-sm">
            <Icon size={16} className="mt-0.5 shrink-0 text-accent-ink" />
            <div className="min-w-0">
              <p className="font-semibold">{a.subject}{a.outcome && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold">{a.outcome.replace('_', ' ')}</span>}</p>
              {a.notes && <p className="text-muted">{a.notes}</p>}
              <p className="text-[11px] text-muted">{firstName(a.ownerId)} · {a.at.slice(0, 10)}{a.dealId && ` · ${deals.find((d) => d.id === a.dealId)?.name ?? ''}`}{a.contactId && names.contact(a.contactId) ? ` · ${names.contact(a.contactId)}` : ''}</p>
            </div>
          </li>
        );
      })}
      {!items.length && <li className="text-sm text-muted">No activity yet.</li>}
    </ol>
  );
};

export function ActivitiesPage() {
  const { activities } = useCrm();
  const [type, setType] = useState('');
  const items = activities.filter((a) => !type || a.type === type).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHead title="Activities & Meetings">
        <select aria-label="Activity type" className={cx(FIELD, 'w-auto')} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {['call', 'email', 'meeting', 'note', 'task', 'stage'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </PageHead>
      <Timeline items={items} />
    </>
  );
}

const LinkedList = ({ title, items }) => (
  <div>
    <p className="mb-1 text-xs font-bold text-muted">{title} ({items.length})</p>
    <div className="space-y-1.5">
      {items.map((i) => (
        <Link key={i.id} to={i.to} className="focus-ring block rounded-xl border border-line bg-surface px-2.5 py-1.5 text-sm hover:bg-surface-2">
          <span className="font-semibold">{i.name}</span>{i.sub && <span className="block text-xs text-muted">{i.sub}</span>}
        </Link>
      ))}
      {!items.length && <p className="text-xs text-muted">None linked.</p>}
    </div>
  </div>
);

/** Record page for a company, contact or deal: properties on the left, activity in the centre, associations on the right. */
export function RecordPage() {
  const { type, id } = useParams();
  const nav = useNavigate();
  const { me, companies, contacts, deals, activities, today } = useCrm();
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [note, setNote] = useState('');
  const [actType, setActType] = useState('note');
  const rec = (type === 'company' ? companies : type === 'contact' ? contacts : deals).find((r) => r.id === id);
  if (!rec) return <p className="text-sm text-muted">That record no longer exists. <Link className="text-accent-ink underline" to="/crm">Back to CRM home</Link></p>;
  const mine = activities.filter((a) => (type === 'deal' ? a.dealId === id : type === 'contact' ? a.contactId === id : a.companyId === id)).sort((a, b) => b.at.localeCompare(a.at));
  const company = companies.find((c) => c.id === rec.companyId);
  const props = type === 'deal'
    ? [['Amount', money(rec.amount)], ['Stage', stageOf(rec.stage)?.label], ['Close date', rec.closeDate], ['Source', rec.source], ['Owner', firstName(rec.ownerId)]]
    : type === 'contact'
      ? [['Title', rec.title], ['Email', rec.email], ['Phone', rec.phone], ['Lifecycle', LIFECYCLE.find((l) => l.id === rec.lifecycle)?.label], ['Owner', firstName(rec.ownerId)]]
      : [['Domain', rec.domain], ['Industry', rec.industry], ['Size', rec.size], ['Location', rec.location], ['Owner', firstName(rec.ownerId)]];
  const log = () => {
    if (!note.trim()) return toast({ title: 'Write the note first.' });
    logActivity({ type: actType, subject: note.trim().slice(0, 80), notes: note.trim().length > 80 ? note.trim() : '', ownerId: me, dealId: type === 'deal' ? id : undefined, contactId: type === 'contact' ? id : rec.contactIds?.[0], companyId: type === 'company' ? id : rec.companyId });
    setNote('');
  };
  const remove = () => { if (window.confirm(`Delete ${rec.name}?`)) { removeRecord(type, id); nav(`/crm/${type === 'company' ? 'companies' : type === 'contact' ? 'contacts' : 'deals'}`); } };
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr_17rem]" data-testid="record-page">
      <Card className="h-fit space-y-3">
        <div>
          <p className="text-lg font-extrabold">{rec.name}</p>
          <p className="text-xs capitalize text-muted">{type}</p>
          {type === 'deal' && <div className="mt-1"><RiskBadge risk={dealRisk(rec, today)} /></div>}
        </div>
        {type === 'deal' && dealRisk(rec, today).reasons.length > 0 && (
          <ul className="list-disc pl-4 text-xs text-coral-ink" data-testid="risk-reasons">{dealRisk(rec, today).reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        )}
        <dl className="space-y-1.5 text-sm">
          {props.map(([k, v]) => <div key={k}><dt className="text-[11px] font-semibold text-muted">{k}</dt><dd>{v || '·'}</dd></div>)}
        </dl>
        <div className="flex gap-2"><Button tone="ghost" className="border border-line" onClick={() => setEditing(true)}>Edit</Button><Button tone="ghost" className="border border-line" onClick={remove}>Delete</Button></div>
      </Card>
      <div className="space-y-3">
        {type === 'deal' && (
          <Card data-testid="next-action">
            <p className="text-xs font-bold text-muted">Next action</p>
            {rec.status === 'nurture' ? (
              <p className="text-sm">In nurture, revisit on <b>{rec.revisitOn}</b></p>
            ) : rec.nextAction ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm"><b>{rec.nextAction.title}</b> · due {rec.nextAction.due}{rec.nextAction.due < today && <span className="ml-1 font-bold text-coral-ink">overdue</span>} · {firstName(rec.ownerId)}</p>
                <Button onClick={() => setCompleting(true)} data-testid="crm-open-complete"><Check size={14} /> Complete</Button>
              </div>
            ) : isOpenDeal(rec) ? <p className="text-sm text-coral-ink">No next action. Edit the deal to add one.</p> : <p className="text-sm text-muted">This deal is closed.</p>}
          </Card>
        )}
        <Card className="space-y-2">
          <p className="text-xs font-bold text-muted">Log an activity</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Type" className={cx(FIELD, 'w-auto')} value={actType} onChange={(e) => setActType(e.target.value)}>
              {['note', 'call', 'email', 'meeting', 'task'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input aria-label="Activity note" className={cx(FIELD, 'flex-1')} placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button onClick={log}>Log</Button>
          </div>
        </Card>
        <Timeline items={mine} />
      </div>
      <div className="space-y-3">
        {type === 'company' && <LinkedList title="Contacts" items={contacts.filter((c) => c.companyId === id).map((c) => ({ id: c.id, name: c.name, sub: c.title, to: `/crm/contact/${c.id}` }))} />}
        {type === 'company' && <LinkedList title="Deals" items={deals.filter((d) => d.companyId === id).map((d) => ({ id: d.id, name: d.name, sub: `${money(d.amount)} · ${stageOf(d.stage)?.label}`, to: `/crm/deal/${d.id}` }))} />}
        {type === 'contact' && <LinkedList title="Company" items={company ? [{ id: company.id, name: company.name, sub: company.industry, to: `/crm/company/${company.id}` }] : []} />}
        {type === 'contact' && <LinkedList title="Deals" items={deals.filter((d) => d.contactIds?.includes(id)).map((d) => ({ id: d.id, name: d.name, sub: `${money(d.amount)} · ${stageOf(d.stage)?.label}`, to: `/crm/deal/${d.id}` }))} />}
        {type === 'deal' && <LinkedList title="Company" items={company ? [{ id: company.id, name: company.name, sub: company.industry, to: `/crm/company/${company.id}` }] : []} />}
        {type === 'deal' && <LinkedList title="Buying contacts" items={(rec.contactIds ?? []).map((cid) => contacts.find((c) => c.id === cid)).filter(Boolean).map((c) => ({ id: c.id, name: c.name, sub: c.title, to: `/crm/contact/${c.id}` }))} />}
      </div>
      {editing && <RecordForm type={type} initial={rec} onClose={() => setEditing(false)} />}
      {completing && <CompleteActionModal deal={rec} onClose={() => setCompleting(false)} />}
    </div>
  );
}

const Queue = ({ title, deals, tone, children }) => (
  <Card className="space-y-2" data-testid={`queue-${title.toLowerCase().replace(/\W+/g, '-')}`}>
    <p className={cx('text-sm font-bold', tone)}>{title} <span className="font-normal text-muted">({deals.length})</span></p>
    {deals.map((d) => (
      <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-2.5 py-1.5 text-sm">
        <Link to={`/crm/deal/${d.id}`} className="min-w-0 font-semibold hover:underline">{d.name}<span className="block truncate text-xs font-normal text-muted">{children(d)}</span></Link>
      </div>
    ))}
    {!deals.length && <p className="text-xs text-muted">Nothing here.</p>}
  </Card>
);

/** The personal workflow page: overdue, due today, upcoming, at-risk deals, nurture revisits. */
export function MyActionsPage() {
  const { me, deals, today } = useCrm();
  const [completing, setCompleting] = useState(null);
  const q = myActions(deals, me, today);
  const action = (d) => (
    <span className="flex items-center gap-2">
      {d.nextAction.title} · {d.nextAction.due}
      <button type="button" className="focus-ring rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold text-accent-ink hover:bg-surface-2" onClick={(e) => { e.preventDefault(); setCompleting(d); }}>Complete</button>
    </span>
  );
  return (
    <>
      <PageHead title="My Actions" />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat label="Overdue" value={q.overdue.length} /><Stat label="Due today" value={q.today.length} /><Stat label="Upcoming" value={q.upcoming.length} />
        <Stat label="At-risk deals" value={q.atRisk.length} /><Stat label="Nurture revisits" value={q.nurture.length} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Queue title="Overdue" tone="text-coral-ink" deals={q.overdue}>{action}</Queue>
        <Queue title="Due today" deals={q.today}>{action}</Queue>
        <Queue title="Upcoming actions" deals={q.upcoming}>{action}</Queue>
        <Queue title="At-risk deals" deals={q.atRisk.map((x) => x.deal)}>{(d) => dealRisk(d, today).reasons.join(' · ')}</Queue>
        <Queue title="Nurture revisits" deals={q.nurture}>{(d) => `Revisit on ${d.revisitOn}`}</Queue>
        <Queue title="Deals with no next action" tone="text-coral-ink" deals={q.noAction}>{() => 'Add a next action'}</Queue>
      </div>
      {completing && <CompleteActionModal deal={completing} onClose={() => setCompleting(null)} />}
    </>
  );
}

/** Business overview and manager visibility: pipeline, forecast, risk and owner activity. */
export function HomePage() {
  const { deals, contacts, activities, today } = useCrm();
  const s = pipelineStats(deals, today.slice(0, 7));
  const risky = atRiskDeals(deals, today);
  const owners = [...new Set([...deals.map((d) => d.ownerId), ...activities.map((a) => a.ownerId)])];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const newLeads = contacts.filter((c) => c.createdAt >= weekAgo && ['prospect', 'lead'].includes(c.lifecycle)).length;
  return (
    <>
      <PageHead title="CRM Home" />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="crm-stats">
        <Stat label="Open deals" value={s.openCount} /><Stat label="Pipeline value" value={money(s.pipeline)} />
        <Stat label="Weighted forecast" value={money(s.weighted)} /><Stat label="Closing this month" value={s.closingThisMonth} />
        <Stat label="New leads (7 days)" value={newLeads} /><Stat label="Win rate" value={s.winRate == null ? 'n/a' : `${s.winRate}%`} />
        <Stat label="At-risk deals" value={risky.length} /><Stat label="No next action" value={s.noNextAction} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-bold">At-risk deals, worst first</p>
          {risky.slice(0, 8).map(({ deal, risk }) => (
            <Link key={deal.id} to={`/crm/deal/${deal.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2">
              <span className="min-w-0"><b>{deal.name}</b> · {money(deal.amount)}<span className="block truncate text-xs text-muted">{risk.reasons.join(' · ')}</span></span>
              <RiskBadge risk={risk} />
            </Link>
          ))}
          {!risky.length && <p className="text-xs text-muted">No deal is flagged.</p>}
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-bold">By owner</p>
          <table className="w-full text-sm"><thead><tr><th className={th}>Owner</th><th className={th}>Open</th><th className={th}>Overdue</th><th className={th}>No action</th><th className={th}>Activities</th></tr></thead>
            <tbody>
              {owners.map((o) => {
                const q = myActions(deals, o, today);
                return <tr key={o} className="border-t border-line"><td className={td}>{firstName(o)}</td><td className={td}>{deals.filter((d) => d.ownerId === o && isOpenDeal(d)).length}</td><td className={td}>{q.overdue.length}</td><td className={td}>{q.noAction.length}</td><td className={td}>{activities.filter((a) => a.ownerId === o).length}</td></tr>;
              })}
            </tbody>
          </table>
        </Card>
        <ConversionCard />
      </div>
    </>
  );
}

function ConversionCard() {
  const { deals, activities } = useCrm();
  return (
    <Card className="space-y-2" data-testid="conversion">
      <p className="text-sm font-bold">Stage-to-stage conversion</p>
      <table className="w-full text-sm">
        <thead><tr><th className={th}>From</th><th className={th}>To</th><th className={th}>Reached</th><th className={th}>Went on</th><th className={th}>Rate</th></tr></thead>
        <tbody>
          {stageConversion(deals, activities).map((r) => (
            <tr key={r.stage} className="border-t border-line"><td className={td}>{r.label}</td><td className={td}>{r.next}</td><td className={td}>{r.reached}</td><td className={td}>{r.advanced}</td><td className={td}>{r.rate == null ? 'n/a' : `${r.rate}%`}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

const monthName = (m) => (m === 'none' ? 'No close date' : new Date(`${m}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));

/** Reports: close-date forecast by month, closed deals by month, stage conversion and how completed actions ended. */
export function ReportsPage() {
  const { deals, activities } = useCrm();
  const close = closeDateReport(deals);
  const closed = closedByMonth(deals);
  const out = outcomeReport(activities);
  const Table = ({ head, rows, testid }) => (
    <div className="overflow-x-auto rounded-xl border border-line" data-testid={testid}>
      <table className="w-full"><thead className="bg-surface-2"><tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className={td}>{c}</td>)}</tr>)}{!rows.length && <tr><td className="px-3 py-4 text-center text-xs text-muted" colSpan={head.length}>Nothing to report yet.</td></tr>}</tbody>
      </table>
    </div>
  );
  return (
    <>
      <PageHead title="Reports & Dashboards" />
      <div className="space-y-4">
        <section><h2 className="mb-1 text-sm font-bold">Expected close dates (open deals)</h2>
          <Table testid="report-close" head={['Month', 'Deals', 'Value', 'Weighted']} rows={close.map((r) => [monthName(r.month), r.count, money(r.value), money(r.weighted)])} /></section>
        <section><h2 className="mb-1 text-sm font-bold">Closed deals by month</h2>
          <Table testid="report-closed" head={['Month', 'Won', 'Lost', 'Won value']} rows={closed.map((r) => [monthName(r.month), r.won, r.lost, money(r.wonValue)])} /></section>
        <section><h2 className="mb-1 text-sm font-bold">Stage-to-stage conversion</h2><ConversionCard /></section>
        <section><h2 className="mb-1 text-sm font-bold">How completed actions ended {out.positiveRate != null && <span className="font-normal text-muted">({out.positiveRate}% moved the deal forward)</span>}</h2>
          <Table testid="report-outcomes" head={['Outcome', 'Actions']} rows={out.counts.map((c) => [c.label, c.count])} /></section>
      </div>
    </>
  );
}

/** Sales goals for a month: one person's or the team's targets, with progress from the CRM data. */
export function GoalsPage() {
  const { me, deals, contacts, activities, goals, today } = useCrm();
  const [period, setPeriod] = useState(today.slice(0, 7));
  const [draft, setDraft] = useState({ ownerId: me, metric: 'won_value', target: '' });
  const admin = isAdminTier(PEOPLE.find((p) => p.id === me)?.role);
  const list = goals.filter((g) => g.period === period).sort((a, b) => (a.ownerId === 'team' ? -1 : b.ownerId === 'team' ? 1 : firstName(a.ownerId).localeCompare(firstName(b.ownerId))));
  const add = () => {
    const target = Number(draft.target);
    if (!(target > 0)) return toast({ title: 'Type a target above zero.' });
    if (list.some((g) => g.ownerId === draft.ownerId && g.metric === draft.metric)) return toast({ title: 'That goal already exists this month. Edit its target instead.' });
    saveRecord('goal', { ownerId: draft.ownerId, metric: draft.metric, target, period });
    setDraft((d) => ({ ...d, target: '' }));
  };
  const field = cx(FIELD, '!w-auto');
  return (
    <>
      <PageHead title="Sales Goals"><input aria-label="Month" type="month" className={field} value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} /></PageHead>
      <Card className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-muted">For
          <select aria-label="Goal for" className={cx(field, 'mt-1 block')} value={draft.ownerId} onChange={(e) => setDraft((d) => ({ ...d, ownerId: e.target.value }))} disabled={!admin}>
            {admin && <option value="team">Whole team</option>}
            {(admin ? PEOPLE : PEOPLE.filter((p) => p.id === me)).map((p) => <option key={p.id} value={p.id}>{firstName(p.id)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Measure
          <select aria-label="Goal measure" className={cx(field, 'mt-1 block')} value={draft.metric} onChange={(e) => setDraft((d) => ({ ...d, metric: e.target.value }))}>
            {GOAL_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Target
          <input aria-label="Goal target" type="number" min={0} className={cx(field, 'mt-1 block w-32')} value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} />
        </label>
        <Button onClick={add} data-testid="goal-add"><Plus size={14} /> Add goal</Button>
      </Card>
      <div className="space-y-2" data-testid="goals">
        {list.map((g) => {
          const pr = goalProgress(g, { deals, contacts, activities });
          const m = GOAL_METRICS.find((x) => x.id === g.metric);
          const can = admin || g.ownerId === me;
          return (
            <Card key={g.id} className="!p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><b>{g.ownerId === 'team' ? 'Whole team' : firstName(g.ownerId)}</b> · {m?.label}</span>
                <span className="flex items-center gap-2">
                  <b className="tabular-nums">{m?.money ? money(pr.value) : pr.value} / {m?.money ? money(g.target) : g.target} ({pr.pct ?? 0}%)</b>
                  {can && <button type="button" className="focus-ring text-xs text-muted underline" onClick={() => { const t = Number(window.prompt('New target', String(g.target))); if (t > 0) saveRecord('goal', { ...g, target: t }); }}>Edit</button>}
                  {can && <button type="button" className="focus-ring text-xs text-muted underline" onClick={() => window.confirm('Delete this goal?') && removeRecord('goal', g.id)}>Delete</button>}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className={cx('h-full rounded-full', pr.pct >= 100 ? 'bg-mint-ink' : 'bg-accent')} style={{ width: `${Math.min(100, pr.pct ?? 0)}%` }} /></div>
            </Card>
          );
        })}
        {!list.length && <p className="text-sm text-muted">No goals for this month yet.</p>}
      </div>
    </>
  );
}

/** Pipeline by stage: value, probability and the weighted forecast. */
export function ForecastPage() {
  const { deals, today } = useCrm();
  const s = pipelineStats(deals, today.slice(0, 7));
  return (
    <>
      <PageHead title="Pipeline & Forecast" />
      <p className="mb-2 text-xs text-muted">Weighted forecast = deal amount x the probability of its stage. Deals in nurture are not counted.</p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full" data-testid="forecast-table">
          <thead className="bg-surface-2"><tr>{['Stage', 'Probability', 'Deals', 'Value', 'Weighted'].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {OPEN_STAGES.map((st) => {
              const list = deals.filter((d) => d.stage === st.id && isOpenDeal(d));
              const v = list.reduce((t, d) => t + (d.amount ?? 0), 0);
              return <tr key={st.id} className="border-t border-line"><td className={td}>{st.label}</td><td className={td}>{Math.round(st.prob * 100)}%</td><td className={td}>{list.length}</td><td className={td}>{money(v)}</td><td className={td}>{money(Math.round(v * st.prob))}</td></tr>;
            })}
            <tr className="border-t-2 border-line font-bold"><td className={td}>Total</td><td className={td} /><td className={td}>{s.openCount}</td><td className={td}>{money(s.pipeline)}</td><td className={td}>{money(s.weighted)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Data management: likely duplicate contacts and companies, so a record keeps one identity. */
export function DataPage() {
  const { companies, contacts } = useCrm();
  const group = (list, key) => {
    const m = new Map();
    list.forEach((r) => { const k = key(r); if (k) m.set(k, [...(m.get(k) ?? []), r]); });
    return [...m.values()].filter((g) => g.length > 1);
  };
  const dupContacts = group(contacts, (c) => c.email?.trim().toLowerCase() || '');
  const dupCompanies = group(companies, (c) => c.domain?.trim().toLowerCase() || c.name.trim().toLowerCase());
  const Block = ({ title, groups, type }) => (
    <Card className="space-y-2" data-testid={`dups-${type}`}>
      <p className="text-sm font-bold">{title} ({groups.length})</p>
      {groups.map((g) => (
        <div key={g[0].id} className="rounded-xl border border-line p-2 text-sm">
          {g.map((r, i) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <Link to={`/crm/${type}/${r.id}`} className="hover:underline">{r.name} {r.email || r.domain}</Link>
              {i > 0 && <button type="button" className="focus-ring rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold" onClick={() => window.confirm(`Delete the duplicate ${r.name}?`) && removeRecord(type, r.id)}>Delete duplicate</button>}
            </div>
          ))}
        </div>
      ))}
      {!groups.length && <p className="text-xs text-muted">No duplicates found.</p>}
    </Card>
  );
  return (
    <>
      <PageHead title="Data management" />
      <div className="grid gap-3 md:grid-cols-2"><Block title="Duplicate contacts (same email)" groups={dupContacts} type="contact" /><Block title="Duplicate companies (same domain or name)" groups={dupCompanies} type="company" /></div>
    </>
  );
}
