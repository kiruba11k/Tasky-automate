import { mineFirst } from '@/internal/lib/mine';
import { ReadMore } from '@/internal/ui/ReadMore';
import { isAdminTier } from '@/internal/lib/constants';
import React, { useState, useEffect } from 'react';
import { RotateCcwClock, Plus, Gauge, ShoppingBasket, Trash, Send, Star } from 'lucide-react';
import {
  Se as useStore,
  Qe as PEOPLE,
  ea as canAssignOnProject,
  Cn as STANDARD_TASK_TYPES,
  ia as previousWorkingDay,
  $e as dayKey,
  Xa as parseDay,
  yt as formatDay,
  ff as defaultTaskTitle,
  vV as isProjectOwner,
  xV as isProjectAdmin,
  be as personName,
  We as formatMinutes,
  oe as cn,
  rt as Card,
  dt as CardHeader,
  qe as Badge,
  Te as Button,
  vt as Avatar,
  Ge as INPUT_CLASS,
  yf as DifficultyHint,
  lt as guard,
  Ye as toast,
  FR as TasksByDate,
} from '@/internal/min';
import { AssignedTaskRow } from './AssignedTaskRow';
import {
  WEEKDAY_NAMES,
  matchCustomStandard,
  standardFor,
  difficultyLevel,
  nextCartKey,
} from './assignHelpers';

