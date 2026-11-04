import { useState } from 'react';
import { Qe as PEOPLE, Ya as Modal, Te as Button, be as firstName, oe as cx } from '@/internal/min';
import { toast } from '../kit/toast.js';
import { OPEN_STAGES, STAGES, LIFECYCLE, OUTCOMES, ACTIVITY_TYPES, dealProblem, dealContactProblem, findDuplicate, completeAction, outcomeOf, stageOf } from './crmLogic.js';
import { saveRecord, logActivity, nowIso, useCrm } from './crmStore.js';
import { newId } from '../lib/domain.js';

export const FIELD = 'focus-ring w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink';
export const Label = ({ text, children }) => (
  <label className="block text-xs font-semibold text-muted">
    {text}
    <span className="mt-1 block font-normal text-ink">{children}</span>
  </label>
);
export const OwnerSelect = ({ value, onChange, ...rest }) => (
  <select aria-label="Owner" className={FIELD} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
    {PEOPLE.map((p) => <option key={p.id} value={p.id}>{firstName(p.id)}</option>)}
  </select>
);

/** Add / edit one company, contact or deal. `initial` fills it in (and carries the id when editing). */
export function RecordForm({ type, initial = {}, onClose, onSaved }) {
  const { me, companies, contacts, today } = useCrm();
  const [d, setD] = useState(() => ({
    ownerId: me,
    ...(type === 'deal' ? { stage: 'qualified', nextAction: { title: '', due: today, type: 'call' } } : {}),
    ...(type === 'contact' ? { lifecycle: 'prospect' } : {}),
    ...initial,
  }));
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const save = () => {
    const rec = { ...d, amount: d.amount === '' || d.amount == null ? undefined : Number(d.amount) };
    if (type === 'deal') {
      const prev = initial.id ? initial : null;
      if (prev && prev.closeDate && rec.closeDate !== prev.closeDate) rec.closeDateChanges = (prev.closeDateChanges ?? 0) + 1;
      const why = dealProblem(rec) || (!initial.id ? dealContactProblem((rec.contactIds ?? []).map((id) => contacts.find((c) => c.id === id))) : null);
      if (why) return toast({ title: why });
    } else {
      if (!rec.name?.trim()) return toast({ title: 'Give it a name.' });
      const dup = !initial.id ? findDuplicate(type, rec, type === 'contact' ? contacts : companies) : undefined;
      if (dup) return toast({ title: `${dup.name} already exists with the same ${type === 'contact' ? 'email' : 'domain or name'}. Open it instead of adding a duplicate.` });
    }
    const saved = saveRecord(type, rec);
    onSaved?.(saved);
    onClose();
  };
  const title = `${initial.id ? 'Edit' : 'New'} ${type}`;
  return (
    <Modal open onClose={onClose} title={title} size="md">
      <div className="crm-form">
        <Label text={type === 'deal' ? 'Deal name' : 'Name'}><input aria-label="Name" className={FIELD} value={d.name ?? ''} onChange={(e) => set({ name: e.target.value })} /></Label>
        <Label text="Owner"><OwnerSelect value={d.ownerId} onChange={(v) => set({ ownerId: v })} /></Label>
        {type === 'company' && (<>
          <Label text="Domain"><input aria-label="Domain" className={FIELD} value={d.domain ?? ''} onChange={(e) => set({ domain: e.target.value })} /></Label>
          <Label text="Industry"><input aria-label="Industry" className={FIELD} value={d.industry ?? ''} onChange={(e) => set({ industry: e.target.value })} /></Label>
          <Label text="Size"><input aria-label="Size" className={FIELD} value={d.size ?? ''} onChange={(e) => set({ size: e.target.value })} /></Label>
          <Label text="Location"><input aria-label="Location" className={FIELD} value={d.location ?? ''} onChange={(e) => set({ location: e.target.value })} /></Label>
        </>)}
        {type === 'contact' && (<>
          <Label text="Job title"><input aria-label="Job title" className={FIELD} value={d.title ?? ''} onChange={(e) => set({ title: e.target.value })} /></Label>
          <Label text="Email"><input aria-label="Email" type="email" className={FIELD} value={d.email ?? ''} onChange={(e) => set({ email: e.target.value })} /></Label>
          <Label text="Phone"><input aria-label="Phone" className={FIELD} value={d.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></Label>
          <Label text="Lifecycle stage">
            <select aria-label="Lifecycle stage" className={FIELD} value={d.lifecycle} onChange={(e) => set({ lifecycle: e.target.value })}>
              {LIFECYCLE.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </Label>
          <Label text="Company">
            <select aria-label="Company" className={FIELD} value={d.companyId ?? ''} onChange={(e) => set({ companyId: e.target.value || undefined })}>
              <option value="">None</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Label>
        </>)}
        {type === 'deal' && (<>
          <Label text="Amount"><input aria-label="Amount" type="number" min={0} className={FIELD} value={d.amount ?? ''} onChange={(e) => set({ amount: e.target.value })} /></Label>
          <Label text="Stage">
            <select aria-label="Stage" className={FIELD} value={d.stage} onChange={(e) => set({ stage: e.target.value })}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Label>
          <Label text="Expected close date"><input aria-label="Close date" type="date" className={FIELD} value={d.closeDate ?? ''} onChange={(e) => set({ closeDate: e.target.value })} /></Label>
          <Label text="Source"><input aria-label="Source" className={FIELD} value={d.source ?? ''} onChange={(e) => set({ source: e.target.value })} /></Label>
          <Label text="Company">
            <select aria-label="Company" className={FIELD} value={d.companyId ?? ''} onChange={(e) => set({ companyId: e.target.value || undefined })}>
              <option value="">None</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Label>
          <Label text="Buying contact">
            <select aria-label="Contact" className={FIELD} value={d.contactIds?.[0] ?? ''} onChange={(e) => set({ contactIds: e.target.value ? [e.target.value] : [] })}>
              <option value="">None</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Label>
          {!['won', 'lost'].includes(d.stage) && (
            <fieldset className="rounded-xl border border-line p-3 crm-span2">
              <legend className="px-1 text-xs font-semibold text-muted">Next action (required while the deal is open)</legend>
              <div className="crm-row3">
                <input aria-label="Next action" className={FIELD} placeholder="e.g. Call to confirm budget" value={d.nextAction?.title ?? ''} onChange={(e) => set({ nextAction: { ...d.nextAction, title: e.target.value } })} />
                <select aria-label="Action type" className={FIELD} value={d.nextAction?.type ?? 'call'} onChange={(e) => set({ nextAction: { ...d.nextAction, type: e.target.value } })}>
                  {ACTIVITY_TYPES.filter((t) => !['stage', 'note'].includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input aria-label="Next action due" type="date" className={FIELD} value={d.nextAction?.due ?? ''} onChange={(e) => set({ nextAction: { ...d.nextAction, due: e.target.value } })} />
              </div>
            </fieldset>
          )}
        </>)}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button tone="ghost" className="border border-line" onClick={onClose}>Cancel</Button>
        <Button onClick={save} data-testid="crm-save">Save</Button>
      </div>
    </Modal>
  );
}

/** Complete a deal's next action: what happened, a note, then the next step (suggested from the outcome). */
export function CompleteActionModal({ deal, onClose }) {
  const { me, today } = useCrm();
  const [outcomeId, setOutcomeId] = useState('');
  const [note, setNote] = useState('');
  const [next, setNext] = useState({ title: '', due: '' });
  const [revisitOn, setRevisitOn] = useState('');
  const outcome = outcomeOf(outcomeId);
  const asksNext = outcome && !outcome.closes && !outcome.nurture;
  const submit = () => {
    const r = completeAction(deal, { outcomeId, note, next, revisitOn }, { today, now: nowIso(), activityId: newId(), me });
    if (r.error) return toast({ title: r.error });
    const { deal: updated, activity } = r;
    saveRecord('deal', updated);
    logActivity(activity);
    if (deal.stage !== updated.stage) logActivity({ type: 'stage', subject: `Stage: ${stageOf(deal.stage)?.label} to ${stageOf(updated.stage)?.label}`, fromStage: deal.stage, toStage: updated.stage, dealId: deal.id, companyId: deal.companyId, ownerId: me });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={`Complete: ${deal.nextAction?.title ?? 'action'}`} size="md">
      <p className="mb-2 text-sm text-muted">{deal.name}. What happened?</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Outcome">
        {OUTCOMES.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={outcomeId === o.id} onClick={() => setOutcomeId(o.id)}
            className={cx('focus-ring rounded-full border px-3 py-1 text-xs font-semibold', outcomeId === o.id ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line hover:bg-surface-2')}>
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-3">
        <Label text="Note"><input aria-label="Note" className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was said or agreed" /></Label>
        {asksNext && (
          <div className="crm-row2">
            <Label text="Next action"><input aria-label="Next step" className={FIELD} value={next.title} placeholder={outcome.next?.title ?? 'What happens next?'} onChange={(e) => setNext((n) => ({ ...n, title: e.target.value }))} /></Label>
            <Label text="Due"><input aria-label="Next step due" type="date" className={FIELD} value={next.due} onChange={(e) => setNext((n) => ({ ...n, due: e.target.value }))} /></Label>
          </div>
        )}
        {outcome?.nurture && <Label text="Revisit on"><input aria-label="Revisit on" type="date" className={FIELD} value={revisitOn} onChange={(e) => setRevisitOn(e.target.value)} /></Label>}
        {outcome?.closes && <p className="text-xs text-muted">The deal will be closed as lost.</p>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button tone="ghost" className="border border-line" onClick={onClose}>Cancel</Button>
        <Button disabled={!outcomeId} onClick={submit} data-testid="crm-complete">Complete</Button>
      </div>
    </Modal>
  );
}
