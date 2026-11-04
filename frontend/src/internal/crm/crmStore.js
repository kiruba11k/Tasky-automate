import { useStore } from '../store.js';
import { newId } from '../lib/domain.js';
import { lifecycleAfterDeal, applyConfig } from './crmLogic.js';
import { Qe as PEOPLE } from '@/internal/min';
import { isAdminTier } from '../lib/constants.js';
import { toast } from '../kit/toast.js';
import { todayKey } from '../lib/dates.js';

const NAME = { company: 'crmCompanies', contact: 'crmContacts', deal: 'crmDeals', activity: 'crmActivities', goal: 'crmGoals', config: 'crmConfigs', view: 'crmViews' };
export const nowIso = () => new Date().toISOString();

/** Saves (adds or replaces) one CRM record; sync.js sends it to the server. */
export function saveRecord(type, rec) {
  const name = NAME[type];
  const me = useStore.getState().me;
  const before = type === 'deal' ? useStore.getState().crmDeals.find((d) => d.id === rec.id) : null;
  const full = { ownerId: me, createdAt: nowIso(), ...rec, id: rec.id ?? newId() };
  if (type === 'deal' && (!before || before.stage !== full.stage)) full.stageSince = nowIso(); // how long a deal has sat in its stage
  useStore.setState((s) => ({ [name]: s[name].some((r) => r.id === full.id) ? s[name].map((r) => (r.id === full.id ? full : r)) : [full, ...s[name]] }));
  if (type === 'deal' && full.stage === 'won') {
    // a won deal turns its buying contacts into customers
    useStore.getState().crmContacts.filter((c) => full.contactIds?.includes(c.id) && lifecycleAfterDeal(c, full) !== c.lifecycle).forEach((c) => saveRecord('contact', { ...c, lifecycle: 'customer' }));
  }
  return full;
}
/** May this person delete the record? The server allows the owner, managers and project managers; checking here lets us say so instead of failing after a delay. */
export function canRemove(type, id) {
  const s = useStore.getState();
  const rec = s[NAME[type]].find((r) => r.id === id);
  return !rec || rec.ownerId === s.me || isAdminTier(PEOPLE.find((p) => p.id === s.me)?.role);
}
export const REMOVE_DENIED = 'Only the owner, a manager or a project manager can delete this. Ask them, or change the owner first.';
/** Deletes a record when allowed; otherwise tells the person why. Returns whether it was deleted. */
export function removeRecord(type, id) {
  if (!canRemove(type, id)) { toast({ title: REMOVE_DENIED }); return false; }
  useStore.setState((s) => ({ [NAME[type]]: s[NAME[type]].filter((r) => r.id !== id) }));
  return true;
}

/** Logs an activity against a deal / contact / company and stamps the deal's last activity. */
export function logActivity(act) {
  const rec = saveRecord('activity', { at: nowIso(), type: 'note', ...act });
  if (rec.dealId) {
    const deal = useStore.getState().crmDeals.find((d) => d.id === rec.dealId);
    if (deal) saveRecord('deal', { ...deal, lastActivityAt: rec.at });
  }
  return rec;
}

export const useCrm = () => {
  const s = useStore();
  applyConfig(s.crmConfigs.find((c) => c.id === 'main')); // stage probabilities and risk limits are shared settings
  return { me: s.me, companies: s.crmCompanies, contacts: s.crmContacts, deals: s.crmDeals, activities: s.crmActivities, goals: s.crmGoals, today: todayKey() };
};
export const money = (n) => (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
