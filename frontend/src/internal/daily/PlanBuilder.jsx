import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, Reorder, motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Copy, GripVertical, Lock, Pencil, Plus, Trash, WandSparkles } from 'lucide-react';
import {
  oe as cx,
  Se as useStore,
  Te as Button,
  Ye as toast,
  We as formatMinutes,
  Mn as toMinutes,
  NR as planFromProjectHours,
} from '@/internal/min';
import { lunchFor, previousWeekday } from '../lib/dates';
import { DurationInput } from './DurationInput';
import { LunchRow } from './LunchRow';
import { ReorderRow } from './ReorderRow';
import { ProjectChanger } from './ProjectChanger';
import {
  CUSTOM_PROJECT,
  OTHER_PREFIX,
  SPRING,
  WORK_END,
  WORK_START,
  blockColor,
  blockLabel,
  blocksKey,
  flowBlocks,
  groupBlocks,
  toClock,
} from './planBlocks';

let idCounter = 0;
const LANE_ANIM_IN = { opacity: 0, scaleY: 0.3, y: 10 };
const HOVER = { y: -2, boxShadow: '0 8px 18px -6px rgb(0 0 0 / 0.35)' };
const STRIPES = 'repeating-linear-gradient(45deg, rgb(255 255 255 / 0.22) 0 6px, transparent 6px 12px)';

/**
 * "Plan your day" builder: add blocks of work (Plan) or time outside the plan (Extra hours), see them on the day line, drag them
 * to reorder (blocks flow one after another around lunch) and set planned / actual time per block.
 * `plan` holds the day's time blocks, `extra` the extra hours; both are edited through `setPlan` / `setExtra`.
 */
