import { useStore } from '../store.js';
import { newId } from '../lib/domain.js';
import { lifecycleAfterDeal } from './crmLogic.js';
import { todayKey } from '../lib/dates.js';

const NAME = { company: 'crmCompanies', contact: 'crmContacts', deal: 'crmDeals', activity: 'crmActivities', goal: 'crmGoals' };
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
export const removeRecord = (type, id) => useStore.setState((s) => ({ [NAME[type]]: s[NAME[type]].filter((r) => r.id !== id) }));

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
  return { me: s.me, companies: s.crmCompanies, contacts: s.crmContacts, deals: s.crmDeals, activities: s.crmActivities, goals: s.crmGoals, today: todayKey() };
};
export const money = (n) => (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
