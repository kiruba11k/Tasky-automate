// The tracker store. Its data lives on the server and is kept in step by sync.js.
import { create } from "zustand";
import { nextWeekday, todayKey, isWeekday, weekStart, clockToMinutes, nowIso, lunchFor, clockLabel, formatDayMonth } from "./lib/dates.js";
import { moveRows as moveRowsBetween, moveTargetProblem, rescheduleNote } from "./lib/moveRows.js";
import { PEOPLE, TASK_TYPES, isAdminTier, isLeadership, isApprover, approverNames, roleOf } from "./lib/constants.js";
import {
  EMPTY_COUNTS,
  canManageProject,
  computeStandardMinutes,
  defaultTaskTitle,
  emptyDaily,
  emptyWeekly,
  findCustomStandard,
  finalizeProjectsForDay,
  formatMinutes,
  newId,
  randomAlias,
  rollProjectPeriods,
  validateCustomStandards,
  validateHours,
  validateTargets,
  weeklySnapshot,
  dailySnapshot,
  projectWeekStart,
} from "./lib/domain.js";
import { buildEodRequests, decisionFor, eodProjectWork, reviewsAfterMove, sendSummary } from "./lib/eodReview.js";
import { DEFAULT_TEMPLATE_ID, PROJECT_TEMPLATES, templateMetrics, validateMetrics } from "./lib/projectTemplates.js";

/** What the app starts with before the backend answers: nothing. All data lives on the server (see sync.js). */
export const emptyState = () => ({
  me: null,
  profiles: {},
  tasks: [],
  projects: [],
  notices: [],
  convs: [],
  msgs: [],
  aliases: {},
  daily: {},
  weekly: {},
});

export const STORAGE_KEY = "ls-tracker-v2";
export const STORAGE_VERSION = 10;

/** `nt` - display name of a person: custom profile name, else directory name, else "Someone". */
export const displayName = (personId) =>
  useStore.getState().profiles[personId ?? ""]?.name?.trim() ||
  PEOPLE.find((p) => p.id === personId)?.name ||
  "Someone";

/** `be` - first word of the display name. */
export const firstName = (personId) => displayName(personId).split(" ")[0];

/** Rolls project week / month counters forward; used when documents arrive from the server. */
export function mergePersistedState(persisted, current) {
  const stored = persisted;
  return !stored ||
    !Array.isArray(stored.tasks) ||
    !Array.isArray(stored.projects) ||
    stored.projects.some((p) => !Array.isArray(p.admins) || !p.finalized) ||
    stored.tasks.some((t) => !Array.isArray(t.history))
    ? current
    : { ...current, ...stored, projects: stored.projects.map(rollProjectPeriods) };
}

