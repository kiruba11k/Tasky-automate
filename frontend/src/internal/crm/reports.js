// Pure CRM reports: stage-to-stage conversion, close-date forecast by month, and what the completed actions led to.
import { isOpenDeal, stageOf, OUTCOMES } from './crmLogic.js';

const ORDER = ['qualified', 'meeting', 'proposal', 'negotiation', 'won'];
const rank = (id) => ORDER.indexOf(id);

/** The stages a deal has been in: where it is now (and everything before it when it won), plus every stage recorded in its history. */
export function stagesReached(deal, activities) {
  const set = new Set(activities.filter((a) => a.dealId === deal.id && a.type === 'stage').flatMap((a) => [a.fromStage, a.toStage]).filter(Boolean));
  if (deal.stage === 'won') ORDER.forEach((s) => set.add(s));
  else if (rank(deal.stage) >= 0) ORDER.slice(0, rank(deal.stage) + 1).forEach((s) => set.add(s));
  return set;
}

/** For each step of the pipeline: how many deals reached it, how many went on to the next, and that rate. Lost deals count as having reached the stages they passed through. */
export function stageConversion(deals, activities) {
  const reached = deals.map((d) => stagesReached(d, activities));
  return ORDER.slice(0, -1).map((id, i) => {
    const here = reached.filter((r) => r.has(id)).length;
    const next = reached.filter((r) => r.has(id) && r.has(ORDER[i + 1])).length;
    return { stage: id, label: stageOf(id).label, next: stageOf(ORDER[i + 1]).label, reached: here, advanced: next, rate: here ? Math.round((100 * next) / here) : null };
  });
}

/** Open deals grouped by expected close month (YYYY-MM): count, value and weighted value; deals with no date are listed under 'none'. Sorted by month. */
export function closeDateReport(deals) {
  const m = new Map();
  deals.filter(isOpenDeal).forEach((d) => {
    const key = d.closeDate?.slice(0, 7) || 'none';
    const row = m.get(key) ?? { month: key, count: 0, value: 0, weighted: 0 };
    row.count += 1;
    row.value += d.amount ?? 0;
    row.weighted += Math.round((d.amount ?? 0) * (stageOf(d.stage)?.prob ?? 0));
    m.set(key, row);
  });
  return [...m.values()].sort((a, b) => (a.month === 'none' ? 1 : b.month === 'none' ? -1 : a.month.localeCompare(b.month)));
}

/** Closed deals by month closed: won / lost counts and won value. */
export function closedByMonth(deals) {
  const m = new Map();
  deals.filter((d) => ['won', 'lost'].includes(d.stage) && d.closedAt).forEach((d) => {
    const key = d.closedAt.slice(0, 7);
    const row = m.get(key) ?? { month: key, won: 0, lost: 0, wonValue: 0 };
    if (d.stage === 'won') { row.won += 1; row.wonValue += d.amount ?? 0; } else row.lost += 1;
    m.set(key, row);
  });
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** How completed actions ended: a count per outcome, and the share that moved the deal forward (connected, meeting booked, proposal requested). */
export function outcomeReport(activities) {
  const done = activities.filter((a) => a.outcome);
  const counts = OUTCOMES.map((o) => ({ id: o.id, label: o.label, count: done.filter((a) => a.outcome === o.id).length }));
  const positive = done.filter((a) => ['connected', 'meeting_booked', 'proposal_requested'].includes(a.outcome)).length;
  return { counts, total: done.length, positiveRate: done.length ? Math.round((100 * positive) / done.length) : null };
}

export const GOAL_METRICS = [
  { id: 'won_value', label: 'Won revenue', money: true },
  { id: 'won_count', label: 'Deals won' },
  { id: 'new_leads', label: 'New leads' },
  { id: 'activities', label: 'Activities logged' },
];

/**
 * How far a goal has got: { value, target, pct }. A goal belongs to one person or to 'team' (everyone); `period` is YYYY-MM.
 * Revenue and deals won count by the month the deal closed, new leads by the month the contact was created, activities by their date.
 */
export function goalProgress(goal, { deals, contacts, activities }) {
  const mine = (r) => goal.ownerId === 'team' || r.ownerId === goal.ownerId;
  const inMonth = (iso) => !!iso && iso.startsWith(goal.period);
  let value = 0;
  if (goal.metric === 'won_value') value = deals.filter((d) => mine(d) && d.stage === 'won' && inMonth(d.closedAt)).reduce((t, d) => t + (d.amount ?? 0), 0);
  else if (goal.metric === 'won_count') value = deals.filter((d) => mine(d) && d.stage === 'won' && inMonth(d.closedAt)).length;
  else if (goal.metric === 'new_leads') value = contacts.filter((c) => mine(c) && inMonth(c.createdAt) && ['prospect', 'lead'].includes(c.lifecycle)).length;
  else if (goal.metric === 'activities') value = activities.filter((a) => mine(a) && a.type !== 'stage' && inMonth(a.at)).length;
  return { value, target: goal.target, pct: goal.target > 0 ? Math.round((100 * value) / goal.target) : null };
}