export function PlanBuilder({ plan, setPlan, extra, setExtra, personId, date, onChangeProject, lockNote }) {
  const { projects, daily, profiles } = useStore();
  const reduced = useReducedMotion();
  const [lunch, setLunch] = useState(() => lunchFor(daily, personId, date, profiles));
  useEffect(() => {
    setLunch(lunchFor(useStore.getState().daily, personId, date, useStore.getState().profiles));
  }, [personId, date]);

  const lunchStart = toMinutes(lunch.start);
  const lunchEnd = toMinutes(lunch.end);
  const activeProjects = projects.filter((p) => p.status === 'active');
  const groups = useMemo(() => groupBlocks(plan), [plan]);

  // keep the saved blocks laid out around lunch
  useEffect(() => {
    const flowed = flowBlocks(groups, lunch);
    if (blocksKey(flowed) !== blocksKey([...plan].sort((a, b) => a.start.localeCompare(b.start)))) setPlan(flowed);
  }, [lunch, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const [projectId, setProjectId] = useState(activeProjects[0]?.id ?? '');
  const [customName, setCustomName] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [lane, setLane] = useState('plan');
  const [drag, setDrag] = useState(null);
  const [editing, setEditing] = useState(null); // { id, lane } of the row whose project is being changed
  const [overTrash, setOverTrash] = useState(false);
  const lineRef = useRef(null);
  const trashRef = useRef(null);

  // Positions on the plan lane skip lunch ("work minutes"); the extra lane starts where the plan ends.
  const lunchLen = lunchEnd - lunchStart;
  const toWork = (m) => (m < lunchStart ? m - WORK_START : m < lunchEnd ? lunchStart - WORK_START : m - lunchLen - WORK_START);
  const fromWork = (w) => (WORK_START + w < lunchStart ? WORK_START + w : WORK_START + w + lunchLen);
  const ghostSegments = (from, to) => {
    const beforeLunch = lunchStart - WORK_START;
    return to <= beforeLunch || from >= beforeLunch
      ? [{ s: fromWork(from), e: fromWork(from) + (to - from) }]
      : [
          { s: fromWork(from), e: lunchStart },
          { s: lunchEnd, e: lunchEnd + (to - beforeLunch) },
        ];
  };

  const flowed = useMemo(() => flowBlocks(groups, lunch), [groups, lunch]);
  const planTotal = groups.reduce((sum, g) => sum + g.minutes, 0);
  const planEnd = flowed.length ? toMinutes(flowed[flowed.length - 1].end) : WORK_START;
  const extraStart = Math.max(WORK_END, planEnd);
  const extras = useMemo(
    () =>
      extra
        .map((x) => ({
          id: x.id,
          projectId: x.projectId ?? `${OTHER_PREFIX}${x.work || 'Extra work'}`,
          minutes: x.minutes || (x.start && x.end && x.end > x.start ? toMinutes(x.end) - toMinutes(x.start) : 0),
        }))
        .filter((x) => x.minutes > 0),
    [extra],
  );
  /** Extra hours laid one after another from `extraStart`, as the records that get saved. */
  const layExtras = (list) => {
    let at = extraStart;
    return list.map((item) => {
      const saved = extra.find((x) => x.id === item.id);
      const out = {
        id: item.id,
        start: toClock(at),
        end: toClock(at + item.minutes),
        minutes: item.minutes,
        work: saved?.work || blockLabel(item.projectId, undefined, projects),
        projectId: !item.projectId.startsWith(OTHER_PREFIX) ? item.projectId : undefined,
        ...(saved?.auto ? { auto: true } : {}),
      };
      at += item.minutes;
      return out;
    });
  };
  const extraTotal = extras.reduce((sum, x) => sum + x.minutes, 0);
  useEffect(() => {
    const laid = layExtras(extras);
    const key = (list) => list.map((x) => `${x.id}|${x.start}|${x.end}`).join(',');
    if (key(laid) !== key(extra.filter((x) => extras.some((e) => e.id === x.id)))) setExtra(laid);
  }, [extraStart, extras]); // eslint-disable-line react-hooks/exhaustive-deps

  const span = Math.max(WORK_END, extraStart + extraTotal) - WORK_START;
  const pos = (m) => `${((m - WORK_START) / span) * 100}%`;
  const commitPlan = (list) => setPlan(flowBlocks(list, lunch));
  const commitExtra = (list) => setExtra(layExtras(list));
  const laneItems = (name) => (name === 'plan' ? groups : extras);
  const dragged = drag ? laneItems(drag.lane).find((item) => item.id === drag.id) : undefined;

  // While dragging on the line, the list shows the dragged block moved to where the pointer is.
  const preview = (name) => {
    const items = laneItems(name);
    if (!drag || drag.lane !== name || !dragged || !drag.moved || overTrash) return items;
    const rest = items.filter((item) => item.id !== drag.id);
    const centre = drag.work + Math.min(dragged.minutes, 30) / 2;
    let before = 0;
    let index = rest.length;
    for (let i = 0; i < rest.length; i++) {
      if (before + rest[i].minutes / 2 > centre) {
        index = i;
        break;
      }
      before += rest[i].minutes;
    }
    return [...rest.slice(0, index), dragged, ...rest.slice(index)];
  };
  const [listPlan, setListPlan] = useState(null); // order while dragging in the block list
  const [listExtra, setListExtra] = useState(null);
  const listRef = useRef({ plan: null, extra: null });
  listRef.current = { plan: listPlan, extra: listExtra };
  const shownPlan = listPlan ?? preview('plan');
  const shownExtra = listExtra ?? preview('extra');
  const endListDrag = (name) => {
    const list = listRef.current[name];
    if (list) (name === 'plan' ? commitPlan : commitExtra)(list);
    (name === 'plan' ? setListPlan : setListExtra)(null);
  };
  const shownBlocks = useMemo(() => flowBlocks(shownPlan, lunch), [shownPlan, lunch]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownExtraBlocks = layExtras(shownExtra);

  const addBlock = () => {
    const name = customName.trim();
    if (projectId === CUSTOM_PROJECT && !name) {
      toast({ title: 'Type the project name', tone: 'info' });
      return;
    }
    if (!minutes || minutes < 5) {
      toast({ title: 'Type how long, e.g. 1h 30m', tone: 'info' });
      return;
    }
    const item = {
      id: `${lane === 'plan' ? 'pb' : 'xb'}${Date.now().toString(36)}${++idCounter}`,
      projectId: projectId === CUSTOM_PROJECT ? `${OTHER_PREFIX}${name}` : projectId,
      minutes,
    };
    if (lane === 'plan') commitPlan([...groups, item]);
    else commitExtra([...extras, item]);
    setCustomName('');
  };
  const removeItem = (id, name = 'plan') =>
    name === 'plan' ? commitPlan(groups.filter((g) => g.id !== id)) : commitExtra(extras.filter((x) => x.id !== id));
  const fillFromYesterday = () => {
    const before = daily[`${personId}|${previousWeekday(date)}`]?.plan ?? [];
    if (!before.length) {
      toast({ title: 'No plan saved on the previous working day', tone: 'info' });
      return;
    }
    commitPlan(groupBlocks(before).map((g) => ({ ...g, id: `pb${Date.now().toString(36)}${++idCounter}`, actual: undefined })));
    toast({ title: "Copied the previous day's blocks. Save to keep them.", tone: 'success' });
  };

  // dragging a block along the line
  const clockAt = (clientX, name) => {
    const rect = lineRef.current.getBoundingClientRect();
    const at = WORK_START + ((clientX - rect.left) / rect.width) * span;
    return name === 'plan' ? toWork(at) : at - extraStart;
  };
  const startDrag = (event, id, name) => {
    if (event.button !== 0) return;
    event.preventDefault();
    let work = null;
    if (name === 'plan') {
      const piece = flowed.find((b) => b.id.split('~')[0] === id);
      work = piece ? toWork(toMinutes(piece.start)) : null;
    } else {
      const piece = layExtras(extras).find((b) => b.id === id);
      work = piece ? toMinutes(piece.start) - extraStart : null;
    }
    if (work != null) setDrag({ id, lane: name, grab: clockAt(event.clientX, name) - work, work, x0: event.clientX, moved: false });
  };
  const live = useRef({});
  live.current = { drag, shownPlan, shownExtra, overTrash };
  useEffect(() => {
    if (!drag) return undefined;
    const limit = drag.lane === 'plan' ? Math.max(toWork(extraStart), planTotal) : extraTotal;
    const onMove = (event) => {
      const current = live.current.drag;
      if (!current) return;
      const item = laneItems(current.lane).find((i) => i.id === current.id);
      if (!item) return;
      const moved = current.moved || Math.abs(event.clientX - current.x0) > 4;
      const work = Math.round(Math.max(0, Math.min(limit - item.minutes, clockAt(event.clientX, current.lane) - current.grab)) / 5) * 5;
      const box = trashRef.current?.getBoundingClientRect();
      setOverTrash(!!box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom);
      setDrag({ ...current, work, moved });
    };
    const onUp = () => {
      const { drag: current, shownPlan: planNow, shownExtra: extraNow, overTrash: trashed } = live.current;
      if (current?.moved) {
        if (trashed) {
          removeItem(current.id, current.lane);
          toast({ title: current.lane === 'plan' ? 'Block removed' : 'Extra hours removed', tone: 'info' });
        } else if (current.lane === 'plan') commitPlan(planNow);
        else commitExtra(extraNow);
      }
      setDrag(null);
      setOverTrash(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    window.addEventListener('pointercancel', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const transition = reduced ? { duration: 0 } : SPRING;
  const blockExit = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -14, transition: { duration: 0.22 } };
  const movedDrag = drag?.moved;
  const ghosts = movedDrag && dragged
    ? drag.lane === 'plan'
      ? ghostSegments(drag.work, drag.work + dragged.minutes)
      : [{ s: extraStart + drag.work, e: extraStart + drag.work + dragged.minutes }]
    : [];
  const fieldClass = 'focus-ring mt-1 block rounded-xl border border-line bg-surface px-2 py-1.5 text-sm text-ink';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface-2/60 p-3" aria-label="Add a block">
        <div className="flex rounded-full bg-surface p-1 shadow-soft" role="tablist" aria-label="Block type">
          {['plan', 'extra'].map((name) => (
            <button
              key={name}
              role="tab"
              aria-selected={lane === name}
              onClick={() => setLane(name)}
              className={cx(
                'focus-ring relative rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                lane === name ? (name === 'plan' ? 'text-accent-on' : 'text-white') : 'text-muted',
              )}
            >
              {lane === name && (
                <motion.span
                  layoutId="lane-pill"
                  transition={SPRING}
                  className={cx('absolute inset-0 rounded-full', name === 'plan' ? 'bg-accent' : 'bg-lavender-strong')}
                />
              )}
              <span className="relative">{name === 'plan' ? 'Plan' : 'Extra hours'}</span>
            </button>
          ))}
        </div>
        <label className="text-xs font-semibold text-muted">
          Project
          <select
            aria-label="Block project"
            className={cx(fieldClass, 'w-56')}
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CUSTOM_PROJECT}>Custom (type a name)...</option>
          </select>
        </label>
        <AnimatePresence initial={false}>
          {projectId === CUSTOM_PROJECT && (
            <motion.label
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden text-xs font-semibold text-muted"
            >
              Name
              <input
                aria-label="Custom project name"
                autoFocus
                className={cx(fieldClass, 'w-48')}
                placeholder="e.g. Internal training"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBlock()}
              />
            </motion.label>
          )}
        </AnimatePresence>
        <label className="text-xs font-semibold text-muted">
          Time
          <span className="mt-1 block">
            <DurationInput label="Block time" className="w-24" placeholder="1h 30m" value={minutes} onChange={setMinutes} />
          </span>
        </label>
        <Button onClick={addBlock} className={lane === 'extra' ? '!bg-lavender-strong !text-white' : ''}>
          <Plus size={14} /> {lane === 'plan' ? 'Add block' : 'Add extra hours'}
        </Button>
        <span className="ml-auto flex flex-wrap gap-2">
          <Button tone="ghost" className="border border-line bg-surface" onClick={fillFromYesterday}>
            <Copy size={13} /> Fill from yesterday
          </Button>
          <Button
            tone="ghost"
            className="border border-line bg-surface"
            onClick={() => commitPlan(groupBlocks(planFromProjectHours(projects, personId)))}
          >
            <WandSparkles size={13} /> From my project hours
          </Button>
        </span>
      </div>
      <LunchRow personId={personId} lunch={lunch} onChange={setLunch} />
      <div>
        <div
          ref={lineRef}
          className={cx(
            'relative h-16 touch-none overflow-hidden rounded-2xl bg-surface-2 p-1 transition-shadow',
            movedDrag && 'shadow-[inset_0_0_0_2px_rgb(var(--accent)/0.35)]',
          )}
          data-testid="plan-line"
        >
          <div
            className="absolute inset-y-1 z-20 flex items-center justify-center rounded-lg bg-grey/80 text-[11px] font-semibold text-grey-ink backdrop-blur-[1px] transition-all"
            style={{
              left: pos(lunchStart),
              width: `${((lunchEnd - lunchStart) / span) * 100}%`,
              backgroundImage: 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.06) 0 6px, transparent 6px 12px)',
            }}
            title={`Lunch ${lunch.start} to ${lunch.end}${lunch.locked ? ', locked' : ''}`}
          >
            🍽 {lunch.locked && <Lock size={10} className="ml-0.5" />}
          </div>
          <AnimatePresence initial={false}>
            {shownBlocks.map((block) => {
              const id = block.id.split('~')[0];
              const start = toMinutes(block.start);
              const end = toMinutes(block.end);
              const lifted = movedDrag && drag.id === id;
              return (
                <motion.div
                  key={block.id}
                  data-plan-block={id}
                  initial={reduced ? false : LANE_ANIM_IN}
                  animate={{ opacity: 1, scaleY: 1, y: 0, left: pos(start), width: `${((end - start) / span) * 100}%` }}
                  exit={blockExit}
                  transition={transition}
                  whileHover={drag ? undefined : HOVER}
                  onPointerDown={(e) => startDrag(e, id, 'plan')}
                  className={cx(
                    'absolute inset-y-1 cursor-grab touch-none select-none overflow-hidden rounded-lg text-[11px] font-semibold text-white',
                    drag && 'cursor-grabbing',
                    lifted && '!bg-transparent border-2 border-dashed border-accent/60',
                  )}
                  style={{
                    background: lifted ? undefined : blockColor(block.projectId, block.custom, projects),
                    boxShadow: lifted ? 'none' : '0 1px 2px rgb(0 0 0 / 0.15)',
                  }}
                  title={`${blockLabel(block.projectId, block.custom, projects)} · ${block.start} to ${block.end} · drag to move`}
                >
                  {!lifted && (
                    <div className="flex h-full w-full items-center gap-1 truncate px-2">
                      <GripVertical size={12} className="shrink-0 opacity-70" />
                      <span className="truncate">{blockLabel(block.projectId, block.custom, projects)}</span>
                      <span className="ml-auto shrink-0 rounded bg-black/15 px-1 tabular-nums">{formatMinutes(end - start)}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {movedDrag &&
            dragged &&
            ghosts.map((g, index) => (
              <div
                key={index}
                data-drag-ghost
                className={cx(
                  'pointer-events-none absolute inset-y-0 z-30 flex items-center gap-1 overflow-hidden truncate rounded-lg px-2 text-[11px] font-semibold text-white shadow-[0_12px_28px_-8px_rgb(0_0_0/0.55)] ring-2 ring-white/90',
                  overTrash && 'opacity-60 saturate-50',
                )}
                style={{
                  left: pos(g.s),
                  width: `${((g.e - g.s) / span) * 100}%`,
                  background: blockColor(dragged.projectId, dragged.custom, projects),
                  backgroundImage: drag.lane === 'extra' ? STRIPES : undefined,
                  transform: 'translateY(-3px) scale(1.03)',
                }}
              >
                <GripVertical size={12} className="shrink-0 opacity-70" />
                <span className="truncate">
                  {toClock(g.s)} to {toClock(g.e)}
                </span>
              </div>
            ))}
          {extras.length > 0 && (
            <div
              className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-lavender-strong/60"
              style={{ left: pos(extraStart) }}
            />
          )}
          <AnimatePresence initial={false}>
            {shownExtraBlocks.map((block) => {
              const start = toMinutes(block.start);
              const lifted = movedDrag && drag.id === block.id;
              const item = shownExtra.find((x) => x.id === block.id);
              return (
                <motion.div
                  key={block.id}
                  data-extra-block={block.id}
                  initial={reduced ? false : LANE_ANIM_IN}
                  animate={{ opacity: 1, scaleY: 1, y: 0, left: pos(start), width: `${(block.minutes / span) * 100}%` }}
                  exit={blockExit}
                  transition={transition}
                  whileHover={drag ? undefined : HOVER}
                  onPointerDown={(e) => startDrag(e, block.id, 'extra')}
                  className={cx(
                    'absolute inset-y-1 cursor-grab touch-none select-none overflow-hidden rounded-lg text-[11px] font-semibold text-white',
                    lifted && '!bg-transparent border-2 border-dashed border-lavender-strong',
                  )}
                  style={
                    lifted
                      ? undefined
                      : {
                          background: blockColor(item.projectId, undefined, projects),
                          backgroundImage: STRIPES,
                          boxShadow: 'inset 0 -4px 0 rgb(124 58 237 / 0.9)',
                        }
                  }
                  title={`Extra hours · ${blockLabel(item.projectId, undefined, projects)} · ${block.start} to ${block.end} · drag to move`}
                >
                  {!lifted && (
                    <div className="flex h-full w-full items-center gap-1 truncate px-2">
                      <span className="shrink-0 rounded bg-white/25 px-1 text-[9px] font-bold">EXTRA</span>
                      <span className="truncate">{blockLabel(item.projectId, undefined, projects)}</span>
                      <span className="ml-auto shrink-0 rounded bg-black/15 px-1 tabular-nums">{formatMinutes(block.minutes)}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!shownBlocks.length && !shownExtraBlocks.length && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
              Pick a project and a time above, then Add block
            </p>
          )}
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10px] text-faint">
          {Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => (
            <span key={i}>{toClock(WORK_START + i * 60).replace(':00', '')}</span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            Planned <b className="text-ink">{formatMinutes(planTotal)}</b>
            {planEnd > WORK_END && <span className="ml-1 font-semibold text-coral-ink">· runs past 7pm</span>}
          </span>
          {extraTotal > 0 && (
            <span>
              <span className="mr-1 inline-block h-2 w-3 rounded bg-lavender-strong align-middle" />
              Extra hours <b className="text-ink">{formatMinutes(extraTotal)}</b>
            </span>
          )}
          <span>Drag a block along the line to reorder. Lunch stays put and blocks flow around it.</span>
          <motion.div
            ref={trashRef}
            animate={
              overTrash ? { scale: 1.12, rotate: [0, -6, 6, -4, 0] } : movedDrag ? { scale: 1.04, rotate: 0 } : { scale: 1, rotate: 0 }
            }
            transition={overTrash ? { rotate: { duration: 0.4, repeat: Infinity }, scale: SPRING } : SPRING}
            data-testid="plan-trash"
            className={cx(
              'ml-auto flex items-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-2 font-semibold transition-colors',
              overTrash ? 'border-coral-strong bg-coral text-coral-ink' : movedDrag ? 'border-coral-strong/60 text-coral-ink' : 'border-line',
            )}
          >
            <Trash size={14} /> Drop here to delete
          </motion.div>
        </div>
      </div>
      {(groups.length > 0 || extras.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-line" aria-label="Blocks">
          <Reorder.Group as="ul" axis="y" values={shownPlan} onReorder={setListPlan} className="divide-y divide-line">
            {shownPlan.map((group, index) => {
              const pieces = shownBlocks.filter((b) => b.id.split('~')[0] === group.id);
              return (
                <ReorderRow
                  key={group.id}
                  value={group}
                  onEnd={() => endListDrag('plan')}
                  faded={!!(movedDrag && drag.id === group.id)}
                  className="bg-surface"
                  data={{ 'data-plan-row': group.id }}
                >
                  <span className="w-5 text-xs font-bold text-muted">{index + 1}</span>
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: blockColor(group.projectId, group.custom, projects) }} />
                  <span className="min-w-[10rem] flex-1 font-semibold">
                    {editing?.id === group.id && editing.lane === 'plan' ? (
                      <ProjectChanger
                        current={group.projectId}
                        projects={projects}
                        onCancel={() => setEditing(null)}
                        onSave={(to) => {
                          setEditing(null);
                          onChangeProject?.({ lane: 'plan', id: group.id, from: group.projectId, to });
                        }}
                      />
                    ) : (
                      blockLabel(group.projectId, group.custom, projects)
                    )}
                    {group.auto && (
                      <span title="Added automatically from your assigned tasks" className="ml-2 rounded-full bg-lavender/60 px-2 py-0.5 text-[10px] font-bold uppercase text-accent-ink">
                        Auto
                      </span>
                    )}
                    <span className="block text-xs font-normal text-muted">
                      <CalendarClock size={11} className="mr-1 inline" />
                      {pieces.map((b) => `${b.start} to ${b.end}`).join(', ')}
                    </span>
                  </span>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Time
                    <DurationInput
                      label="Planned time"
                      className="w-20"
                      value={group.minutes}
                      onChange={(m) => m && m >= 5 && commitPlan(groups.map((g) => (g.id === group.id ? { ...g, minutes: m } : g)))}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Actual
                    <DurationInput
                      label="Actual time"
                      className="w-20"
                      placeholder="..."
                      value={group.actual}
                      onChange={(m) => commitPlan(groups.map((g) => (g.id === group.id ? { ...g, actual: m ?? undefined } : g)))}
                    />
                  </label>
                  {onChangeProject && (
                    <button
                      aria-label="Edit block project"
                      title={lockNote ? `Change project. ${lockNote}` : 'Change project'}
                      data-testid="edit-block"
                      className="focus-ring pointer-events-auto rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink"
                      onClick={() => setEditing({ id: group.id, lane: 'plan' })}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    aria-label="Remove block"
                    className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                    onClick={() => removeItem(group.id)}
                  >
                    <Trash size={14} />
                  </button>
                </ReorderRow>
              );
            })}
          </Reorder.Group>
          {shownExtra.length > 0 && (
            <Reorder.Group
              as="ul"
              axis="y"
              values={shownExtra}
              onReorder={setListExtra}
              className={cx('divide-y divide-line', shownPlan.length > 0 && 'border-t border-line')}
            >
              {shownExtra.map((item) => {
                const laid = shownExtraBlocks.find((b) => b.id === item.id);
                return (
                  <ReorderRow
                    key={item.id}
                    value={item}
                    onEnd={() => endListDrag('extra')}
                    faded={!!(movedDrag && drag.id === item.id)}
                    className="bg-lavender/20"
                    data={{ 'data-extra-row': item.id }}
                  >
                    <span className="rounded bg-lavender-strong px-1.5 py-0.5 text-[9px] font-bold text-white">EXTRA</span>
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: blockColor(item.projectId, undefined, projects) }} />
                    <span className="min-w-[10rem] flex-1 font-semibold">
                      {editing?.id === item.id && editing.lane === 'extra' ? (
                        <ProjectChanger
                          current={item.projectId}
                          projects={projects}
                          onCancel={() => setEditing(null)}
                          onSave={(to) => {
                            setEditing(null);
                            onChangeProject?.({ lane: 'extra', id: item.id, from: item.projectId, to });
                          }}
                        />
                      ) : (
                        blockLabel(item.projectId, undefined, projects)
                      )}
                      <span className="block text-xs font-normal text-muted">
                        <CalendarClock size={11} className="mr-1 inline" />
                        {laid?.start} to {laid?.end}
                      </span>
                    </span>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      Time
                      <DurationInput
                        label="Extra time"
                        className="w-20"
                        value={item.minutes}
                        onChange={(m) => m && m >= 5 && commitExtra(extras.map((x) => (x.id === item.id ? { ...x, minutes: m } : x)))}
                      />
                    </label>
                    {onChangeProject && (
                      <button
                        aria-label="Edit extra hours project"
                        title={lockNote ? `Change project. ${lockNote}` : 'Change project'}
                        className="focus-ring pointer-events-auto rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-accent-ink"
                        onClick={() => setEditing({ id: item.id, lane: 'extra' })}
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      aria-label="Remove extra hours"
                      className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-coral-ink"
                      onClick={() => removeItem(item.id, 'extra')}
                    >
                      <Trash size={14} />
                    </button>
                  </ReorderRow>
                );
              })}
            </Reorder.Group>
          )}
        </div>
      )}
    </div>
  );
}

export default PlanBuilder;