/** `Se` - the app store. State shape = `buildInitialState()` plus the actions below. */
export const useStore = create()(
    (set, get) => {
      // ------------------------------------------------------------ helpers
      /** `n` - push a notice for `to`. */
      const notify = (to, text, kind = "task") =>
        set((s) => ({
          notices: [{ id: newId(), to, text, at: nowIso(), read: false, kind }, ...s.notices],
        }));
      /** `r` - merge a patch into one task. */
      const patchTask = (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      /** `i` */
      const requireTask = (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) throw new Error("That task no longer exists.");
        return task;
      };
      /** `a` - history list with a new entry appended. */
      const withHistory = (task, action, extra = {}) => [
        ...(task.history ?? []),
        { at: nowIso(), by: get().me, action, ...extra },
      ];
      /** `s` - transform one project. */
      const patchProject = (id, fn) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));
      /** `u` */
      const requireProject = (id) => {
        const project = get().projects.find((p) => p.id === id);
        if (!project) throw new Error("Project not found.");
        return project;
      };
      /** Only the task's reviewer (a resource's project manager) may approve it, send it back or pass the review on. */
      const requireWaiting = (task) => {
        if (task.status !== "in_review")
          throw new Error(task.status === "done" ? "This task was already approved." : "This task is no longer waiting for review (it was just handled).");
      };
      const requireReviewer = (task) => {
        if (task.reviewerId !== get().me)
          throw new Error(`Only ${displayName(task.reviewerId)}, who reviews this task, can do that.`);
      };
      /** `c` - project must be manageable (owner / admin / leadership) by me. */
      const requireManage = (id) => {
        const project = requireProject(id);
        if (!canManageProject(project, get().me))
          throw new Error("Only the project owner or a project admin can change this.");
        return project;
      };
      /** `f` - project must be owned by me (or I am leadership). */
      const requireOwner = (id) => {
        const project = requireProject(id);
        if (project.pmId !== get().me && !isLeadership(roleOf(get().me)))
          throw new Error("Only the project owner can do this.");
        return project;
      };
      /** Ids of the other approvers: project proposals are sent only to them. */
      const approverIds = () => PEOPLE.filter((p) => p.approver && p.id !== get().me).map((p) => p.id);
      /** `p` - ids of the other admins: managers, founders and project managers (they approve projects). */
      const leadershipIds = () => PEOPLE.filter((p) => isAdminTier(p.role) && p.id !== get().me).map((p) => p.id);
      /** `h` - validate an assignment draft and build the task record. */
      const buildTask = (draft, priority) => {
        const me = get().me;
        if (!draft.assigneeId) throw new Error("Pick who the task is for.");
        if (!draft.projectId) throw new Error("Pick a project for the task.");
        if (!(draft.qty > 0)) throw new Error("Quantity must be at least 1.");
        if (!(draft.targetMinutes > 0)) throw new Error("Target time must be at least 1 minute.");
        const project = requireProject(draft.projectId);
        // the owner, an admin or anyone on the project's team assigns its tasks
        if (!canManageProject(project, me) && !project.teamIds.includes(me))
          throw new Error(`Only people on ${project.name} can assign its tasks.`);
        if (project.status !== "active")
          throw new Error(`${project.name} is still waiting for approval.`);
        let typeId = draft.typeId;
        let custom =
          typeId === "custom"
            ? (findCustomStandard(project, draft.customStandardId) ??
              findCustomStandard(project, draft.customName))
            : undefined;
        if (typeId !== "custom" && !TASK_TYPES.some((t) => t.id === typeId)) {
          custom = findCustomStandard(project, typeId);
          if (!custom) throw new Error("Pick a task type.");
          typeId = "custom";
        }
        const isCustom = typeId === "custom";
        const customName = isCustom ? custom?.name || draft.customName?.trim() || "" : undefined;
        if (isCustom && !customName) throw new Error("Name the custom task.");
        const type = TASK_TYPES.find((t) => t.id === typeId);
        const unit = isCustom
          ? custom?.unit || draft.customUnit?.trim() || "items"
          : (type?.unit ?? "items");
        const title =
          draft.title?.trim() ||
          (isCustom ? `${draft.qty} ${customName}` : defaultTaskTitle(typeId, draft.qty, draft.variant));
        const targetMinutes = Math.round(draft.targetMinutes);
        const at = nowIso();
        return {
          id: newId(),
          typeId,
          variant: isCustom ? undefined : draft.variant,
          customName,
          customStandardId: custom?.id,
          unit,
          qty: draft.qty,
          targetMinutes,
          standardMinutes:
            computeStandardMinutes(project, typeId, draft.qty, draft.variant, custom?.id) ?? targetMinutes,
          projectId: draft.projectId,
          assigneeId: draft.assigneeId,
          assignedById: me,
          priority,
          status: "todo",
          feedback: [],
          createdAt: at,
          date: isWeekday(todayKey(0)) ? todayKey(0) : nextWeekday(todayKey(0)),
          reminders: 0,
          reviews: [],
          title,
          history: [{ at, by: me, action: "assigned", to: draft.assigneeId }],
          resubmits: 0,
        };
      };
      /** `y` - set this week's numbers, mirroring the difference into the month. */
      const applyWeekValues = (projectId, values) =>
        patchProject(projectId, (project) => {
          const week = { ...project.week };
          const month = { ...project.month };
          Object.entries(values).forEach(([key, value]) => {
            const next = Math.max(0, Math.round(Number(value) || 0));
            const delta = next - (week[key] ?? 0);
            week[key] = next;
            month[key] = Math.max(0, (month[key] ?? 0) + delta);
          });
          return { ...project, week, month };
        });

      /** Trims links, adds https:// when it is missing and refuses anything that is not a web address. */
      const normalizeLinks = (links) =>
        (links ?? [])
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            const withScheme = /^https?:\/\//i.test(l) ? l : `https://${l}`;
            try {
              return new URL(withScheme).href;
            } catch {
              throw new Error(`"${l}" does not look like a link.`);
            }
          });

      return {
        ...emptyState(),
        setMe: (id) => set({ me: id }),
        startTask: (id) => patchTask(id, { status: "in_progress" }),
        undoStart: (id) => patchTask(id, { status: "todo" }),
        /** Sends work that was not assigned as a task to someone for approval (an ad-hoc task that starts in review). */
        requestApproval: ({ projectId, title, links, reviewerId, note }) => {
          const me = get().me;
          if (!projectId) throw new Error("Pick a project.");
          if (!title.trim()) throw new Error("Type what the task was.");
          if (!reviewerId) throw new Error("Choose who should approve it.");
          const cleanLinks = normalizeLinks(links);
          const at = nowIso();
          const task = {
            id: newId(),
            typeId: "custom",
            customName: title.trim(),
            unit: "task",
            qty: 1,
            doneQty: 1,
            targetMinutes: 30,
            minutes: 30,
            standardMinutes: 30,
            projectId,
            assigneeId: me,
            assignedById: me,
            reviewerId,
            priority: false,
            status: "in_review",
            adhoc: true,
            links: cleanLinks,
            feedback: note?.trim() ? [{ by: me, text: note.trim(), at }] : [],
            createdAt: at,
            date: todayKey(0),
            reminders: 0,
            reviews: [],
            title: title.trim(),
            history: [{ at, by: me, action: "submitted", to: reviewerId, note: note?.trim() || undefined }],
            resubmits: 0,
            submittedAt: at,
          };
          set((s) => ({ tasks: [task, ...s.tasks] }));
          notify(
            reviewerId,
            `${firstName(me)} sent ${task.title} to you for approval${cleanLinks.length ? ` with ${cleanLinks.length} link${cleanLinks.length > 1 ? "s" : ""}` : ""}`,
          );
        },
        submitForReview: (id, doneQty, minutes, reviewerId, links) => {
          const task = requireTask(id);
          if (!(doneQty > 0)) throw new Error("Enter how many you completed.");
          if (!(minutes > 0)) throw new Error("Enter the minutes you took.");
          if (!reviewerId) throw new Error("Choose who should review it.");
          // A resource's work is always approved by the project manager of its project.
          if (roleOf(task.assigneeId) === "resource") {
            const pmId = get().projects.find((p) => p.id === task.projectId)?.pmId;
            if (!pmId) throw new Error("This project has no project manager to review it.");
            reviewerId = pmId;
          }
          const isResubmit =
            task.status === "changes" ||
            task.reviews.some((r) => r.verdict === "feedback") ||
            (task.history ?? []).some((h) => h.action === "feedback");
          const resubmits = (task.resubmits ?? 0) + (isResubmit ? 1 : 0);
          const at = nowIso();
          patchTask(id, {
            status: "in_review",
            doneQty,
            minutes,
            reviewerId,
            links: links ? normalizeLinks(links) : task.links,
            submittedAt: at,
            resubmits,
            history: [
              ...(task.history ?? []),
              {
                at,
                by: get().me,
                action: isResubmit ? "resubmitted" : "submitted",
                to: reviewerId,
              },
            ],
          });
          notify(
            reviewerId,
            isResubmit
              ? `${firstName(task.assigneeId)} resubmitted ${task.title} for review (resubmit ${resubmits})`
              : `${firstName(task.assigneeId)} sent ${task.title} to you for review`,
          );
        },
        approve: (id) => {
          const task = requireTask(id);
          requireReviewer(task);
          requireWaiting(task);
          const at = nowIso();
          patchTask(id, {
            status: "done",
            approvedAt: at,
            reviews: [...task.reviews, { by: get().me, verdict: "approved", at }],
            history: [...(task.history ?? []), { at, by: get().me, action: "approved" }],
          });
          notify(task.assigneeId, `${firstName(get().me)} approved ${task.title} ✓`);
        },
        /** Approve some of a submitted task and send the rest back for rework as a new task. */
        approvePart: (id, count, note) => {
          const task = requireTask(id);
          requireReviewer(task);
          requireWaiting(task);
          const submitted = task.doneQty ?? task.qty;
          const part = Math.round(count);
          if (!(part >= 1) || part >= task.qty)
            throw new Error(`Approve between 1 and ${task.qty - 1} (or use Approve for all of it).`);
          if (part > submitted) throw new Error(`Only ${submitted} were submitted.`);
          if (!note.trim()) throw new Error("Say what needs rework for the rest.");
          const at = nowIso();
          const me = get().me;
          const rest = task.qty - part;
          const mins = (n) => Math.max(1, Math.round((task.targetMinutes * n) / task.qty));
          const title = (n) => (/^\d+/.test(task.title) ? task.title.replace(/^\d+/, String(n)) : `${n} of ${task.title}`);
          patchTask(id, {
            status: "done",
            qty: part,
            doneQty: part,
            title: title(part),
            targetMinutes: mins(part),
            standardMinutes: task.standardMinutes ? Math.round((task.standardMinutes * part) / task.qty) : undefined,
            approvedAt: at,
            reviews: [...task.reviews, { by: me, verdict: "approved", at }],
            history: [
              ...(task.history ?? []),
              { at, by: me, action: "approved", note: `Approved ${part} of ${task.qty}; ${rest} sent back for rework` },
            ],
          });
          const redo = {
            ...task,
            id: newId(),
            qty: rest,
            doneQty: undefined,
            minutes: undefined,
            title: title(rest),
            targetMinutes: mins(rest),
            standardMinutes: task.standardMinutes ? Math.round((task.standardMinutes * rest) / task.qty) : undefined,
            status: "changes",
            reworkOf: id,
            feedback: [...task.feedback, { by: me, text: note.trim(), at }],
            reviews: [{ by: me, verdict: "feedback", at }],
            approvedAt: undefined,
            submittedAt: undefined,
            resubmits: 0,
            history: [...(task.history ?? []), { at, by: me, action: "feedback", note: `${rest} of ${task.qty} need rework: ${note.trim()}` }],
          };
          set((s) => ({ tasks: [redo, ...s.tasks] }));
          notify(task.assigneeId, `${firstName(me)} approved ${part} of ${task.qty} on ${task.title}. ${rest} need rework: ${note.trim()}`);
        },
        sendBack: (id, text) => {
          const task = requireTask(id);
          requireReviewer(task);
          requireWaiting(task);
          if (!text.trim()) throw new Error("Feedback cannot be empty.");
          const at = nowIso();
          patchTask(id, {
            status: "changes",
            feedback: [...task.feedback, { by: get().me, text: text.trim(), at }],
            reviews: [...task.reviews, { by: get().me, verdict: "feedback", at }],
            history: [
              ...(task.history ?? []),
              { at, by: get().me, action: "feedback", note: text.trim() },
            ],
          });
          notify(task.assigneeId, `${firstName(get().me)} left feedback on ${task.title}`);
        },
        deleteTask: (id) => {
          const task = requireTask(id);
          const me = get().me;
          if (task.assignedById !== me && !isAdminTier(roleOf(me)))
            throw new Error("Only the person who assigned a task, or an admin, can delete it.");
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
          if (task.assigneeId !== me) notify(task.assigneeId, `${firstName(me)} removed the task ${task.title}`);
        },
        assign: (draft) => {
          const me = get().me;
          const task = buildTask(draft, isAdminTier(roleOf(me))); // tasks from any admin (manager, founder, project manager) are priority tasks
          set((s) => ({ tasks: [task, ...s.tasks] }));
          notify(
            draft.assigneeId,
            `${firstName(me)} gave you ${task.priority ? "a priority task" : "a task"}: ${task.title}`,
          );
        },
        assignMany: (drafts) => {
          if (!drafts.length) throw new Error("Add at least one task to the list first.");
          const me = get().me;
          const created = drafts.map((d) => buildTask(d, !!d.priority));
          set((s) => ({ tasks: [...created, ...s.tasks] }));
          const byAssignee = new Map();
          created.forEach((t) =>
            byAssignee.set(t.assigneeId, [...(byAssignee.get(t.assigneeId) ?? []), t]),
          );
          byAssignee.forEach((list, assignee) => {
            const priorityCount = list.filter((t) => t.priority).length;
            notify(
              assignee,
              list.length === 1
                ? `${firstName(me)} gave you ${priorityCount ? "a priority task" : "a task"}: ${list[0].title}`
                : `${firstName(me)} gave you ${list.length} tasks for today${priorityCount ? ` (${priorityCount} priority)` : ""}`,
            );
          });
        },
        setProfile: (personId, patch) =>
          set((s) => ({
            profiles: { ...s.profiles, [personId]: { ...s.profiles[personId], ...patch } },
          })),
        editTask: (id, edit) => {
          const task = requireTask(id);
          if (!(edit.qty > 0) || !(edit.targetMinutes > 0))
            throw new Error("Quantity and target time must be above zero.");
          if (!edit.title.trim()) throw new Error("Title cannot be empty.");
          const targetMinutes = Math.round(edit.targetMinutes);
          const changes = [
            edit.qty !== task.qty && `quantity ${task.qty} to ${edit.qty}`,
            targetMinutes !== task.targetMinutes &&
              `target ${formatMinutes(task.targetMinutes)} to ${formatMinutes(targetMinutes)}`,
            edit.title.trim() !== task.title && `title "${edit.title.trim()}"`,
          ].filter(Boolean);
          const standardMinutes =
            task.standardMinutes && edit.qty !== task.qty
              ? Math.max(1, Math.round((task.standardMinutes * edit.qty) / task.qty))
              : task.standardMinutes;
          patchTask(id, {
            qty: edit.qty,
            targetMinutes,
            title: edit.title.trim(),
            standardMinutes,
            history: changes.length
              ? withHistory(task, "edited", { note: changes.join(", ") })
              : task.history,
          });
          notify(task.assigneeId, `${firstName(get().me)} updated your task: ${edit.title.trim()}`);
        },
        /**
         * Change the day of a task (the assignee or whoever assigned it): rows, the Dashboard and the weekly views follow because
         * they are built from `task.date`. Status and numbers stay. The other party is told.
         */
        rescheduleTask: (id, date) => {
          const task = requireTask(id);
          const me = get().me;
          if (task.assigneeId !== me && task.assignedById !== me) throw new Error("Only the person it was given to, or who gave it, can change its day.");
          if (["done", "in_review"].includes(task.status)) throw new Error("This task is already sent in, so its day cannot change.");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("Pick a date.");
          if (date === task.date) return;
          const note = rescheduleNote(formatDayMonth(task.date), formatDayMonth(date), firstName(me));
          patchTask(id, { date, history: withHistory(task, "rescheduled", { note: note.note }) });
          const other = me === task.assigneeId ? task.assignedById : task.assigneeId;
          if (other && other !== me) notify(other, `${firstName(me)} moved ${task.title} from ${formatDayMonth(task.date)} to ${formatDayMonth(date)}`);
        },
        /**
         * Move logged rows of one of my days to another day (`ids` picks rows, all when omitted; `fromRows` are the rows as the screen
         * holds them). The target day is saved first and the source second; when the second save is refused the first is undone.
         * Returns the number of rows moved.
         */
        moveDayRows: (personId, from, to, { ids, fromRows } = {}) => {
          if (personId !== get().me) throw new Error("You can only move your own rows.");
          if (from === to) return 0;
          const fromKey = `${personId}|${from}`;
          const toKey = `${personId}|${to}`;
          const toRecord = get().daily[toKey];
          const why = moveTargetProblem(to, toRecord);
          if (why) throw new Error(why);
          const res = moveRowsBetween({
            fromEntries: fromRows ?? get().daily[fromKey]?.entries ?? [],
            toEntries: toRecord?.entries ?? [],
            ids,
            targetDate: to,
            newId,
          });
          if (!res) return 0;
          const before = toRecord?.entries;
          get().saveDaily(personId, to, { entries: res.to });
          try {
            const sentAt = get().daily[fromKey]?.eodAt;
            get().saveDaily(personId, from, { entries: res.from, ...(sentAt ? { eodAt: sentAt } : {}) }); // a sent day (opened with Update) refreshes its snapshot
          } catch (e) {
            get().saveDaily(personId, to, { entries: before ?? [] });
            throw e;
          }
          return res.moved;
        },
        /**
         * Move the rows added to a week ("Add to the week", all those that count as `rowKeyText`) to the week of another day. Same order
         * as moveDayRows: the target week first, then this one, undone when the second save fails. Returns the number of rows moved.
         */
        moveWeekRows: (personId, fromWeek, toDate, match) => {
          if (personId !== get().me) throw new Error("You can only move your own rows.");
          const fromMon = weekStart(fromWeek);
          const toMon = weekStart(toDate);
          if (fromMon === toMon) throw new Error("Pick a day in another week.");
          const fromRec = get().weekly[`${personId}|${fromMon}`];
          const toRec = get().weekly[`${personId}|${toMon}`];
          if (toRec?.eowAt) throw new Error("That week was already submitted, so rows cannot be added to it.");
          const moving = (fromRec?.entries ?? []).filter(match);
          if (!moving.length) return 0;
          const before = toRec?.entries;
          get().saveWeekly(personId, toMon, { entries: [...(before ?? []), ...moving.map((r) => ({ ...r, id: newId() }))] });
          try {
            get().saveWeekly(personId, fromMon, { entries: (fromRec?.entries ?? []).filter((r) => !match(r)) });
          } catch (e) {
            get().saveWeekly(personId, toMon, { entries: before ?? [] });
            throw e;
          }
          return moving.length;
        },
        remind: (id) => {
          const task = requireTask(id);
          patchTask(id, {
            reminders: task.reminders + 1,
            history: withHistory(task, "reminded", { to: task.assigneeId }),
          });
          notify(task.assigneeId, `⏰ Reminder from ${firstName(get().me)}: ${task.title} is still open`);
        },
        setTarget: (projectId, field, key, value) => {
          const project = requireManage(projectId);
          if (
            (field === "weekTarget" && project.weekLocked) ||
            (field === "monthTarget" && project.monthLocked)
          )
            throw new Error("Unlock the targets to edit them.");
          patchProject(projectId, (p) => ({
            ...p,
            [field]: { ...p[field], [key]: Math.max(0, Math.round(value) || 0) },
          }));
        },
        setLock: (projectId, which, locked) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({
            ...p,
            [which === "week" ? "weekLocked" : "monthLocked"]: locked,
          }));
          if (locked)
            leadershipIds().forEach((id) =>
              notify(
                id,
                `${firstName(get().me)} locked ${which}ly targets for ${get().projects.find((p) => p.id === projectId)?.name}`,
                "project",
              ),
            );
        },
        bump: (projectId, key, delta) => {
          requireManage(projectId);
          const apply = (counts) => ({ ...counts, [key]: Math.max(0, (counts[key] ?? 0) + delta) });
          patchProject(projectId, (p) => ({ ...p, week: apply(p.week), month: apply(p.month) }));
        },
        forwardReview: (id, toId, note) => {
          const task = requireTask(id);
          requireReviewer(task);
          requireWaiting(task);
          if (!toId || toId === get().me) throw new Error("Choose someone else to forward to.");
          const at = nowIso();
          patchTask(id, {
            reviewerId: toId,
            feedback: note?.trim()
              ? [...task.feedback, { by: get().me, text: `Forwarded: ${note.trim()}`, at }]
              : task.feedback,
            history: [
              ...(task.history ?? []),
              {
                at,
                by: get().me,
                action: "forwarded",
                to: toId,
                note: note?.trim() || undefined,
              },
            ],
          });
          notify(
            toId,
            `${firstName(get().me)} forwarded ${firstName(task.assigneeId)}'s ${task.title} to you for review`,
          );
          notify(
            task.assigneeId,
            `${firstName(get().me)} passed your ${task.title} to ${firstName(toId)} for review`,
          );
        },
        saveWeekly: (personId, week, patch) => {
          const monday = weekStart(week);
          const key = `${personId}|${monday}`;
          const record = { ...emptyWeekly(), ...get().weekly[key], ...patch };
          if ("eowAt" in patch) {
            if (patch.eowAt)
              record.eowSnapshot = weeklySnapshot(get().tasks, personId, monday, record, patch.eowAt, { daily: get().daily, projects: get().projects });
            else delete record.eowSnapshot;
          }
          set((s) => ({ weekly: { ...s.weekly, [key]: record } }));
        },
        updateProject: (projectId, patch) => {
          requireManage(projectId);
          if (patch.name !== undefined && !patch.name.trim())
            throw new Error("Project name cannot be empty.");
          if (patch.startDate && patch.endDate && patch.endDate < patch.startDate)
            throw new Error("End date must be after the start date.");
          if (patch.standards && Object.values(patch.standards).some((v) => !(v > 0)))
            throw new Error("Standard times must be above zero.");
          const hours = patch.hours ? validateHours(patch.hours) : undefined;
          const customStandards = patch.customStandards
            ? validateCustomStandards(patch.customStandards)
            : undefined;
          if (patch.template !== undefined && !PROJECT_TEMPLATES.some((t) => t.id === patch.template))
            throw new Error("Pick one of the project templates.");
          const metrics = patch.metrics ? validateMetrics(patch.metrics) : undefined;
          patchProject(projectId, (p) => {
            const nextHours = hours ?? p.hours;
            const teamIds = hours
              ? [...new Set([...Object.keys(nextHours).filter((id) => nextHours[id] > 0), p.pmId])]
              : p.teamIds;
            return {
              ...p,
              ...patch,
              hours: nextHours,
              teamIds,
              customStandards: customStandards ?? p.customStandards,
              metrics: metrics ?? p.metrics,
            };
          });
        },
        setWeekValue: (projectId, key, value) => {
          requireManage(projectId);
          applyWeekValues(projectId, { [key]: value });
        },
        setWeekValues: (projectId, values) => {
          requireManage(projectId);
          applyWeekValues(projectId, values);
        },
        saveDaily: (personId, day, patch) => {
          const key = `${personId}|${day}`;
          let next = patch;
          if (next.plan) {
            for (const block of next.plan) {
              if (block.custom ? !block.custom.title.trim() : !block.projectId)
                throw new Error(
                  block.custom
                    ? "Give the custom block a title."
                    : "Pick a project for every time block.",
                );
              if (block.end <= block.start)
                throw new Error("A time block must end after it starts.");
              if (
                block.actualMinutes != null &&
                (!Number.isFinite(block.actualMinutes) ||
                  block.actualMinutes < 0 ||
                  block.actualMinutes > 720)
              )
                throw new Error("Actual time must be between 0 and 12 hours.");
            }
            const lunch = next.lunch ?? lunchFor(get().daily, personId, day, get().profiles);
            for (const block of next.plan)
              if (block.start < lunch.end && block.end > lunch.start)
                throw new Error(`${clockLabel(lunch.start)} to ${clockLabel(lunch.end)} is lunch 🍽, move that block around it.`);
            const sorted = [...next.plan].sort((a, b) => a.start.localeCompare(b.start));
            for (let i = 1; i < sorted.length; i++)
              if (sorted[i].start < sorted[i - 1].end)
                throw new Error("Two time blocks overlap, adjust the times.");
            next = {
              ...next,
              plan: next.plan.map((b) =>
                b.actualMinutes != null ? { ...b, actualMinutes: Math.round(b.actualMinutes) } : b,
              ),
            };
          }
          if (next.extra)
            next = {
              ...next,
              extra: next.extra.map((x) => {
                if (!x.work?.trim()) throw new Error("Say what the extra hours were for.");
                let minutes = Math.round(Number(x.minutes) || 0);
                if (x.start && x.end) {
                  if (x.end <= x.start)
                    throw new Error("Extra hours must end after they start.");
                  minutes = clockToMinutes(x.end) - clockToMinutes(x.start);
                }
                if (!(minutes > 0) || minutes > 720)
                  throw new Error("Extra time must be between 1 minute and 12 hours.");
                return {
                  ...x,
                  id: x.id || newId(),
                  work: x.work.trim(),
                  minutes,
                  projectId: x.projectId || undefined,
                };
              }),
            };
          if (next.lunch) {
            const { start, end } = next.lunch;
            if (!/^\d\d:\d\d$/.test(start ?? "") || !/^\d\d:\d\d$/.test(end ?? ""))
              throw new Error("Pick when lunch starts and ends.");
            if (end <= start) throw new Error("Lunch must end after it starts.");
            if (start < "10:00" || end > "19:00") throw new Error("Lunch has to fall between 10am and 7pm.");
            for (const block of next.plan ?? get().daily[key]?.plan ?? [])
              if (block.start < end && block.end > start)
                throw new Error(`Lunch overlaps a time block (${block.start} to ${block.end}), move one of them.`);
          }
          const record = { ...emptyDaily(), ...get().daily[key], ...next };
          if ("eodAt" in next) {
            if (next.eodAt)
              record.eodSnapshot = dailySnapshot(get().tasks, personId, day, record, next.eodAt, { projects: get().projects });
            else delete record.eodSnapshot;
          }
          // Sending the end of day (again) asks each project's manager to approve the work reported for it. A project change that
          // only re-saves the same sending time does not ask again. Reviews never change any number.
          let sends = [];
          if (next.eodAt && next.eodAt !== get().daily[key]?.eodAt && personId === get().me) {
            const built = buildEodRequests({ record, projects: get().projects, personId, at: next.eodAt });
            const worked = new Set(eodProjectWork(record).map((w) => w.projectId));
            const kept = Object.fromEntries(Object.entries(record.eodReviews ?? {}).filter(([pid]) => worked.has(pid))); // a request for work that is gone is dropped
            const merged = { ...kept, ...built.reviews };
            if (Object.keys(merged).length) record.eodReviews = merged;
            else delete record.eodReviews;
            sends = built.sends;
          } else if (next.eodAt && next.eodAt === get().daily[key]?.eodAt && personId === get().me) {
            // Change project on a sent day: the review moves with the rows and plan time.
            const moved = reviewsAfterMove({ prev: get().daily[key], record, projects: get().projects, personId, at: nowIso() });
            if (moved.changed) {
              if (Object.keys(moved.reviews).length) record.eodReviews = moved.reviews;
              else delete record.eodReviews;
            }
            sends = moved.sends;
          }
          set((s) => ({
            daily: { ...s.daily, [key]: record },
            projects: next.eodAt
              ? finalizeProjectsForDay(s.projects, personId, day, next.eodAt, {
                  ...s.daily,
                  [key]: record,
                }, s.profiles)
              : s.projects,
          }));
          for (const send of sends) {
            const name = get().projects.find((p) => p.id === send.projectId)?.name ?? "a project";
            notify(send.reviewerId, `${firstName(personId)} sent end of day for ${name} (${sendSummary(send.rows, send.minutes)}), waiting for your approval`, "eod");
          }
        },
        /** The project's manager (or leadership) approves, or sends back with feedback, the work a person reported for a project on a day. */
        decideEod: (personId, day, projectId, verdict, note = "") => {
          const key = `${personId}|${day}`;
          const record = get().daily[key];
          const review = record?.eodReviews?.[projectId];
          const project = requireProject(projectId);
          const me = get().me;
          if (project.pmId !== me && !isLeadership(roleOf(me)))
            throw new Error(`Only ${displayName(project.pmId)}, who manages this project, can do that.`);
          if (!review) throw new Error("That end of day is no longer waiting for approval.");
          if (review.status !== "pending") throw new Error("This end of day was already handled.");
          const decision = decisionFor(review, verdict, me, nowIso(), note);
          set((s) => ({ daily: { ...s.daily, [key]: { ...s.daily[key], eodReviews: { ...s.daily[key].eodReviews, [projectId]: decision } } } }));
          notify(
            personId,
            verdict === "approved"
              ? `${firstName(me)} approved your end of day for ${project.name} ✓`
              : `${firstName(me)} asked for changes on your end of day for ${project.name}: ${decision.note}`,
            "eod",
          );
        },
        finalizeDay: (projectId, day = todayKey(0)) => {
          const at = nowIso();
          if (projectId) {
            requireManage(projectId);
            patchProject(projectId, (p) => ({
              ...p,
              finalized: { ...p.finalized, [day]: p.finalized?.[day] ?? at },
            }));
            return;
          }
          set((s) => ({ projects: finalizeProjectsForDay(s.projects, s.me, day, at) }));
        },
        setMetricPeriods: (projectId, metricId, periods) => {
          requireManage(projectId);
          if (!periods.length) throw new Error("Track it at least weekly or monthly.");
          patchProject(projectId, (p) => ({
            ...p,
            metrics: p.metrics.map((m) => (m.id === metricId ? { ...m, periods } : m)),
          }));
        },
        addMetric: (projectId, label, periods) => {
          const project = requireManage(projectId);
          const name = label.trim();
          if (!name) throw new Error("Name the number you want to track.");
          if (project.metrics.some((m) => m.label.toLowerCase() === name.toLowerCase()))
            throw new Error("That is already being tracked.");
          patchProject(projectId, (p) => ({
            ...p,
            metrics: [
              ...p.metrics,
              { id: newId(), label: name, periods: periods?.length ? periods : ["week", "month"] },
            ],
          }));
        },
        removeMetric: (projectId, metricId) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({
            ...p,
            metrics: p.metrics.filter((m) => m.id !== metricId),
          }));
        },
        renameMetric: (projectId, metricId, label) => {
          requireManage(projectId);
          if (!label.trim()) throw new Error("Name cannot be empty.");
          patchProject(projectId, (p) => ({
            ...p,
            metrics: p.metrics.map((m) => (m.id === metricId ? { ...m, label: label.trim() } : m)),
          }));
        },
        addMeeting: (projectId, meeting) => {
          requireManage(projectId);
          if (!meeting.company.trim()) throw new Error("Add the company name.");
          if (!meeting.date) throw new Error("Pick a meeting date.");
          patchProject(projectId, (p) => ({
            ...p,
            meetings: [
              ...p.meetings,
              { id: newId(), ...meeting, company: meeting.company.trim() },
            ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
            week: { ...p.week, meetings: (p.week.meetings ?? 0) + 1 },
            month: { ...p.month, meetings: (p.month.meetings ?? 0) + 1 },
          }));
        },
        updateMeeting: (projectId, meetingId, patch) => {
          requireManage(projectId);
          if (!patch.company?.trim()) throw new Error("Add the company name.");
          if (!patch.date) throw new Error("Pick a meeting date.");
          patchProject(projectId, (p) => ({
            ...p,
            meetings: p.meetings
              .map((m) => (m.id === meetingId ? { ...m, ...patch, company: patch.company.trim() } : m))
              .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
          }));
        },
        removeMeeting: (projectId, meetingId) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({
            ...p,
            meetings: p.meetings.filter((m) => m.id !== meetingId),
            week: { ...p.week, meetings: Math.max(0, (p.week.meetings ?? 0) - 1) },
            month: { ...p.month, meetings: Math.max(0, (p.month.meetings ?? 0) - 1) },
          }));
        },
        editUpdate: (projectId, updateId, text) => {
          requireManage(projectId);
          if (!text.trim()) throw new Error("Write the update first.");
          patchProject(projectId, (p) => ({
            ...p,
            updates: p.updates.map((u) => (u.id === updateId ? { ...u, text: text.trim(), editedAt: nowIso() } : u)),
          }));
        },
        removeUpdate: (projectId, updateId) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({ ...p, updates: p.updates.filter((u) => u.id !== updateId) }));
        },
        postUpdate: (projectId, text) => {
          const project = requireManage(projectId);
          if (!text.trim()) throw new Error("Write the update first.");
          patchProject(projectId, (p) => ({
            ...p,
            updates: [{ id: newId(), text: text.trim(), at: nowIso(), by: get().me }, ...p.updates],
          }));
          project.teamIds
            .filter((id) => id !== get().me)
            .forEach((id) => notify(id, `${firstName(get().me)} posted an update on ${project.name}`, "project"));
        },
        proposeProject: (draft) => {
          const me = get().me;
          if (!draft.name.trim()) throw new Error("Give the project a name.");
          if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate)
            throw new Error("End date must be after the start date.");
          if (draft.standards && Object.values(draft.standards).some((v) => !(v > 0)))
            throw new Error("Standard times must be above zero.");
          const hours = validateHours(draft.hours);
          const customStandards = validateCustomStandards(draft.customStandards ?? []);
          const template = draft.template ?? DEFAULT_TEMPLATE_ID;
          if (!PROJECT_TEMPLATES.some((t) => t.id === template)) throw new Error("Pick one of the project templates.");
          const metrics = draft.metrics ? validateMetrics(draft.metrics) : templateMetrics(template);
          const teamIds = Object.keys(hours).filter((id) => hours[id] > 0);
          if (!teamIds.includes(me)) teamIds.push(me);
          const admins = [
            ...new Set(
              (draft.admins ?? []).filter((id) => id !== me && PEOPLE.some((p) => p.id === id)),
            ),
          ];
          const weekPlans = Object.fromEntries(
            Object.entries(draft.weekPlans ?? {}).map(([week, counts]) => [week, validateTargets(counts)]),
          );
          const autoApprove = isApprover(me); // only approvers put a project live; everyone else sends it for approval
          const id = newId();
          set((s) => ({
            projects: [
              ...s.projects,
              {
                id,
                name: draft.name.trim(),
                client: draft.client.trim() || draft.name.trim(),
                description: draft.description.trim(),
                pmId: me,
                admins,
                status: autoApprove ? "active" : "pending",
                teamIds,
                startDate: draft.startDate,
                endDate: draft.endDate,
                hours,
                standards: draft.standards,
                typeMinutes: draft.typeMinutes,
                typesOff: draft.typesOff,
                customStandards,
                template,
                metrics,
                weekTarget: draft.weekTarget ? validateTargets(draft.weekTarget) : { ...EMPTY_COUNTS },
                monthTarget: { ...EMPTY_COUNTS },
                weekPlans,
                weekLocked: false,
                monthLocked: false,
                week: { ...EMPTY_COUNTS },
                month: { ...EMPTY_COUNTS },
                meetings: [],
                pastWeeks: [],
                pastMonths: [],
                updates: [],
                finalized: {},
              },
            ],
          }));
          if (!autoApprove)
            approverIds().forEach((lid) =>
              notify(
                lid,
                `${firstName(me)} proposed a new project: ${draft.name.trim()}, waiting for approval`,
                "project",
              ),
            );
          if (autoApprove)
            admins.forEach((aid) =>
              notify(aid, `${firstName(me)} made you an admin of ${draft.name.trim()}`, "project"),
            );
          return id;
        },
        deleteProject: (projectId) => {
          const project = requireProject(projectId);
          const me = get().me;
          if (!isApprover(me) && project.pmId !== me)
            throw new Error("Only the project's manager or an approver can delete a project.");
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== projectId),
            tasks: s.tasks.filter((t) => t.projectId !== projectId),
          }));
          project.teamIds.filter((id) => id !== me).forEach((id) => notify(id, `${firstName(me)} deleted the project ${project.name}`, "project"));
        },
        decideProject: (projectId, approved) => {
          const project = get().projects.find((p) => p.id === projectId);
          if (!project) throw new Error("Project not found.");
          if (!isApprover(get().me)) throw new Error(`Only ${approverNames()} can approve or decline projects.`);
          if (approved) {
            patchProject(projectId, (p) => ({ ...p, status: "active" }));
            notify(
              project.pmId,
              `${firstName(get().me)} approved ${project.name}, you can now assign tasks 🎉`,
              "project",
            );
            project.teamIds
              .filter((id) => id !== project.pmId)
              .forEach((id) =>
                notify(
                  id,
                  `You've been added to ${project.name} for ${project.hours[id] ?? 0}h a day`,
                  "project",
                ),
              );
            (project.admins ?? []).forEach((id) =>
              notify(id, `You are an admin of ${project.name}`, "project"),
            );
          } else {
            set((s) => ({ projects: s.projects.filter((p) => p.id !== projectId) }));
            notify(
              project.pmId,
              `${firstName(get().me)} didn't approve ${project.name} this time`,
              "project",
            );
          }
        },
        setProjectAdmins: (projectId, adminIds) => {
          const project = requireOwner(projectId);
          const admins = [...new Set(adminIds)].filter((id) => id !== project.pmId);
          if (admins.some((id) => !PEOPLE.some((p) => p.id === id)))
            throw new Error("Pick people from the team list.");
          const added = admins.filter((id) => !project.admins.includes(id));
          const removed = project.admins.filter((id) => !admins.includes(id));
          patchProject(projectId, (p) => ({ ...p, admins }));
          added.forEach((id) =>
            notify(
              id,
              `${firstName(get().me)} made you an admin of ${project.name}. You can now set targets, numbers and assign tasks.`,
              "project",
            ),
          );
          removed.forEach((id) =>
            notify(id, `${firstName(get().me)} removed your admin access on ${project.name}`, "project"),
          );
        },
        addProjectAdmin: (projectId, personId) => {
          const project = requireOwner(projectId);
          if (!PEOPLE.some((p) => p.id === personId))
            throw new Error("Pick someone to add as admin.");
          if (personId === project.pmId)
            throw new Error(`${firstName(personId)} owns this project already.`);
          if (project.admins.includes(personId))
            throw new Error(`${firstName(personId)} is already an admin.`);
          patchProject(projectId, (p) => ({ ...p, admins: [...p.admins, personId] }));
          notify(
            personId,
            `${firstName(get().me)} made you an admin of ${project.name}. You can now set targets, numbers and assign tasks.`,
            "project",
          );
        },
        removeProjectAdmin: (projectId, personId) => {
          const project = requireProject(projectId);
          if (personId !== get().me) requireOwner(projectId);
          if (!project.admins.includes(personId))
            throw new Error(`${firstName(personId)} is not an admin.`);
          patchProject(projectId, (p) => ({
            ...p,
            admins: p.admins.filter((id) => id !== personId),
          }));
          if (personId !== get().me)
            notify(
              personId,
              `${firstName(get().me)} removed your admin access on ${project.name}`,
              "project",
            );
          else if (project.pmId !== get().me)
            notify(
              project.pmId,
              `${firstName(get().me)} stepped down as admin of ${project.name}`,
              "project",
            );
        },
        transferProject: (projectId, newOwnerId, mode) => {
          const project = requireOwner(projectId);
          const me = get().me;
          if (!PEOPLE.some((p) => p.id === newOwnerId))
            throw new Error("Pick who to hand the project over to.");
          if (newOwnerId === project.pmId)
            throw new Error(`${firstName(newOwnerId)} already owns this project.`);
          const oldOwner = project.pmId;
          patchProject(projectId, (p) => {
            let admins = p.admins.filter((id) => id !== newOwnerId);
            let teamIds = [...new Set([...p.teamIds, newOwnerId])];
            const hours = { ...p.hours };
            if (mode === "remove-me") {
              admins = admins.filter((id) => id !== oldOwner);
              teamIds = teamIds.filter((id) => id !== oldOwner);
              delete hours[oldOwner];
            } else if (mode === "stay-admin") {
              admins = [...new Set([...admins, oldOwner])];
              if (!teamIds.includes(oldOwner)) teamIds.push(oldOwner);
            } else {
              admins = admins.filter((id) => id !== oldOwner);
              if (!teamIds.includes(oldOwner)) teamIds.push(oldOwner);
            }
            const suffix =
              mode === "remove-me"
                ? "and left the project"
                : mode === "stay-admin"
                  ? "and stays on as admin"
                  : "and stays on as a team member";
            return {
              ...p,
              pmId: newOwnerId,
              admins,
              teamIds,
              hours,
              updates: [
                {
                  id: newId(),
                  text: `${firstName(oldOwner)} handed the project over to ${firstName(newOwnerId)} ${suffix}.`,
                  at: nowIso(),
                  by: me,
                },
                ...p.updates,
              ],
            };
          });
          notify(
            newOwnerId,
            `${firstName(me)} handed ${project.name} over to you. You are now the owner 🎉`,
            "project",
          );
          if (oldOwner !== me)
            notify(
              oldOwner,
              `${firstName(me)} handed ${project.name} over to ${firstName(newOwnerId)}`,
              "project",
            );
          leadershipIds()
            .filter((id) => id !== me && id !== newOwnerId)
            .forEach((id) =>
              notify(
                id,
                `${firstName(oldOwner)} handed ${project.name} over to ${firstName(newOwnerId)}`,
                "project",
              ),
            );
        },
        setWeekPlan: (projectId, week, key, value) => {
          const monday = projectWeekStart(requireManage(projectId), week);
          const n = Number(value);
          if (!Number.isFinite(n) || n < 0) throw new Error("Targets must be zero or more.");
          patchProject(projectId, (p) => ({
            ...p,
            weekPlans: {
              ...p.weekPlans,
              [monday]: { ...(p.weekPlans?.[monday] ?? p.weekTarget), [key]: Math.round(n) },
            },
          }));
        },
        saveWeekPlan: (projectId, week, counts) => {
          const monday = projectWeekStart(requireManage(projectId), week);
          const valid = validateTargets(counts);
          patchProject(projectId, (p) => ({ ...p, weekPlans: { ...p.weekPlans, [monday]: valid } }));
        },
        clearWeekPlan: (projectId, week) => {
          const monday = projectWeekStart(requireManage(projectId), week);
          patchProject(projectId, (p) => {
            const plans = { ...p.weekPlans };
            delete plans[monday];
            return { ...p, weekPlans: plans };
          });
        },
        /** Replace a project's weeks wholesale (each `{ start, end }`; they may not overlap). */
        setCustomWeeks: (projectId, weeks) => {
          requireManage(projectId);
          const sorted = [...weeks].sort((a, b) => a.start.localeCompare(b.start));
          sorted.forEach((w, i) => {
            if (!w.start || !w.end || w.end < w.start) throw new Error("A week must end on or after the day it starts.");
            if (i && sorted[i - 1].end >= w.start) throw new Error("Two weeks overlap. Pick days that are not in another week.");
          });
          patchProject(projectId, (p) => ({ ...p, customWeeks: sorted }));
        },
        /** Add a week (`from` null) or change the dates of one; its plan and text move with it. */
        setWeekDates: (projectId, from, to) => {
          const project = requireManage(projectId);
          if (!to.start || !to.end || to.end < to.start) throw new Error("A week must end on or after the day it starts.");
          const others = (project.customWeeks ?? []).filter((w) => w.start !== from);
          if (others.some((w) => w.start <= to.end && to.start <= w.end)) throw new Error("Those days are already in another week.");
          patchProject(projectId, (p) => {
            const plans = { ...p.weekPlans };
            const text = { ...p.weekText };
            const off = { ...p.weekOff };
            if (from && from !== to.start) {
              for (const m of [plans, text, off]) if (m[from]) { m[to.start] = m[from]; delete m[from]; }
            }
            return { ...p, customWeeks: [...others, to].sort((a, b) => a.start.localeCompare(b.start)), weekPlans: plans, weekText: text, weekOff: off };
          });
        },
        removeWeek: (projectId, start) => {
          requireManage(projectId);
          patchProject(projectId, (p) => {
            const plans = { ...p.weekPlans };
            const text = { ...p.weekText };
            delete plans[start];
            delete text[start];
            return { ...p, customWeeks: (p.customWeeks ?? []).filter((w) => w.start !== start), weekPlans: plans, weekText: text };
          });
        },
        /** Move a week or a month to the bin, keeping its plan so it can come back. */
        binPeriod: (projectId, period, start) => {
          requireManage(projectId);
          patchProject(projectId, (p) => {
            const week = period === "week";
            const list = (week ? p.customWeeks : p.customMonths) ?? [];
            const found = list.find((w) => w.start === start);
            if (!found) return p;
            const plans = { ...(week ? p.weekPlans : p.monthPlans) };
            const text = { ...(week ? p.weekText : p.monthText) };
            const off = { ...(week ? p.weekOff : p.monthOff) };
            const entry = { id: newId(), period, week: found, plan: plans[start], text: text[start], off: off[start], deletedAt: nowIso(), by: get().me };
            delete plans[start];
            delete text[start];
            delete off[start];
            const left = list.filter((w) => w.start !== start);
            const bin = [entry, ...(p.periodBin ?? [])];
            return week
              ? { ...p, customWeeks: left, weekPlans: plans, weekText: text, weekOff: off, periodBin: bin }
              : { ...p, customMonths: left, monthPlans: plans, monthText: text, monthOff: off, periodBin: bin };
          });
        },
        restorePeriod: (projectId, binId) => {
          const project = requireManage(projectId);
          const entry = project.periodBin?.find((b) => b.id === binId);
          if (!entry) throw new Error("That item is no longer in the bin.");
          const week = entry.period === "week";
          const list = (week ? project.customWeeks : project.customMonths) ?? [];
          if (list.some((w) => w.start <= entry.week.end && entry.week.start <= w.end))
            throw new Error(`Those days are already used by another ${entry.period}. Change or delete it first.`);
          patchProject(projectId, (p) => {
            const rest = { ...p, periodBin: (p.periodBin ?? []).filter((b) => b.id !== binId) };
            const put = (m, v) => (v === undefined ? (m ?? {}) : { ...m, [entry.week.start]: v });
            const sorted = [...list, entry.week].sort((a, b) => a.start.localeCompare(b.start));
            return week
              ? { ...rest, customWeeks: sorted, weekPlans: put(p.weekPlans, entry.plan), weekText: put(p.weekText, entry.text), weekOff: put(p.weekOff, entry.off) }
              : { ...rest, customMonths: sorted, monthPlans: put(p.monthPlans, entry.plan), monthText: put(p.monthText, entry.text), monthOff: put(p.monthOff, entry.off) };
          });
        },
        purgePeriod: (projectId, binId) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({ ...p, periodBin: (p.periodBin ?? []).filter((b) => b.id !== binId) }));
        },
        /** Merge month fields (customMonths, monthPlans, monthText, monthOff) into the project. */
        setMonthData: (projectId, data) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({ ...p, ...data }));
        },
        setWeekOff: (projectId, start, ids) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({ ...p, weekOff: { ...p.weekOff, [start]: ids } }));
        },
        setWeekText: (projectId, start, rows) => {
          requireManage(projectId);
          const clean = rows
            .map((r) => ({ ...r, label: r.label.trim(), target: (r.target ?? "").trim() }))
            .filter((r) => r.label || r.target || r.targetNum != null);
          patchProject(projectId, (p) => ({ ...p, weekText: { ...p.weekText, [start]: clean } }));
        },
        /** What was achieved in a project week; `lock` stamps the week as done. */
        saveWeekActuals: (projectId, start, numbers, rows, lock) => {
          requireManage(projectId);
          if (Object.values(numbers).some((n) => !Number.isFinite(n) || n < 0)) throw new Error("Numbers must be zero or more.");
          patchProject(projectId, (p) => {
            const done = { ...p.weekDoneAt };
            if (lock) done[start] = nowIso();
            else delete done[start];
            return { ...p, weekActuals: { ...p.weekActuals, [start]: numbers }, weekText: { ...p.weekText, [start]: rows }, weekDoneAt: done };
          });
        },
        addCustomStandard: (projectId, standard) => {
          const project = requireManage(projectId);
          const [valid] = validateCustomStandards([standard]);
          if (project.customStandards.some((c) => c.name.toLowerCase() === valid.name.toLowerCase()))
            throw new Error(`"${valid.name}" already has a standard time.`);
          patchProject(projectId, (p) => ({
            ...p,
            customStandards: [...p.customStandards, valid],
          }));
          return valid.id;
        },
        removeCustomStandard: (projectId, standardId) => {
          requireManage(projectId);
          patchProject(projectId, (p) => ({
            ...p,
            customStandards: p.customStandards.filter((c) => c.id !== standardId),
          }));
        },
        readAll: () =>
          set((s) => ({
            notices: s.notices.map((n) => (n.to === s.me ? { ...n, read: true } : n)),
          })),
        readNotice: (id) =>
          set((s) => ({
            notices: s.notices.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),
        /** `anonymous` chats hide who wrote what (each person gets an alias); named chats show real names. Older chats have no flag and stay anonymous. */
        createConv: (name, memberIds, group, anonymous = false) => {
          const id = newId();
          set((s) => ({ convs: [...s.convs, { id, name, memberIds, group, anonymous }] }));
          return id;
        },
        /** Any member can rename a group. A short note in the chat says so (without saying who, in anonymous chats). */
        renameConv: (convId, name) => {
          const state = get();
          const conv = state.convs.find((c) => c.id === convId);
          if (!conv?.group || !conv.memberIds.includes(state.me)) return;
          const next = String(name ?? "").trim();
          if (!next) throw new Error("Give the group a name.");
          if (next.length > 40) throw new Error("Keep the group name under 40 characters.");
          if (next === conv.name) return;
          const by = conv.anonymous === false ? `${firstName(state.me)} renamed the group to` : "The group was renamed to";
          set((s) => ({
            convs: s.convs.map((c) => (c.id === convId ? { ...c, name: next } : c)),
            msgs: [...s.msgs, { id: newId(), convId, alias: "", system: true, text: `${by} “${next}”`, at: nowIso() }],
          }));
        },
        /** Only the person who created a group can delete it, for everybody. */
        deleteConv: (convId) => {
          const state = get();
          const conv = state.convs.find((c) => c.id === convId);
          if (!conv) return;
          if (!conv.group) throw new Error("Only groups can be deleted. Leave a private chat instead.");
          if (!conv.creator) throw new Error("Only the person who created the group can delete it.");
          const aliases = Object.fromEntries(Object.entries(state.aliases).filter(([k]) => !k.endsWith(`:${convId}`)));
          set((s) => ({ aliases, convs: s.convs.filter((c) => c.id !== convId), msgs: s.msgs.filter((m) => m.convId !== convId) }));
        },
        /** Delete one of my own messages. (My messages are the ones that carry my alias in that chat.) */
        deleteMessage: (msgId) => {
          const state = get();
          const msg = state.msgs.find((m) => m.id === msgId);
          if (!msg) return;
          const mineMsg = msg.from ? msg.from === state.me : (state.aliases[`${state.me}:${msg.convId}`]?.used ?? []).includes(msg.alias);
          if (!mineMsg) throw new Error("You can only delete your own messages.");
          set((s) => ({ msgs: s.msgs.filter((m) => m.id !== msgId) }));
        },
        /** Leave a chat. When the last person leaves, the chat and its messages go. */
        leaveConv: (convId) => {
          const state = get();
          const conv = state.convs.find((c) => c.id === convId);
          if (!conv) return;
          const rest = conv.memberIds.filter((id) => id !== state.me);
          const aliases = { ...state.aliases };
          delete aliases[`${state.me}:${convId}`];
          set((s) =>
            rest.length
              ? { aliases, convs: s.convs.map((c) => (c.id === convId ? { ...c, memberIds: rest } : c)) }
              : { aliases, convs: s.convs.filter((c) => c.id !== convId), msgs: s.msgs.filter((m) => m.convId !== convId) },
          );
        },
        send: (convId, text) => {
          const state = get();
          const conv = state.convs.find((c) => c.id === convId);
          if (!conv || !text.trim()) return;
          const named = conv.anonymous === false;
          const aliasKey = `${state.me}:${convId}`;
          // Anonymous chats: my name changes every day (a new one the first time I write each day), and is never one already used in the chat.
          const today = todayKey(0);
          const mine = state.aliases[aliasKey];
          let rec = mine;
          if (!named && (!mine || mine.day !== today)) {
            const seen = [...state.msgs.filter((m) => m.convId === convId).map((m) => m.alias), ...(mine?.used ?? [])];
            const fresh = randomAlias(seen);
            rec = { alias: fresh, day: today, used: [...new Set([...(mine?.used ?? []), fresh])] };
          }
          const alias = named ? displayName(state.me) : rec.alias;
          set((s) => ({
            aliases: named ? s.aliases : { ...s.aliases, [aliasKey]: rec },
            msgs: [
              ...s.msgs,
              { id: newId(), convId, alias, ...(named ? { from: state.me } : {}), text: text.trim(), at: nowIso() },
            ],
          }));
          if (conv.memberIds.length <= 6)
            conv.memberIds
              .filter((id) => id !== state.me)
              .forEach((id) =>
                notify(
                  id,
                  named
                    ? `${firstName(state.me)} in ${conv.group ? conv.name : "a private chat"}: ${text.trim().slice(0, 60)}`
                    : `New anonymous message in ${conv.group ? conv.name : "a private chat"}`,
                  "chat",
                ),
              );
        },
        reset: () => set({ ...emptyState(), me: get().me }),
      };
    },
);

export default useStore;
