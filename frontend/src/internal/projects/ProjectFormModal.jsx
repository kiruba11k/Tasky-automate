import React, { useState, useEffect, useMemo } from 'react';
import { CalendarRange, Crown, ArrowRightLeft, Plus, ShieldCheck, Trash, X } from 'lucide-react';
import {
  Se as useStore,
  oe as clsx,
  Te as Button,
  Ya as Modal,
  vt as Avatar,
  xn as isManagerRole,
  Wo as roleOf,
  $e as dayKey,
  Mt as weekStart,
  yt as formatDate,
  Dw as projectWeeks,
  Rw as DEFAULT_STANDARDS,
  cf as METRICS,
  lt as attempt,
  Ye as toast,
  be as firstName,
  nt as fullName,
  Qe as PEOPLE,
  qR as ROLE_GROUPS,
  Ge as INPUT_CLASS,
  _o as NUMBER_INPUT_CLASS,
  vb as SELECT_CLASS,
  LP as STANDARD_FIELDS,
  FP as perHourLabel,
  BP as hoursLabel,
  br as toNumber,
  XU as newRowKey,
} from '@/internal/min';
import { FormSection } from './FormSection';
import { PersonPicker } from './PersonPicker';

const EMPTY_TASK = { name: '', unit: '', minutes: '' };
const DEFAULT_STANDARD_INPUTS = { prospect: '2', l1: '2', l2: '1.5' };

