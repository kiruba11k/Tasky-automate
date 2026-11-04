// Pure CRM rules: stages, forecast, deal health, My Actions queues and what completing an action asks for. No UI, no store.
import { addDays } from '../lib/dates.js';

/** Deal stages with the probability a deal at that stage closes (the weighted forecast uses it). */
export const STAGES = [
  { id: 'qualified', label: 'Qualified', prob: 0.1 },
  { id: 'meeting', label: 'Meeting booked', prob: 0.25 },
  { id: 'proposal', label: 'Proposal sent', prob: 0.5 },
  { id: 'negotiation', label: 'Negotiation', prob: 0.75 },
  { id: 'won', label: 'Closed won', prob: 1 },
  { id: 'lost', label: 'Closed lost', prob: 0 },
];
const DEFAULT_PROB = Object.fromEntries(STAGES.map((s) => [s.id, s.prob]));
/** The settings a new CRM starts with: stage probabilities, days before a deal counts as stalled in each stage, and days of silence before a deal counts as quiet. */
export const DEFAULT_CONFIG = { prob: { qualified: 0.1, meeting: 0.25, proposal: 0.5, negotiation: 0.75 }, stall: { qualified: 21, meeting: 14, proposal: 14, negotiation: 21 }, quietDays: 14 };
let quiet = DEFAULT_CONFIG.quietDays;
export const STALL_DAYS = { ...DEFAULT_CONFIG.stall };
/** Applies the shared settings (or the defaults when there are none) to the stage probabilities and risk limits. */
export function applyConfig(cfg) {
  const c = { prob: { ...DEFAULT_CONFIG.prob, ...cfg?.prob }, stall: { ...DEFAULT_CONFIG.stall, ...cfg?.stall }, quietDays: cfg?.quietDays ?? DEFAULT_CONFIG.quietDays };
  STAGES.forEach((s) => { if (s.id in c.prob) s.prob = c.prob[s.id]; else s.prob = DEFAULT_PROB[s.id]; });
  Object.assign(STALL_DAYS, c.stall);
  quiet = c.quietDays;
}
export const OPEN_STAGES = STAGES.filter((s) => s.prob > 0 && s.prob < 1);
export const LIFECYCLE = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'lead', label: 'Qualified lead' },
  { id: 'customer', label: 'Customer' },
  { id: 'nurture', label: 'Nurture' },
];
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'note', 'task', 'stage'];

/** What can happen when an action is completed, and the next step each outcome suggests: { title, days } (null = nothing to schedule). */
export const OUTCOMES = [
  { id: 'connected', label: 'Connected', next: { title: 'Follow up on the conversation', days: 3 } },
  { id: 'no_response', label: 'No response', next: { title: 'Try again', days: 2 } },
  { id: 'meeting_booked', label: 'Meeting booked', next: { title: 'Prepare for the meeting', days: 1 }, stage: 'meeting' },
  { id: 'proposal_requested', label: 'Proposal requested', next: { title: 'Send the proposal', days: 2 }, stage: 'proposal' },
  { id: 'not_interested', label: 'Not interested', next: null, closes: 'lost' },
  { id: 'nurture', label: 'Move to nurture', next: null, nurture: true },
];
export const outcomeOf = (id) => OUTCOMES.find((o) => o.id === id);
export const stageOf = (id) => STAGES.find((s) => s.id === id);
export const isOpenDeal = (deal) => deal.status !== 'nurture' && !['won', 'lost'].includes(deal.stage);


/** Why a deal cannot be saved as it is, or null. An open deal needs an owner and a meaningful next action with a date. */
export function dealProblem(deal) {
  if (!deal.name?.trim()) return 'Give the deal a name.';
  if (!deal.ownerId) return 'Every deal needs an owner.';
  if (isOpenDeal(deal)) {
    if (!deal.nextAction?.title?.trim()) return 'An open deal needs a next action.';
    if (!deal.nextAction?.due) return 'Give the next action a due date.';
  }
  if (deal.status === 'nurture' && !deal.revisitOn) return 'Pick the date to revisit this deal.';
  return null;
}

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/**
 * How risky an open deal is, with a reason for every flag: { level: 'high'|'medium'|'low', reasons: [..], score }.
 * Signals: no next action, next action overdue, close date passed, close date pushed repeatedly, quiet for a while; a bigger deal weighs more.
 */