/** Route "/assign": build a list of tasks and assign them to teammates. */
export function AssignTasks() {
  const { me, tasks, projects, assignMany } = useStore();
  const myRole = PEOPLE.find((G) => G.id === me)?.role;
  const isManager = isAdminTier(myRole);
  const myProjects = mineFirst(projects, me).filter(
    (G) => G.status === 'active' && (canAssignOnProject(G, me) || G.teamIds.includes(me)),
  );
  const [projectId, setProjectId] = useState(myProjects[0]?.id ?? '');
  const project = myProjects.find((G) => G.id === projectId) ?? myProjects[0];
  const canManage = !!project && canAssignOnProject(project, me); // owner, admin or leadership of the selected project
  const teammates = PEOPLE.filter(
    (G) =>
      (G.id !== me || !canManage) &&
      (G.role !== 'founder' || G.tracked) &&
      (isManager || project?.teamIds.includes(G.id) || (!canManage && G.id === me)),
  );
  const [pickedAssignee, setPickedAssignee] = useState('');
  const [typeIdState, setTypeId] = useState('l1');
  const [variant, setVariant] = useState('Personalised');
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [qty, setQty] = useState(30);
  const [targetMinutes, setTargetMinutes] = useState(60);
  const [manualTarget, setManualTarget] = useState(false);
  const [title, setTitle] = useState('');
  const [cart, setCart] = useState([]);
  const customStandards = project?.customStandards ?? [];
  const typeId =
    typeIdState === 'custom' ||
    STANDARD_TASK_TYPES.some((G) => G.id === typeIdState) ||
    customStandards.some((G) => G.id === typeIdState)
      ? typeIdState
      : 'l1';
  const stdType = STANDARD_TASK_TYPES.find((G) => G.id === typeId);
  const projectStd = customStandards.find((G) => G.id === typeId);
  const draft = {
    projectId: project?.id ?? '',
    typeId,
    qty,
    variant: stdType?.variants ? variant : undefined,
    customName: typeId === 'custom' ? customName : undefined,
  };
  const draftStandard = project ? standardFor(projects, draft) : null;
  const customMatch = typeId === 'custom' ? matchCustomStandard(project, draft) : undefined;
  useEffect(() => {
    if (!manualTarget && draftStandard != null) setTargetMinutes(draftStandard);
  }, [draftStandard, manualTarget]);
  const assigneeId = teammates.some((G) => G.id === pickedAssignee) ? pickedAssignee : teammates[0]?.id;
  const assignedByMe = tasks.filter((G) => G.assignedById === me);
  const stillOpen = assignedByMe.filter((G) => G.status !== 'done' && G.status !== 'in_review');
  const prevDay = previousWorkingDay(dayKey(0));
  const prevDayName = WEEKDAY_NAMES[parseDay(prevDay).getDay()];
  const prevLabel = `${prevDayName.slice(0, 3)} ${formatDay(prevDay)}`;
  const prevIsYesterday = prevDay === dayKey(-1);
  const prevAssigned = tasks.filter(
    (G) => G.assignedById === me && G.date === prevDay && myProjects.some((p) => p.id === G.projectId),
  );
  const prevDone = prevAssigned.filter((G) => G.status === 'done' || G.status === 'in_review');
  const carriedOver = prevAssigned.length - prevDone.length;
  const prevDoneByPerson = [...new Set(prevDone.map((G) => G.assigneeId))].map((G) => ({
    id: G,
    n: prevDone.filter((t) => t.assigneeId === G).length,
  }));

  if (!project)
    return (
      <Card>
        <p className="py-8 text-center text-muted">
          You'll be able to assign tasks once you own or help run (as a project admin) an approved project.
        </p>
      </Card>
    );

  const findProject = (id) => projects.find((p) => p.id === id);
  const itemTitle = (item) => {
    if (item.title?.trim()) return item.title.trim();
    const custom = matchCustomStandard(findProject(item.projectId), item);
    return custom
      ? `${item.qty} ${custom.name}`
      : item.typeId === 'custom'
        ? `${item.qty} ${item.customName?.trim() || 'custom task'}`
        : defaultTaskTitle(item.typeId, item.qty, item.variant);
  };
  const addToList = () => {
    if (!assigneeId)
      return toast({
        title: 'Pick who the task is for',
        tone: 'info',
        emoji: '⚠️',
      });
    if (!(qty > 0) || !(targetMinutes > 0))
      return toast({
        title: 'Quantity and target time must be above zero',
        tone: 'info',
        emoji: '⚠️',
      });
    if (typeId === 'custom' && !customName.trim())
      return toast({ title: 'Name the custom task', tone: 'info', emoji: '⚠️' });
    setCart((G) => [
      ...G,
      {
        key: nextCartKey(),
        typeId,
        variant: stdType?.variants ? variant : undefined,
        customName: typeId === 'custom' ? customName : undefined,
        customUnit: typeId === 'custom' ? customUnit : undefined,
        qty,
        targetMinutes,
        pace: targetMinutes / qty,
        projectId: project.id,
        assigneeId,
        title,
      },
    ]);
    setTitle('');
  };
  const usePreviousDay = () => {
    if (!prevDone.length)
      return toast({
        title: `You didn't assign anything on ${prevLabel}`,
        tone: 'info',
      });
    const fresh = prevDone.filter((t) => !cart.some((c) => c.from === t.id));
    if (!fresh.length)
      return toast({
        title: `${prevDayName}'s tasks are already in today's list`,
        tone: 'info',
      });
    setCart((G) => [
      ...G,
      ...fresh.map((t) => {
        const isCustom = t.typeId === 'custom';
        const name = isCustom ? t.customName || t.title.replace(/^\d+\s*/, '') : undefined;
        const defaultTitle = isCustom ? `${t.qty} ${name}` : defaultTaskTitle(t.typeId, t.qty, t.variant);
        return {
          key: nextCartKey(),
          from: t.id,
          typeId: t.typeId,
          variant: t.variant,
          customName: name,
          customUnit: isCustom ? t.unit : undefined,
          customStandardId: t.customStandardId,
          qty: t.qty,
          targetMinutes: t.targetMinutes,
          pace: t.targetMinutes / t.qty,
          projectId: t.projectId,
          assigneeId: t.assigneeId,
          title: t.title !== defaultTitle ? t.title : '',
        };
      }),
    ]);
    toast({
      title: `Added ${fresh.length} task${fresh.length > 1 ? 's' : ''} from ${prevLabel}${prevIsYesterday ? '' : ' (previous working day)'}`,
      description: 'Tweak the numbers, then assign.',
      tone: 'success',
    });
  };
  const patchItem = (key, patch) => setCart((G) => G.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const changeItemQty = (item, value) =>
    patchItem(item.key, {
      qty: value,
      ...(value > 0 && item.pace > 0 ? { targetMinutes: Math.max(1, Math.round(item.pace * value)) } : {}),
    });
  const changeItemMinutes = (item, value) =>
    patchItem(item.key, {
      targetMinutes: value,
      ...(value > 0 && item.qty > 0 ? { pace: value / item.qty } : {}),
    });
  const totalMinutes = cart.reduce((G, c) => G + (c.targetMinutes || 0), 0);
  const cartAssignees = [...new Set(cart.map((G) => G.assigneeId))];
  const mix = cart.reduce((G, c) => (G[difficultyLevel(c.targetMinutes, standardFor(projects, c))]++, G), {
    challenging: 0,
    standard: 0,
    easy: 0,
    none: 0,
  });
  const roleOn = (p) => (isProjectOwner(p, me) ? 'owner' : isProjectAdmin(p, me) ? 'admin' : '');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Assign tasks</h1>
      <section
        aria-label="Yesterday's tasks"
        className="flex flex-wrap items-center gap-4 rounded-card border border-accent/30 bg-accent-soft/60 p-4 shadow-soft"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on">
          <RotateCcwClock size={20} />
        </span>
        <div className="min-w-[220px] flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">
            Yesterday's tasks
            <Badge tone="sky">
              {prevLabel}
              {prevIsYesterday ? '' : ' · previous working day'}
            </Badge>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {prevDone.length ? (
              <>
                You assigned {prevDone.length} task
                {prevDone.length > 1 ? 's' : ''} on {prevIsYesterday ? 'yesterday' : prevDayName} (
                {prevDoneByPerson.map((G) => `${personName(G.id)} ${G.n}`).join(', ')}). Pull them into today's
                list, tweak and assign.
                {carriedOver > 0 && (
                  <>
                    {' '}
                    {carriedOver} still open from {prevDayName.slice(0, 3)} {carriedOver > 1 ? 'are' : 'is'}{' '}
                    carried over, so {carriedOver > 1 ? 'they are' : 'it is'} left out.
                  </>
                )}
              </>
            ) : (
              <>You didn't assign anything on {prevLabel}. Build today's list below.</>
            )}
          </p>
        </div>
        <Button onClick={usePreviousDay} disabled={!prevDone.length}>
          <RotateCcwClock size={14} />{' '}
          {prevDone.length
            ? `Use ${prevIsYesterday ? "yesterday's" : `${prevDayName}'s`} ${prevDone.length} task${prevDone.length > 1 ? 's' : ''}`
            : 'Nothing to pull'}
        </Button>
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>Add a task</CardHeader>
          <div className="space-y-5">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-muted">Project</p>
              <div className="flex flex-wrap gap-2">
                {myProjects.map((p) => (
                  <Button
                    key={p.id}
                    tone={p.id === project.id ? 'primary' : 'ghost'}
                    className="border border-line"
                    onClick={() => setProjectId(p.id)}
                  >
                    {p.name}
                    {roleOn(p) && <span className="text-[11px] font-normal opacity-80">· {roleOn(p)}</span>}
                  </Button>
                ))}
              </div>
              {project.description && (
                <ReadMore text={project.description} className="mt-2 rounded-xl bg-surface-2 p-3 text-sm text-muted" />
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-muted">Assign to</p>
              <div className="flex flex-wrap gap-2">
                {teammates.length === 0 && (
                  <p className="text-sm text-muted">No teammates on this project yet.</p>
                )}
                {teammates.map((G) => (
                  <button
                    key={G.id}
                    onClick={() => setPickedAssignee(G.id)}
                    className={cn(
                      'focus-ring flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm',
                      G.id === assigneeId ? 'border-accent bg-accent-soft font-semibold' : 'border-line',
                    )}
                  >
                    <Avatar id={G.id} size="sm" /> {personName(G.id)}{' '}
                    <span className="text-xs text-muted">{G.title}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase text-muted">Task</p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_TASK_TYPES.map((G) => (
                  <Button
                    key={G.id}
                    tone={G.id === typeId ? 'primary' : 'ghost'}
                    className="border border-line"
                    onClick={() => {
                      setTypeId(G.id);
                      setManualTarget(false);
                      setQty(G.id === 'deck' ? 1 : G.id === 'model' ? 10 : 30);
                    }}
                  >
                    {G.name}
                  </Button>
                ))}
                <Button
                  tone={typeId === 'custom' ? 'primary' : 'ghost'}
                  className="border border-dashed border-line"
                  onClick={() => {
                    setTypeId('custom');
                    setManualTarget(true);
                  }}
                >
                  + Custom task
                </Button>
              </div>
              {customStandards.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase text-muted">{project.name} custom tasks</p>
                  <div className="flex flex-wrap gap-2">
                    {customStandards.map((G) => (
                      <Button
                        key={G.id}
                        data-custom-standard={G.id}
                        tone={G.id === typeId ? 'primary' : 'ghost'}
                        className="border border-line"
                        onClick={() => {
                          setTypeId(G.id);
                          setManualTarget(false);
                          setQty(Math.max(1, Math.round(30 / G.minutes)));
                        }}
                      >
                        {G.name}{' '}
                        <span className="text-[11px] font-normal opacity-80">
                          · {G.minutes} min per {G.unit.replace(/s$/, '') || 'unit'}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {stdType?.variants && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {stdType.variants.map((G) => (
                    <Button
                      key={G}
                      tone={G === variant ? 'soft' : 'ghost'}
                      onClick={() => {
                        setVariant(G);
                        setManualTarget(false);
                      }}
                    >
                      {G}
                    </Button>
                  ))}
                </div>
              )}
              {typeId === 'custom' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    className={INPUT_CLASS}
                    aria-label="Custom task name"
                    placeholder="Task name, e.g. LinkedIn profile audit"
                    value={customName}
                    onChange={(G) => setCustomName(G.target.value)}
                  />
                  <input
                    className={INPUT_CLASS}
                    aria-label="Custom task unit"
                    placeholder="Unit, e.g. profiles"
                    value={customMatch ? customMatch.unit : customUnit}
                    disabled={!!customMatch}
                    onChange={(G) => setCustomUnit(G.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="w-28 text-sm font-semibold">
                Quantity
                <input
                  type="number"
                  min={1}
                  aria-label="Quantity"
                  className={cn(INPUT_CLASS, 'mt-1')}
                  value={qty}
                  onChange={(G) => setQty(+G.target.value)}
                />
              </label>
              <label className="w-36 text-sm font-semibold">
                Target time (min)
                <input
                  type="number"
                  min={1}
                  aria-label="Target time (min)"
                  className={cn(INPUT_CLASS, 'mt-1')}
                  value={targetMinutes}
                  onChange={(G) => {
                    setTargetMinutes(+G.target.value);
                    setManualTarget(true);
                  }}
                />
              </label>
              {draftStandard != null && targetMinutes !== draftStandard && (
                <Button
                  tone="ghost"
                  className="border border-line"
                  onClick={() => {
                    setTargetMinutes(draftStandard);
                    setManualTarget(false);
                  }}
                >
                  Reset to standard {formatMinutes(draftStandard)}
                </Button>
              )}
              <label className="min-w-[200px] flex-1 text-sm font-semibold">
                Title (optional)
                <input
                  className={cn(INPUT_CLASS, 'mt-1')}
                  placeholder="e.g. Northwind QBR deck"
                  value={title}
                  onChange={(G) => setTitle(G.target.value)}
                />
              </label>
            </div>
            <div
              className="flex gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-sm"
              data-testid="draft-difficulty"
            >
              <Gauge size={16} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {draftStandard != null ? (
                    <span>
                      Standard for {qty} {projectStd?.unit ?? customMatch?.unit ?? stdType?.unit ?? 'items'} on
                      this project: <b>{formatMinutes(draftStandard)}</b> · your target{' '}
                      <b>{formatMinutes(targetMinutes > 0 ? targetMinutes : 0)}</b>
                    </span>
                  ) : (
                    <span>
                      Target <b>{formatMinutes(targetMinutes > 0 ? targetMinutes : 0)}</b> · no standard time for
                      this custom task yet
                    </span>
                  )}
                  {targetMinutes > 0 && (
                    <DifficultyHint target={targetMinutes} standard={draftStandard} showStandard={false} />
                  )}
                </p>
                {stdType && <p className="text-xs text-muted">Ideal pace {stdType.ideal}</p>}
                {customMatch && (
                  <p className="text-xs text-muted">
                    Matches the project task "{customMatch.name}" ({customMatch.minutes} min per{' '}
                    {customMatch.unit.replace(/s$/, '')})
                  </p>
                )}
                {typeId === 'custom' && !customMatch && (
                  <p className="text-xs text-muted">
                    Add it as a custom task under <b>Edit project details</b> on the Projects page to track
                    difficulty.
                  </p>
                )}
              </div>
            </div>
            <Button tone="soft" onClick={addToList}>
              <Plus size={14} /> Add to list
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)]">
          <CardHeader
            right={
              <Badge tone="sky">
                {cart.length} task{cart.length === 1 ? '' : 's'}
              </Badge>
            }
          >
            <ShoppingBasket size={18} className="mr-1.5 inline" /> Today's list
          </CardHeader>
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Add tasks on the left, or use {prevIsYesterday ? "yesterday's" : `${prevDayName}'s`} tasks.
              <br />
              Everything collects here before you assign.
            </p>
          ) : (
            <div className="-mx-2 flex-1 space-y-4 overflow-y-auto px-2">
              {cartAssignees.map((G) => (
                <div key={G}>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                    <Avatar id={G} size="sm" /> {personName(G)}{' '}
                    <span className="text-xs font-normal text-muted">
                      ·{' '}
                      {formatMinutes(
                        cart.filter((c) => c.assigneeId === G).reduce((s, c) => s + (c.targetMinutes || 0), 0),
                      )}
                    </span>
                  </p>
                  <ul className="space-y-2">
                    {cart
                      .filter((c) => c.assigneeId === G)
                      .map((item) => (
                        <li
                          key={item.key}
                          className="rounded-xl border border-line bg-surface-2 p-2.5 text-sm"
                          data-cart-item={item.key}
                        >
                          <div className="flex items-start gap-2">
                            <span className="min-w-0 flex-1">
                              <b className="first-letter:uppercase">{itemTitle(item)}</b>
                              <span className="block text-xs text-muted">
                                {findProject(item.projectId)?.name}
                                {item.from ? ` · from ${prevLabel}` : ''}
                              </span>
                            </span>
                            <button
                              aria-label={item.priority ? 'Remove priority' : 'Mark as priority'}
                              title={item.priority ? 'Priority, click to remove' : 'Mark as priority'}
                              aria-pressed={!!item.priority}
                              className={cn(
                                'focus-ring rounded-lg p-1',
                                item.priority ? 'text-coral-ink' : 'text-muted hover:bg-line',
                              )}
                              onClick={() => patchItem(item.key, { priority: !item.priority })}
                            >
                              <Star size={14} fill={item.priority ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              aria-label={`Remove ${itemTitle(item)}`}
                              className="focus-ring rounded-lg p-1 text-muted hover:bg-line hover:text-coral-ink"
                              onClick={() => setCart((c) => c.filter((x) => x.key !== item.key))}
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <label className="flex items-center gap-1 text-xs text-muted">
                              Qty
                              <input
                                type="number"
                                min={1}
                                className={cn(INPUT_CLASS, 'w-20 py-1')}
                                value={item.qty}
                                onChange={(e) => changeItemQty(item, +e.target.value)}
                              />
                            </label>
                            <label className="flex items-center gap-1 text-xs text-muted">
                              Min
                              <input
                                type="number"
                                min={1}
                                className={cn(INPUT_CLASS, 'w-20 py-1')}
                                value={item.targetMinutes}
                                onChange={(e) => changeItemMinutes(item, +e.target.value)}
                              />
                            </label>
                          </div>
                          <DifficultyHint
                            target={item.targetMinutes}
                            standard={standardFor(projects, item)}
                            className="mt-2"
                          />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cart.length > 0 && cart.every((G) => G.priority)}
                disabled={!cart.length}
                onChange={(e) => setCart((c) => c.map((x) => ({ ...x, priority: e.target.checked })))}
              />
              <Star size={14} className="text-coral-ink" /> Send all as priority
              <span className="ml-auto text-xs text-muted">{cart.filter((G) => G.priority).length} priority</span>
            </label>
            {cart.length > 0 && (
              <p
                className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
                data-testid="cart-mix"
              >
                <span className="font-semibold text-muted">Difficulty</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-coral-strong" />
                  {mix.challenging} challenging
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-strong" />
                  {mix.standard} standard
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-butter-strong" />
                  {mix.easy} easy
                </span>
                {mix.none > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-grey-strong" />
                    {mix.none} no standard
                  </span>
                )}
              </p>
            )}
            <p className="mb-3 flex justify-between text-sm">
              <span className="text-muted">Total target time</span>
              <b>{formatMinutes(totalMinutes)}</b>
            </p>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={!cart.length}
                onClick={() => {
                  if (guard(() => assignMany(cart))) {
                    toast({
                      title: `Assigned ${cart.length} task${cart.length > 1 ? 's' : ''} to ${cartAssignees.map(personName).join(', ')}`,
                      tone: 'success',
                    });
                    setCart([]);
                  }
                }}
              >
                <Send size={14} /> Assign all
              </Button>
              {cart.length > 0 && (
                <Button tone="ghost" className="border border-line" onClick={() => setCart([])}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader right={<span className="text-xs text-muted">{stillOpen.length} open</span>}>
          Still open: edit or remind
        </CardHeader>
        {stillOpen.length === 0 ? (
          <p className="text-sm text-muted">Everything you assigned is done or in review ☀️</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="still-open">
            {stillOpen.map((G) => (
              <AssignedTaskRow key={G.id} t={G} />
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader right={<span className="text-xs text-muted">{assignedByMe.length} total</span>}>
          Tasks you assigned, by date
        </CardHeader>
        <TasksByDate tasks={assignedByMe} who="assigner" />
      </Card>
    </div>
  );
}

export default AssignTasks;