/** Create ("Propose"/"Onboard") or edit a project. */
export function ProjectFormModal({ open, onClose, edit }) {
  const {
    me,
    proposeProject,
    updateProject,
    setProjectAdmins,
    removeProjectAdmin,
    transferProject,
  } = useStore();
  const isManager = isManagerRole(roleOf(me));
  const ownerId = edit ? edit.pmId : me;
  const canManageAdmins = !edit || edit.pmId === me || isManager;

  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState(dayKey(0));
  const [endDate, setEndDate] = useState(dayKey(90));
  const [team, setTeam] = useState([]);
  const [standards, setStandards] = useState(DEFAULT_STANDARD_INPUTS);
  const [customTasks, setCustomTasks] = useState([]);
  const [newTask, setNewTask] = useState(EMPTY_TASK);
  const [admins, setAdmins] = useState([]);
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverMode, setHandoverMode] = useState(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [focusId, setFocusId] = useState('');
  const [defaultTargets, setDefaultTargets] = useState({});
  const [weekPlans, setWeekPlans] = useState({});
  const [planWeek, setPlanWeek] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setHandoverMode(null);
      setHandoverTo('');
      setShowAllWeeks(false);
      setNewTask(EMPTY_TASK);
      setFocusId('');
      if (edit) {
        setName(edit.name);
        setClient(edit.client);
        setDescription(edit.description);
        setStartDate(edit.startDate);
        setEndDate(edit.endDate);
        const ids = [...new Set([...Object.keys(edit.hours), ...edit.teamIds])];
        setTeam(ids.map((id) => ({ id, h: String(edit.hours[id] ?? 0) })));
        const std = { ...DEFAULT_STANDARDS, ...edit.standards };
        setStandards({
          prospect: String(std.prospect),
          l1: String(std.l1),
          l2: String(std.l2),
        });
        setCustomTasks(
          (edit.customStandards ?? []).map((c) => ({
            key: c.id,
            id: c.id,
            name: c.name,
            unit: c.unit,
            minutes: String(c.minutes),
          })),
        );
        setAdmins(edit.admins ?? []);
      }
    }
  }, [open, edit]);

  const weeks = useMemo(
    () =>
      startDate && endDate && endDate >= startDate
        ? projectWeeks({ startDate, endDate }, 0).filter((w) => w.start <= endDate)
        : [],
    [startDate, endDate],
  );
  const visibleWeeks = showAllWeeks || weeks.length <= 9 ? weeks : weeks.slice(0, 8);

  const resetForm = () => {
    setDefaultTargets({});
    setWeekPlans({});
    setPlanWeek('');
    setName('');
    setClient('');
    setDescription('');
    setTeam([]);
    setStandards(DEFAULT_STANDARD_INPUTS);
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
    const standardsOut = Object.fromEntries(
      STANDARD_FIELDS.map((f) => {
        const v = toNumber(standards[f.key]);
        if (!(v > 0))
          throw new Error(`Set the standard time for ${f.label.toLowerCase()} (above 0 minutes).`);
        return [f.key, v];
      }),
    );
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
    }));
    return { standards: standardsOut, hours, customStandards };
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
        title: isManager ? `${name} is live 🎉` : `${name} sent to management for approval`,
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
            : 'Once a manager or founder approves it, you own it and can assign tasks.'
      }
      size="lg"
      footer={
        <>
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
        icon={<CalendarRange size={15} className="text-accent" />}
        title="Project weeks"
        hint={
          weeks.length ? (
            <>
              Weeks are numbered from the start date, Monday to Friday.{' '}
              {edit
                ? 'Pre-plan targets for any week in the Targets tab.'
                : 'Once the project is live you can pre-plan targets for each week in its Targets tab.'}
            </>
          ) : undefined
        }
      >
        {weeks.length === 0 ? (
          <p className="text-xs font-semibold text-coral-ink">
            Pick a start date and an end date after it to see the weeks.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted">
              <b className="text-ink">
                {weeks.length} week{weeks.length === 1 ? '' : 's'}
              </b>
              {' from '}
              {formatDate(weeks[0].start)}
              {' to '}
              {formatDate(weeks[weeks.length - 1].end)}
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Week preview">
              {visibleWeeks.map((w) => (
                <li
                  key={w.start}
                  className={clsx(
                    'rounded-lg border px-2 py-1 text-xs',
                    w.start === weekStart(0)
                      ? 'border-accent bg-accent-soft font-semibold text-accent-ink'
                      : 'border-line bg-surface text-ink',
                  )}
                >
                  {w.label}
                  {w.start === weekStart(0) ? ' (this week)' : w.start === weekStart(1) ? ' (next week)' : ''}
                </li>
              ))}
              {weeks.length > 9 && (
                <li>
                  <button
                    type="button"
                    className="focus-ring rounded-lg px-2 py-1 text-xs font-semibold text-accent-ink hover:bg-surface"
                    onClick={() => setShowAllWeeks((v) => !v)}
                  >
                    {showAllWeeks ? 'Show fewer' : `+ ${weeks.length - 8} more weeks`}
                  </button>
                </li>
              )}
            </ul>
          </>
        )}
      </FormSection>

      {!edit &&
        weeks.length > 0 &&
        (() => {
          const activeWeek = weeks.some((w) => w.start === planWeek) ? planWeek : weeks[0].start;
          const planFields = weekPlans[activeWeek] ?? {};
          return (
            <FormSection
              icon={<span>📅</span>}
              title="Plan the weeks"
              hint="Set a default weekly target, then pre-plan any of the first weeks if it should differ. Blank fields use the default. Saved with the project."
            >
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                Default weekly target
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METRICS.map((m) => (
                  <label
                    key={m.id}
                    className="rounded-xl border border-line bg-surface p-2 text-xs font-semibold text-ink"
                  >
                    <span className="block truncate" title={m.label}>
                      {m.label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`${m.label} default weekly target`}
                      className={clsx(NUMBER_INPUT_CLASS, 'mt-1 w-full text-base')}
                      placeholder="0"
                      value={defaultTargets[m.id] ?? ''}
                      onChange={(e) => setDefaultTargets({ ...defaultTargets, [m.id]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Pre-plan</p>
                <select
                  aria-label="Pre-plan week"
                  className={SELECT_CLASS}
                  value={activeWeek}
                  onChange={(e) => setPlanWeek(e.target.value)}
                >
                  {weeks.slice(0, 8).map((w) => (
                    <option key={w.start} value={w.start}>
                      {w.label}
                      {weekPlans[w.start] && Object.values(weekPlans[w.start]).some((v) => v.trim())
                        ? ' · planned'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {METRICS.map((m) => (
                  <label
                    key={m.id}
                    className="rounded-xl border border-line bg-surface p-2 text-xs font-semibold text-ink"
                  >
                    <span className="block truncate" title={m.label}>
                      {m.label}
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`${m.label} target for the planned week`}
                      className={clsx(NUMBER_INPUT_CLASS, 'mt-1 w-full text-base')}
                      placeholder={defaultTargets[m.id] || 'default'}
                      value={planFields[m.id] ?? ''}
                      onChange={(e) =>
                        setWeekPlans({
                          ...weekPlans,
                          [activeWeek]: { ...planFields, [m.id]: e.target.value },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </FormSection>
          );
        })()}

      <FormSection
        icon={<span>⏱️</span>}
        title="Standard time for this project"
        hint="Every target time and on-time % for this project is measured against these. Different projects can have different standards."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {STANDARD_FIELDS.map((f) => (
            <label key={f.key} className="rounded-xl border border-line bg-surface p-3 text-sm text-ink">
              <span className="font-semibold">{f.label}</span>
              <span className="mt-1.5 flex items-baseline gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.1}
                  step={0.1}
                  aria-label={`${f.label} standard minutes`}
                  className={clsx(NUMBER_INPUT_CLASS, 'w-24 text-2xl')}
                  value={standards[f.key]}
                  onChange={(e) => setStandards({ ...standards, [f.key]: e.target.value })}
                />
                <span className="text-sm font-semibold text-muted">min</span>
              </span>
              <span className="mt-1 block text-[11px] text-muted">
                {f.hint}
                {toNumber(standards[f.key]) > 0 ? ` · ${perHourLabel(toNumber(standards[f.key]))}` : ''}
              </span>
            </label>
          ))}
        </div>
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
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7rem_15rem_auto]"
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

      {edit && (edit.pmId === me || isManager) && (
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
    </Modal>
  );
}

export default ProjectFormModal;
