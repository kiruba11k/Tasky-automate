import { isLeadership, isApprover, approverNames } from '@/internal/lib/constants';
import React, { useState, useEffect, useMemo } from 'react';
import { Crown, ArrowRightLeft, Plus, ShieldCheck, Trash, X } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  Ya as Modal,
  vt as Avatar,
  Wo as roleOf,
  $e as dayKey,
  Dw as projectWeeks,
  Rw as DEFAULT_STANDARDS,
  lt as attempt,
  Ye as toast,
  be as firstName,
  nt as fullName,
  Qe as PEOPLE,
  qR as ROLE_GROUPS,
  Ge as INPUT_CLASS,
  _o as NUMBER_INPUT_CLASS,
  vb as SELECT_CLASS,
  Cn as TASK_TYPES,
  FP as perHourLabel,
  BP as hoursLabel,
  br as toNumber,
  XU as newRowKey,
} from '@/internal/min';
import { FormSection } from './FormSection';
import { ConfirmModal } from '../kit/ConfirmModal';
import { PersonPicker } from './PersonPicker';
import { PROJECT_TEMPLATES, DEFAULT_TEMPLATE_ID, templateOf, templateMetrics, newMetricId } from '../lib/projectTemplates.js';
import { standardMetric } from '../lib/entries.js';

const EMPTY_TASK = { name: '', unit: '', minutes: '' };
// What the standard-time boxes start with: minutes per unit of every task type.
// Prospect mapping is typed per 10 prospects and kept per prospect, so the maths elsewhere does not change.
const PER = { prospect: 10 };
const roundMin = (n) => Math.round(n * 100) / 100;
const DEFAULT_STANDARD_INPUTS = Object.fromEntries(TASK_TYPES.map((t) => [t.id, String(roundMin(t.perUnit * (PER[t.id] ?? 1)))]));
const STANDARD_HINTS = {
  prospect: 'minutes per 10 prospects',
  l1: 'minutes per personalised message (semi = ⅔, templated = ½)',
  l2: 'minutes per message',
};
const LEGACY_TYPES = ['prospect', 'l1', 'l2'];