export function dealRisk(deal, today, quietDays = quiet) {
  if (!isOpenDeal(deal)) return { level: 'low', reasons: [], score: 0 };
  const reasons = [];
  let score = 0;
  const na = deal.nextAction;
  if (!na?.title) { reasons.push('No next action'); score += 3; }
  else if (na.due && na.due < today) { reasons.push(`Next action ${daysBetween(na.due, today)} day(s) overdue`); score += 2; }
  if (deal.closeDate && deal.closeDate < today) { reasons.push('Expected close date has passed'); score += 3; }
  if ((deal.closeDateChanges ?? 0) >= 2) { reasons.push(`Close date pushed ${deal.closeDateChanges} times`); score += 2; }
  const last = deal.lastActivityAt?.slice(0, 10) ?? deal.createdAt?.slice(0, 10);
  if (last && daysBetween(last, today) >= quietDays) { reasons.push(`No activity for ${daysBetween(last, today)} days`); score += 2; }
  const since = deal.stageSince?.slice(0, 10);
  if (since && STALL_DAYS[deal.stage] && daysBetween(since, today) >= STALL_DAYS[deal.stage]) { reasons.push(`Stalled in ${stageOf(deal.stage).label} for ${daysBetween(since, today)} days`); score += 2; }
  if (reasons.length && (deal.amount ?? 0) >= 50000) score += 1; // a big deal is riskier to lose
  return { level: score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low', reasons, score };
}

/** Open deals with a risk flag, worst first, bigger deals first within the same score. */
export function atRiskDeals(deals, today) {
  return deals
    .map((deal) => ({ deal, risk: dealRisk(deal, today) }))
    .filter((x) => x.risk.level !== 'low')
    .sort((a, b) => b.risk.score - a.risk.score || (b.deal.amount ?? 0) - (a.deal.amount ?? 0));
}

/** Pipeline value (open deals), weighted forecast (amount x stage probability) and the deals expected to close in `month` (YYYY-MM). */
export function pipelineStats(deals, month) {
  const open = deals.filter(isOpenDeal);
  const weighted = open.reduce((t, d) => t + (d.amount ?? 0) * (stageOf(d.stage)?.prob ?? 0), 0);
  return {
    openCount: open.length,
    pipeline: open.reduce((t, d) => t + (d.amount ?? 0), 0),
    weighted: Math.round(weighted),
    closingThisMonth: open.filter((d) => d.closeDate?.startsWith(month)).length,
    noNextAction: open.filter((d) => !d.nextAction?.title).length,
    won: deals.filter((d) => d.stage === 'won').length,
    lost: deals.filter((d) => d.stage === 'lost').length,
    winRate: deals.filter((d) => ['won', 'lost'].includes(d.stage)).length
      ? Math.round((100 * deals.filter((d) => d.stage === 'won').length) / deals.filter((d) => ['won', 'lost'].includes(d.stage)).length)
      : null,
  };
}

/** One person's My Actions queues: next actions of their open deals (overdue / due today / upcoming), their at-risk deals and the nurture revisits that are due. */
export function myActions(deals, me, today) {
  const mine = deals.filter((d) => d.ownerId === me);
  const withAction = mine.filter((d) => isOpenDeal(d) && d.nextAction?.due);
  const by = (pred) => withAction.filter((d) => pred(d.nextAction.due)).sort((a, b) => a.nextAction.due.localeCompare(b.nextAction.due));
  return {
    overdue: by((due) => due < today),
    today: by((due) => due === today),
    upcoming: by((due) => due > today),
    atRisk: atRiskDeals(mine, today),
    nurture: mine.filter((d) => d.status === 'nurture' && d.revisitOn).sort((a, b) => a.revisitOn.localeCompare(b.revisitOn)),
    noAction: mine.filter((d) => isOpenDeal(d) && !d.nextAction?.title),
  };
}

/**
 * The changes to a deal when its next action is completed with an outcome: the closed action becomes an activity,
 * the outcome moves the stage / closes / parks the deal, and the new next action (typed, or the outcome's suggestion) takes its place.
 * Returns { deal, activity } or { error }.
 */
export function completeAction(deal, { outcomeId, note, next, revisitOn }, { today, now, activityId, me }) {
  const outcome = outcomeOf(outcomeId);
  if (!outcome) return { error: 'Pick what happened.' };
  const prevAction = deal.nextAction;
  let updated = { ...deal, lastActivityAt: now, nextAction: null };
  if (outcome.stage) updated.stage = outcome.stage;
  if (outcome.closes) { updated.stage = outcome.closes; updated.closedAt = now; }
  if (outcome.nurture) {
    if (!revisitOn) return { error: 'Pick the date to revisit.' };
    updated = { ...updated, status: 'nurture', revisitOn };
  } else if (!outcome.closes) {
    const suggested = outcome.next ? { title: outcome.next.title, due: addDays(today, outcome.next.days) } : null;
    const chosen = next?.title?.trim() ? { title: next.title.trim(), due: next.due || addDays(today, 1), type: next.type } : suggested;
    if (!chosen) return { error: 'Set the next action.' };
    updated.nextAction = chosen;
    if (updated.status === 'nurture') updated = { ...updated, status: 'open', revisitOn: undefined };
  }
  const activity = {
    id: activityId,
    type: prevAction?.type && ACTIVITY_TYPES.includes(prevAction.type) ? prevAction.type : 'task',
    subject: prevAction?.title || 'Action completed',
    notes: note?.trim() || '',
    outcome: outcomeId,
    at: now,
    ownerId: me,
    dealId: deal.id,
    companyId: deal.companyId,
    contactId: deal.contactIds?.[0],
  };
  return { deal: updated, activity };
}

/** Moves a deal to another stage (dragging on the board). Closing needs nothing more; reopening a closed deal needs a next action. Returns { deal } or { error }. */
export function moveStage(deal, stageId, now) {
  if (!stageOf(stageId)) return { error: 'Unknown stage.' };
  if (deal.stage === stageId) return { deal };
  const closing = ['won', 'lost'].includes(stageId);
  const updated = { ...deal, stage: stageId, lastActivityAt: now };
  if (closing) { updated.closedAt = now; updated.status = 'open'; } else { delete updated.closedAt; }
  if (!closing && deal.status !== 'nurture' && !deal.nextAction?.title) return { error: 'Add a next action to the deal before reopening it.' };
  return { deal: updated };
}

/**
 * The lifecycle rules: a prospect is qualified into a lead, a deal is opened only for qualified leads (or customers), and a won deal turns its buying contacts into customers.
 * Why a deal cannot be opened for these contacts, or null.
 */
export function dealContactProblem(contacts) {
  const prospect = contacts.find((c) => c && c.lifecycle === 'prospect');
  return prospect ? `Qualify ${prospect.name} as a lead before opening a deal.` : null;
}
/** The lifecycle a contact has after its deal changes: won makes a customer, anything else leaves it. */
export const lifecycleAfterDeal = (contact, deal) => (deal.stage === 'won' && contact.lifecycle !== 'customer' ? 'customer' : contact.lifecycle);