/** Create ("Propose"/"Onboard") or edit a project. */
export function ProjectFormModal({ open, onClose, edit }) {
  const {
    me,
    proposeProject,
    updateProject,
    setProjectAdmins,
    removeProjectAdmin,
    transferProject,
    deleteProject,
  } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isManager = isApprover(me); // only approvers put a project live; everyone else sends it for approval
  const isAdmin = isLeadership(roleOf(me));
  const ownerId = edit ? edit.pmId : me;
  const canManageAdmins = !edit || edit.pmId === me || isAdmin;

  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(dayKey(0));
  const [endDate, setEndDate] = useState(dayKey(90));
  const [team, setTeam] = useState([]);
  const [standards, setStandards] = useState(DEFAULT_STANDARD_INPUTS);
  const [typesOff, setTypesOff] = useState([]);
  const [customTasks, setCustomTasks] = useState([]);
  const [newTask, setNewTask] = useState(EMPTY_TASK);
  const [admins, setAdmins] = useState([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE_ID);
  const [metrics, setMetrics] = useState(() => templateMetrics(DEFAULT_TEMPLATE_ID));
  const [newMetric, setNewMetric] = useState('');
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverMode, setHandoverMode] = useState(null);
  const [focusId, setFocusId] = useState('');
  const [defaultTargets, setDefaultTargets] = useState({});
  const [weekPlans, setWeekPlans] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setHandoverMode(null);
      setHandoverTo('');
      setNewTask(EMPTY_TASK);
      setFocusId('');
      setPendingTemplate(null);
      setNewMetric('');
      if (edit) {
        setTemplate(templateOf(edit).id);
        setMetrics((edit.metrics ?? []).map((m) => ({ ...m })));
        setName(edit.name);
        setClient(edit.client);
        setDescription(edit.description);
        setStartDate(edit.startDate);
        setEndDate(edit.endDate);
        const ids = [...new Set([...Object.keys(edit.hours), ...edit.teamIds])];
        setTeam(ids.map((id) => ({ id, h: String(edit.hours[id] ?? 0) })));
        const std = { ...DEFAULT_STANDARDS, ...edit.standards };
        setStandards({
          ...DEFAULT_STANDARD_INPUTS,
          ...Object.fromEntries(Object.entries(edit.typeMinutes ?? {}).map(([id, v]) => [id, String(v)])),
          prospect: String(roundMin(std.prospect * 10)),
          l1: String(std.l1),
          l2: String(std.l2),
        });
        setTypesOff(edit.typesOff ?? []);
        setCustomTasks(
          (edit.customStandards ?? []).map((c) => ({
            key: c.id,
            id: c.id,
            name: c.name,
            unit: c.unit,
            minutes: String(c.minutes),
            metric: c.metric ?? standardMetric(edit, c) ?? '',
          })),
        );
        setAdmins(edit.admins ?? []);
      }
    }
  }, [open, edit]);

  const weeks = useMemo(
    () =>
      startDate && endDate && endDate >= startDate
        ? projectWeeks({ startDate, endDate })
        : [],
    [startDate, endDate],
  );

  /** Fill the standard times, hidden task types and numbers from a template (the person can still change them after). */
  const applyTemplate = (id) => {
    const t = templateOf(id);
    setTemplate(t.id);
    setPendingTemplate(null);
    setStandards(DEFAULT_STANDARD_INPUTS);
    setTypesOff([...t.typesOff]);
    setCustomTasks(
      t.customStandards.map((c) => ({ key: newRowKey(), name: c.name, unit: c.unit, minutes: String(c.minutes), metric: c.metric ?? '' })),
    );
    setMetrics(templateMetrics(t.id));
    setDefaultTargets({});
    setWeekPlans({});
    setError('');
  };

  const pickTemplate = (id) => {
    if (id === template) return;
    if (edit) setPendingTemplate(id);
    else applyTemplate(id);
  };

  const addMetric = () => {
    const label = newMetric.trim();
    if (!label) return;
    if (metrics.some((m) => m.label.trim().toLowerCase() === label.toLowerCase()))
      return setError(`"${label}" is already in the list.`);
    setMetrics((list) => [...list, { id: newMetricId(), label }]);
    setNewMetric('');
    setError('');
  };

  const resetForm = () => {
    applyTemplate(DEFAULT_TEMPLATE_ID);
    setDefaultTargets({});
    setWeekPlans({});
    setName('');
    setClient('');
    setDescription('');
    setTeam([]);
    setStandards(DEFAULT_STANDARD_INPUTS);
    setTypesOff([]);
    setCustomTasks([]);
    setAdmins([]);
    setError('');
  };

  const addCustomTask = () => {
    const taskName = newTask.name.trim();
    const minutes = toNumber(newTask.minutes);
    if (!taskName) return setError('Give the custom task a name.');
    if (customTasks.some((t) => t.name.trim().toLowerCase() === taskName.toLowerCase()))
      return setError(`"${taskName}" is already in the list.`);
    if (!(minutes > 0)) return setError(`Set the minutes per unit for "${taskName}" (above 0).`);
    setCustomTasks((list) => [
      ...list,
      {
        key: newRowKey(),
        name: taskName,
        unit: newTask.unit.trim() || 'items',
        minutes: String(minutes),
      },
    ]);
    setNewTask(EMPTY_TASK);
    setError('');
  };

  /** Validate standards, hours and custom tasks; throws a readable Error. */
  const collectSettings = () => {
    const used = TASK_TYPES.filter((t) => !typesOff.includes(t.id));
    used.forEach((t) => {
      if (!(toNumber(standards[t.id]) > 0))
        throw new Error(`Set the standard time for ${t.name.toLowerCase()} (above 0 minutes), or remove it.`);
    });
    const pick = (id) => (toNumber(standards[id]) > 0 ? roundMin(toNumber(standards[id]) / (PER[id] ?? 1)) : DEFAULT_STANDARDS[id]);
    const standardsOut = { prospect: pick('prospect'), l1: pick('l1'), l2: pick('l2') };
    const typeMinutes = Object.fromEntries(
      used.filter((t) => !LEGACY_TYPES.includes(t.id)).map((t) => [t.id, roundMin(toNumber(standards[t.id]) / (PER[t.id] ?? 1))]),
    );
    const removed = [...typesOff];
    const hours = {};
    team.forEach((m) => {
      if (!m.h.trim())
        throw new Error(`Type the hours per day for ${firstName(m.id)} (for example 1.5).`);
      const v = toNumber(m.h);
      if (!Number.isFinite(v) || v < 0 || v > 12)
        throw new Error(`Hours per day for ${firstName(m.id)} must be between 0 and 12.`);
      hours[m.id] = v;
    });
    const customStandards = customTasks.map((t) => ({
      id: t.id,
      name: t.name,
      unit: t.unit,
      minutes: toNumber(t.minutes),
      ...(t.metric && metrics.some((m) => m.id === t.metric) ? { metric: t.metric } : {}),
    }));
    return { standards: standardsOut, typeMinutes, typesOff: removed, hours, customStandards, template, metrics };
  };

  const submit = () => {
    if (edit) {
      if (
        attempt(() => {
          const settings = collectSettings();
          updateProject(edit.id, {
            name: name.trim(),
            client: client.trim(),
            description: description.trim(),
            startDate,
            endDate,
            ...settings,
          });
          const unchanged =
            admins.length === edit.admins.length && admins.every((a) => edit.admins.includes(a));
          canManageAdmins && !unchanged && setProjectAdmins(edit.id, admins);
        }, setError)
      ) {
        toast({ title: 'Project details updated', tone: 'success' });
        onClose();
      }
      return;
    }
    const parseTargets = (fields, prefix) =>
      Object.fromEntries(
        Object.entries(fields)
          .filter(([, v]) => v.trim() !== '')
          .map(([k, v]) => {
            const n = toNumber(v);
            if (!Number.isFinite(n) || n < 0) throw new Error(`${prefix}: targets must be zero or more.`);
            return [k, Math.round(n)];
          }),
      );
    if (
      attempt(() => {
        const settings = collectSettings();
        const weekTarget = parseTargets(defaultTargets, 'Default weekly target');
        const plans = Object.fromEntries(
          Object.entries(weekPlans)
            .filter(([start]) => weeks.some((w) => w.start === start))
            .map(([start, fields]) => [start, { ...weekTarget, ...parseTargets(fields, 'Week plan') }]),
        );
        proposeProject({
          name,
          client,
          description,
          startDate,
          endDate,
          ...settings,
          admins,
          weekTarget: Object.keys(weekTarget).length ? weekTarget : undefined,
          weekPlans: plans,
        });
      }, setError)
    ) {
      toast({
        title: isManager ? `${name} is live 🎉` : `${name} sent to ${approverNames()} for approval`,
        tone: 'success',
      });
      resetForm();
      onClose();
    }
  };

  const stepDown = () => {
    edit &&
      attempt(() => removeProjectAdmin(edit.id, me), setError) &&
      (toast({ title: `You are no longer an admin of ${edit.name}`, tone: 'info' }), onClose());
  };

  const handOver = (mode) => {
    !edit ||
      !handoverTo ||
      (attempt(() => transferProject(edit.id, handoverTo, mode), setError) &&
        (toast({ title: `${edit.name} handed over to ${firstName(handoverTo)}`, tone: 'success' }),
        onClose()));
  };

  const handoverOptions =
    edit?.pmId === me
      ? [
          {
            mode: 'remove-me',
            label: 'Transfer and remove myself',
            effect: 'You leave the project completely.',
          },
          {
            mode: 'stay-admin',
            label: 'Transfer and stay as admin',
            effect: 'You keep admin access: targets, numbers, tasks and details.',
          },
          {
            mode: 'stay-member',
            label: 'Transfer and stay as team member',
            effect: 'You stay on the team without admin access.',
          },
        ]
      : [
          {
            mode: 'remove-me',
            label: `Transfer and remove ${firstName(ownerId)}`,
            effect: `${firstName(ownerId)} leaves the project completely.`,
          },
          {
            mode: 'stay-admin',
            label: `Transfer, ${firstName(ownerId)} stays as admin`,
            effect: `${firstName(ownerId)} keeps admin access.`,
          },
          {
            mode: 'stay-member',
            label: `Transfer, ${firstName(ownerId)} stays as team member`,
            effect: `${firstName(ownerId)} stays on the team without admin access.`,
          },
        ];
  const selectedHandover = handoverOptions.find((o) => o.mode === handoverMode);

  const updateCustomTask = (index, patch) =>
    setCustomTasks((list) => list.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  const onEnterAdd = (e) => e.key === 'Enter' && (e.preventDefault(), addCustomTask());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={edit ? 'Edit project details' : isManager ? 'Onboard a new project' : 'Propose a new project'}
      description={
        edit
          ? 'Changes apply to this project only.'
          : isManager
            ? undefined
            : `Once ${approverNames()} approves it, you own it and can assign tasks.`
      }
      size="lg"
      footer={
        <>
          {edit && (isApprover(me) || edit.pmId === me) && (
            <Button tone="ghost" className="border border-line !text-coral-ink" onClick={() => setConfirmDelete(true)}>
              <Trash size={14} /> Delete project
            </Button>
          )}
          {error && (
            <p role="alert" className="mr-auto text-sm font-semibold text-coral-ink">
              {error}
            </p>
          )}
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            {edit ? 'Save changes' : isManager ? 'Create project' : 'Send for approval'}
          </Button>
        </>
      }
    >
      <FormSection
        icon={<span>🧭</span>}
        className="mb-3"
        title="Project template"
        hint="What kind of project is this? The template decides which numbers are tracked and which standard tasks are offered. You can still change the numbers and standard times below."
      >
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Project template" data-testid="template-picker">
          {PROJECT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={template === t.id}
              data-template={t.id}
              onClick={() => pickTemplate(t.id)}
              className={clsx(
                'focus-ring rounded-xl border-2 bg-surface p-3 text-left transition',
                template === t.id ? 'border-accent bg-accent/5' : 'border-line hover:border-accent/60',
              )}
            >
              <span className="block text-sm font-bold text-ink">
                <span aria-hidden="true">{t.icon}</span> {t.name}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{t.description}</span>
            </button>
          ))}
        </div>
        {pendingTemplate && (
          <div
            role="alertdialog"
            aria-label="Confirm template change"
            className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3"
          >
            <p className="min-w-0 flex-1 text-sm text-ink">
              Switch to <b>{templateOf(pendingTemplate).name}</b>? The numbers and standard tasks below are replaced by the
              template's. Numbers already counted that are not in the new template stay saved, but are hidden. Applies when you
              save.
            </p>
            <Button type="button" tone="ghost" onClick={() => setPendingTemplate(null)}>
              Keep {templateOf(template).name}
            </Button>
            <Button type="button" onClick={() => applyTemplate(pendingTemplate)}>
              Switch template
            </Button>
          </div>
        )}
      </FormSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Project name
          <input
            className={clsx(INPUT_CLASS, 'mt-1 text-ink')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Orbit AI - EU Outbound"
          />
        </label>
        <label className="text-sm font-semibold">
          Client
          <input
            className={clsx(INPUT_CLASS, 'mt-1 text-ink')}
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="e.g. Orbit AI"
          />
        </label>
        <label className="text-sm font-semibold">
          Start date
          <input
            type="date"
            className={clsx(INPUT_CLASS, 'mt-1 text-ink')}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold">
          End date
          <input
            type="date"
            className={clsx(INPUT_CLASS, 'mt-1 text-ink')}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Description
          <textarea
            className={clsx(INPUT_CLASS, 'mt-1 text-ink')}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who are we reaching, and what does success look like?"
          />
        </label>
      </div>

      <FormSection
        icon={<span>🔢</span>}
        title="Numbers this project tracks"
        hint="These are the weekly / monthly numbers shown in the tiles, targets and daily updates. Rename, remove or add your own."
      >
        {metrics.length > 0 ? (
          <ul
            className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
            aria-label="Project numbers"
            data-testid="metrics-list"
          >
            {metrics.map((m, index) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-1.5">
                <input
                  aria-label={`Name of number ${index + 1}`}
                  className={clsx(INPUT_CLASS, 'flex-1 py-1.5 text-ink')}
                  value={m.label}
                  maxLength={60}
                  onChange={(e) => setMetrics((list) => list.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)))}
                />
                <button
                  type="button"
                  aria-label={`Remove ${m.label}`}
                  className="focus-ring rounded-lg p-2 text-muted hover:bg-coral hover:text-coral-ink"
                  onClick={() => setMetrics((list) => list.filter((_, i) => i !== index))}
                >
                  <Trash size={15} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-muted">No numbers tracked yet.</p>
        )}
        <div className="flex gap-2">
          <input
            aria-label="New number name"
            className={clsx(INPUT_CLASS, 'flex-1 text-ink')}
            placeholder="New number, e.g. Connections accepted"
            value={newMetric}
            onChange={(e) => setNewMetric(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMetric())}
          />
          <Button type="button" tone="soft" onClick={addMetric}>
            <Plus size={14} /> Add number
          </Button>
        </div>
        {edit && (
          <p className="mt-2 text-[11px] text-muted">Removing a number hides it. What was already counted stays saved.</p>
        )}
      </FormSection>

      <FormSection
        icon={<span>⏱️</span>}
        title="Standard time for this project"
        hint="Every target time and on-time % for this project is measured against these. Change any time, or remove the ones this project does not use (you can add them back)."
      >
        <ul
          className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
          aria-label="Standard times"
          data-testid="std-list"
        >
          {TASK_TYPES.filter((t) => !typesOff.includes(t.id)).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2" data-std={t.id}>
              <span className="min-w-[10rem] flex-1 text-sm font-semibold text-ink">
                {t.name}
                <span className="block text-[11px] font-normal text-muted">
                  {STANDARD_HINTS[t.id] ?? `minutes per ${t.unit.replace(/s$/, '')}`}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step={0.1}
                  aria-label={`${t.name} standard minutes`}
                  className={clsx(NUMBER_INPUT_CLASS, 'w-20 text-lg')}
                  value={standards[t.id] ?? ''}
                  onChange={(e) => setStandards({ ...standards, [t.id]: e.target.value })}
                />
                <span className="w-28 text-xs text-muted">
                  min
                  {toNumber(standards[t.id]) > 0 ? ` · ${perHourLabel(toNumber(standards[t.id]) / (PER[t.id] ?? 1))}` : ''}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${t.name}`}
                title="Not used on this project"
                className="focus-ring rounded-lg p-2 text-muted hover:bg-coral hover:text-coral-ink"
                onClick={() => setTypesOff((list) => [...list, t.id])}
              >
                <Trash size={15} />
              </button>
            </li>
          ))}
        </ul>
        {typesOff.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">Removed from this project:</span>
            {typesOff.map((id) => {
              const t = TASK_TYPES.find((x) => x.id === id);
              return t ? (
                <button
                  key={id}
                  type="button"
                  className="focus-ring inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-0.5 font-semibold text-accent-ink hover:bg-surface-2"
                  onClick={() => setTypesOff((list) => list.filter((x) => x !== id))}
                >
                  <Plus size={11} /> {t.name}
                </button>
              ) : null;
            })}
          </div>
        )}
      </FormSection>

      <FormSection
        icon={<span>🧩</span>}
        title="Custom standard tasks"
        hint="Project-specific tasks with their own standard time, e.g. LinkedIn connection request at 0.5 min each. They show up as task types in Assign for this project."
      >
        {customTasks.length > 0 && (
          <ul
            className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
            aria-label="Custom standard tasks"
          >
            {customTasks.map((t, index) => (
              <li
                key={t.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_15rem_11rem_auto]"
              >
                <input
                  aria-label="Custom task name"
                  className={clsx(INPUT_CLASS, 'py-1.5 font-semibold text-ink')}
                  value={t.name}
                  onChange={(e) => updateCustomTask(index, { name: e.target.value })}
                />
                <input
                  aria-label={`Unit for ${t.name}`}
                  className={clsx(INPUT_CLASS, 'hidden py-1.5 text-ink sm:block')}
                  value={t.unit}
                  onChange={(e) => updateCustomTask(index, { unit: e.target.value })}
                />
                <span className="col-start-1 row-start-2 flex items-baseline gap-1.5 sm:col-start-auto sm:row-start-auto">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0.1}
                    step={0.1}
                    aria-label={`Minutes per unit for ${t.name}`}
                    className={clsx(NUMBER_INPUT_CLASS, 'w-20 text-lg')}
                    value={t.minutes}
                    onChange={(e) => updateCustomTask(index, { minutes: e.target.value })}
                  />
                  <span className="whitespace-nowrap text-xs text-muted">
                    min per {t.unit.replace(/s$/, '') || 'item'}
                    {toNumber(t.minutes) > 0 ? ` · ${perHourLabel(toNumber(t.minutes))}` : ''}
                  </span>
                </span>
                <select
                  aria-label={`Counts toward for ${t.name}`}
                  title="Done work on this task adds to this number (optional)"
                  className={clsx(INPUT_CLASS, 'col-span-2 py-1.5 text-ink sm:col-span-1')}
                  value={metrics.some((m) => m.id === t.metric) ? t.metric : ''}
                  onChange={(e) => updateCustomTask(index, { metric: e.target.value })}
                >
                  <option value="">Counts toward: nothing</option>
                  {metrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      Counts toward: {m.label || 'unnamed number'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`Delete ${t.name}`}
                  title="Delete"
                  className="focus-ring row-span-2 rounded-lg p-2 text-muted hover:bg-coral hover:text-coral-ink sm:row-span-1"
                  onClick={() => setCustomTasks((list) => list.filter((_, i) => i !== index))}
                >
                  <Trash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto]">
          <input
            aria-label="New custom task name"
            className={clsx(INPUT_CLASS, 'text-ink')}
            placeholder="Task name, e.g. LinkedIn connection request"
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
            onKeyDown={onEnterAdd}
          />
          <input
            aria-label="New custom task unit"
            className={clsx(INPUT_CLASS, 'text-ink')}
            placeholder="Unit, e.g. calls"
            value={newTask.unit}
            onChange={(e) => setNewTask({ ...newTask, unit: e.target.value })}
            onKeyDown={onEnterAdd}
          />
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step={0.1}
            aria-label="New custom task minutes per unit"
            className={clsx(NUMBER_INPUT_CLASS, 'w-full text-base')}
            placeholder="Min per unit"
            value={newTask.minutes}
            onChange={(e) => setNewTask({ ...newTask, minutes: e.target.value })}
            onKeyDown={onEnterAdd}
          />
          <Button type="button" tone="soft" onClick={addCustomTask}>
            <Plus size={14} /> Add task
          </Button>
        </div>
      </FormSection>

      <FormSection
        icon={<span>👥</span>}
        title="Team and hours per day"
        hint={
          <>
            Type each person's hours per day, decimals are fine (1.5 = 1h 30m, 0.75 = 45m).{' '}
            {edit ? 'Setting 0 takes someone off the team.' : 'You are added to the team automatically.'}
          </>
        }
      >
        {team.length > 0 ? (
          <ul
            className="mb-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface"
            aria-label="Team and hours"
          >
            {team.map((m, index) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <Avatar id={m.id} size="sm" />
                <span className="min-w-0 flex-1 text-sm text-ink">
                  {fullName(m.id)}{' '}
                  <span className="text-xs text-muted">
                    · {PEOPLE.find((p) => p.id === m.id)?.title}
                    {m.id === ownerId ? ' · owner' : ''}
                  </span>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={12}
                    step={0.25}
                    placeholder="e.g. 1.5"
                    autoFocus={m.id === focusId}
                    aria-label={`Hours per day for ${fullName(m.id)}`}
                    className={clsx(NUMBER_INPUT_CLASS, 'w-24 text-lg')}
                    value={m.h}
                    onChange={(e) =>
                      setTeam((list) => list.map((x, i) => (i === index ? { ...x, h: e.target.value } : x)))
                    }
                  />
                  <span className="w-16 text-xs text-muted">
                    h / day
                    {hoursLabel(toNumber(m.h)) && (
                      <span className="block text-[10px]">= {hoursLabel(toNumber(m.h))}</span>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${fullName(m.id)} from the team`}
                  className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                  onClick={() => setTeam((list) => list.filter((_, i) => i !== index))}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs text-muted">Nobody added yet.</p>
        )}
        <PersonPicker
          label="Add a person to the team"
          roles={['pm', 'resource']}
          exclude={team.map((m) => m.id)}
          onPick={(id) => {
            setTeam((list) => [...list, { id, h: '' }]);
            setFocusId(id);
          }}
        />
      </FormSection>

      <FormSection
        icon={<ShieldCheck size={15} className="text-accent" />}
        title="Project admins"
        hint="Admins can do everything the owner can on this project: set targets and numbers, assign tasks, book meetings and edit these details."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Owner and admins">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm text-ink">
            <Avatar id={ownerId} size="sm" /> {fullName(ownerId)}{' '}
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-butter-ink">
              <Crown size={12} /> Owner
            </span>
          </span>
          {admins.map((id) => (
            <span
              key={id}
              data-admin={id}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-1.5 text-sm text-ink"
            >
              <Avatar id={id} size="sm" /> {fullName(id)}{' '}
              <span className="text-xs font-semibold text-accent-ink">Admin</span>
              {canManageAdmins ? (
                <button
                  type="button"
                  aria-label={`Remove ${fullName(id)} as admin`}
                  className="focus-ring rounded-full p-1 text-muted hover:bg-surface-2 hover:text-coral-ink"
                  onClick={() => setAdmins((list) => list.filter((a) => a !== id))}
                >
                  <X size={12} />
                </button>
              ) : (
                <span className="w-1" />
              )}
            </span>
          ))}
          {admins.length === 0 && <span className="text-xs text-muted">No admins yet.</span>}
        </div>
        {canManageAdmins ? (
          <PersonPicker
            label="Add an admin"
            exclude={[ownerId, ...admins]}
            onPick={(id) => setAdmins((list) => [...list, id])}
          />
        ) : edit?.admins.includes(me) ? (
          <Button type="button" tone="ghost" className="border border-line bg-surface" onClick={stepDown}>
            Step down as admin
          </Button>
        ) : null}
        {edit && canManageAdmins && (
          <p className="mt-2 text-[11px] text-muted">Admin changes are saved with Save changes.</p>
        )}
      </FormSection>

      {edit && (edit.pmId === me || isAdmin) && (
        <FormSection
          className="border-peach-strong/60 bg-peach/30"
          icon={<ArrowRightLeft size={15} className="text-peach-ink" />}
          title="Handover"
          hint={
            <>
              Make someone else the owner in one click. They are told straight away, and management sees it
              in the project's updates. This happens immediately, separately from Save changes.
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="handover-to">
              New owner
            </label>
            <select
              id="handover-to"
              aria-label="New owner"
              className={SELECT_CLASS}
              value={handoverTo}
              onChange={(e) => {
                setHandoverTo(e.target.value);
                setHandoverMode(null);
              }}
            >
              <option value="">Pick a person…</option>
              {ROLE_GROUPS.map(([role, roleLabel]) => {
                const people = PEOPLE.filter((p) => p.role === role && p.id !== edit.pmId);
                return people.length ? (
                  <optgroup key={role} label={roleLabel}>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {fullName(p.id)} · {p.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {handoverOptions.map((o) => (
              <button
                key={o.mode}
                type="button"
                disabled={!handoverTo}
                onClick={() => setHandoverMode(o.mode)}
                className={clsx(
                  'focus-ring rounded-xl border-2 bg-surface p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50',
                  handoverMode === o.mode ? 'border-accent' : 'border-line hover:border-accent/60',
                )}
              >
                <span className="block font-bold text-ink">{o.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.effect}</span>
              </button>
            ))}
          </div>
          {selectedHandover && handoverTo && (
            <div
              role="alertdialog"
              aria-label="Confirm handover"
              className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <p className="min-w-0 flex-1 text-sm text-ink">
                Hand <b>{edit.name}</b> over to <b>{fullName(handoverTo)}</b>? {selectedHandover.effect}
              </p>
              <Button type="button" tone="ghost" onClick={() => setHandoverMode(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => handOver(selectedHandover.mode)}>
                <ArrowRightLeft size={14} /> Confirm handover
              </Button>
            </div>
          )}
        </FormSection>
      )}
      {edit && (
        <ConfirmModal
          open={confirmDelete}
          title={`Delete ${edit.name}?`}
          message="The project and all of its tasks are removed for everyone. This cannot be undone."
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (attempt(() => deleteProject(edit.id), setError)) {
              toast({ title: `${edit.name} deleted`, tone: 'info' });
              onClose();
            }
          }}
        />
      )}
    </Modal>
  );
}

export default ProjectFormModal;
