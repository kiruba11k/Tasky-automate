// Demo data: people, projects, task templates and the generators that build
// the initial store state. Generators use small seeded PRNGs so the demo is
// stable, but dates are relative to "today".
import {
  addDays,
  clockToMinutes,
  currentWeekStart,
  dateTimeIso,
  lastWeekdays,
  nowIso,
  previousWeekday,
  todayKey,
} from "./dates.js";
import { DEMO_PEOPLE as PEOPLE, TASK_TYPES } from "./constants.js";
import {
  computeStandardMinutes,
  dailySnapshot,
  defaultTaskTitle,
  emptyDaily,
  emptyWeekly,
  finalizeProjectsForDay,
  makeCounts,
  newId,
  pickMetrics,
  standardMinutes,
  weeklySnapshot,
} from "./domain.js";

export { PEOPLE, TASK_TYPES };

/** `jV` - turn a project template into stored shape (with past weeks / months). */
export function seedProject(template, seed) {
  let state = seed;
  const rand = () => (state = (state * 9301 + 49297) % 233280) / 233280;
  const jitter = (counts, base) =>
    Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Math.round(v * (base + rand() * 0.4))]),
    );
  const pastWeeks = Array.from({ length: 8 }, (_, i) => ({
    start: currentWeekStart(-(i + 1)),
    counts: jitter(template.weekTarget, 0.7),
  }));
  const pastMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (i + 1));
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      counts: jitter(template.monthTarget, 0.72),
    };
  });
  const weekFraction = Math.min(5, Math.max(1, new Date().getDay() || 5)) / 5;
  const monthFraction = Math.max(1, new Date().getDate()) / 30;
  const scale = (counts, f) =>
    Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, Math.round(v * Math.min(1, f))]),
    );
  return {
    admins: [],
    customStandards: [],
    weekPlans: {},
    finalized: {},
    ...template,
    week: scale(template.week, weekFraction),
    month: scale(template.month, monthFraction),
    weekOf: currentWeekStart(0),
    monthOf: todayKey(0).slice(0, 7),
    pastWeeks,
    pastMonths,
  };
}

/** `hR` - the three demo projects. */
export function buildDemoProjects() {
  const northwindWeek = { ...makeCounts(300, 30, 150, 60, 10, 4, 2), connections: 80 };
  return [
    {
      id: "northwind",
      name: "Northwind SaaS - US",
      client: "Northwind",
      pmId: "bheeshma",
      admins: ["prajwal"],
      status: "active",
      description:
        "Outbound to VP Sales / RevOps at US SaaS companies (50 to 500 staff). Goal: 15 qualified meetings a month.",
      teamIds: ["udhaya", "bharath", "bheeshma", "prajwal"],
      startDate: todayKey(-40),
      endDate: todayKey(50),
      hours: { udhaya: 4, bharath: 8, bheeshma: 4, prajwal: 4 },
      metrics: [
        ...pickMetrics("messages", "responses", "l2", "calls", "interest", "meetings", "decks"),
        { id: "connections", label: "Connections accepted" },
      ],
      weekTarget: northwindWeek,
      monthTarget: { ...makeCounts(1200, 120, 600, 240, 40, 15, 6), connections: 320 },
      weekLocked: true,
      monthLocked: true,
      weekPlans: {
        [currentWeekStart(1)]: { ...makeCounts(320, 32, 160, 60, 10, 4, 2), connections: 90 },
        [currentWeekStart(2)]: { ...makeCounts(350, 35, 170, 70, 12, 5, 2), connections: 100 },
      },
      week: { ...makeCounts(214, 26, 98, 41, 8, 3, 1), connections: 57 },
      month: { ...makeCounts(870, 97, 420, 180, 31, 11, 4), connections: 241 },
      meetings: [
        {
          id: "mt1",
          company: "Acme Cloud",
          contact: "J. Ortiz, VP Sales",
          date: todayKey(1),
          time: "10:30",
        },
        {
          id: "mt2",
          company: "Brightlane",
          contact: "S. Patel, RevOps",
          date: todayKey(3),
          time: "15:00",
        },
      ],
      updates: [],
      standards: { prospect: 2, l1: 2, l2: 1.5 },
      customStandards: [
        {
          id: "cs-li",
          name: "LinkedIn connection request",
          unit: "requests",
          minutes: 0.5,
        },
      ],
    },
    {
      id: "helios",
      name: "Helios Fintech - UK",
      client: "Helios",
      pmId: "alok",
      admins: [],
      status: "active",
      description: "ABM for UK mid-market fintech CFOs.",
      teamIds: ["sachi", "udhaya", "alok", "prajwal"],
      startDate: todayKey(-20),
      endDate: todayKey(70),
      hours: { sachi: 8, udhaya: 2, alok: 6, prajwal: 4 },
      metrics: pickMetrics("messages", "responses", "l2", "interest", "meetings", "decks"),
      weekTarget: makeCounts(250, 25, 120, 50, 8, 3, 1),
      monthTarget: makeCounts(1e3, 100, 480, 200, 30, 12, 4),
      weekLocked: true,
      monthLocked: true,
      week: makeCounts(160, 14, 70, 22, 4, 1, 1),
      month: makeCounts(690, 66, 350, 150, 22, 8, 3),
      meetings: [],
      updates: [],
      standards: { prospect: 2.5, l1: 2.5, l2: 2 },
      customStandards: [
        {
          id: "cs-cfo",
          name: "CFO list research",
          unit: "contacts",
          minutes: 3,
        },
      ],
    },
    {
      id: "bd",
      name: "Lead Strategus - Internal BD",
      client: "Lead Strategus",
      pmId: "abisho",
      admins: ["bheeshma"],
      status: "active",
      description: "Our own pipeline: agencies and SaaS founders in India and the UK.",
      teamIds: ["udhaya", "bheeshma", "abisho"],
      startDate: todayKey(-90),
      endDate: todayKey(90),
      hours: { udhaya: 2, bheeshma: 2, abisho: 4 },
      metrics: pickMetrics("messages", "responses", "l2", "calls", "interest", "meetings"),
      weekTarget: makeCounts(150, 15, 60, 30, 5, 2, 1),
      monthTarget: makeCounts(600, 60, 240, 120, 20, 8, 3),
      weekLocked: false,
      monthLocked: true,
      week: makeCounts(96, 9, 31, 18, 3, 1, 0),
      month: makeCounts(410, 41, 150, 77, 12, 5, 2),
      meetings: [
        {
          id: "mt3",
          company: "Northstar Agency",
          contact: "R. Kapoor, Founder",
          date: todayKey(2),
          time: "12:00",
        },
      ],
      updates: [],
      standards: { prospect: 1.5, l1: 1.5, l2: 1.2 },
      customStandards: [],
    },
  ].map((project, i) => seedProject(project, 101 + i * 37));
}

/** `NV` - alias of `nowIso` used while seeding. */
export const seedNowIso = nowIso;

/** `fb` - build a base task record (extra fields override defaults). */
export function makeTask(id, typeId, qty, assigneeId, projectId, assignedById, status, extra = {}) {
  const type = TASK_TYPES.find((t) => t.id === typeId);
  return {
    id,
    typeId,
    qty,
    assigneeId,
    projectId,
    assignedById,
    status,
    unit: type?.unit ?? "items",
    title: defaultTaskTitle(typeId, qty, extra.variant),
    targetMinutes: standardMinutes(typeId, qty, extra.variant),
    priority: false,
    feedback: [],
    createdAt: seedNowIso(),
    date: todayKey(0),
    reminders: 0,
    reviews: [],
    history: [],
    resubmits: 0,
    ...extra,
  };
}

/**
 * `pR` - derive history / feedback / reviews / timestamps of a task from a
 * compact timeline {assignedAt, reviewer, submits[], feedback[], forward,
 * approvedAt, reminded[]}.
 */
export function applyTaskTimeline(task, timeline) {
  const reviewer = timeline.reviewer ?? task.reviewerId ?? task.assignedById;
  const history = [
    {
      at: timeline.assignedAt,
      by: task.assignedById,
      action: "assigned",
      to: task.assigneeId,
    },
  ];
  const reviews = [];
  const feedback = [];
  const submits = timeline.submits ?? [];
  submits.forEach((at, i) => {
    history.push({
      at,
      by: task.assigneeId,
      action: i ? "resubmitted" : "submitted",
      to: reviewer,
    });
    const fb = timeline.feedback?.[i];
    if (fb) {
      history.push({ at: fb.at, by: reviewer, action: "feedback", note: fb.text });
      feedback.push({ by: reviewer, text: fb.text, at: fb.at });
      reviews.push({ by: reviewer, verdict: "feedback", at: fb.at });
    }
  });
  let finalReviewer = reviewer;
  if (timeline.forward) {
    history.push({
      at: timeline.forward.at,
      by: reviewer,
      action: "forwarded",
      to: timeline.forward.to,
      note: timeline.forward.note,
    });
    if (timeline.forward.note)
      feedback.push({
        by: reviewer,
        text: `Forwarded: ${timeline.forward.note}`,
        at: timeline.forward.at,
      });
    finalReviewer = timeline.forward.to;
  }
  if (timeline.approvedAt) {
    history.push({ at: timeline.approvedAt, by: finalReviewer, action: "approved" });
    reviews.push({ by: finalReviewer, verdict: "approved", at: timeline.approvedAt });
  }
  (timeline.reminded ?? []).forEach((r) =>
    history.push({ at: r.at, by: r.by, action: "reminded" }),
  );
  history.sort((a, b) => a.at.localeCompare(b.at));
  return {
    ...task,
    createdAt: timeline.assignedAt,
    history,
    feedback,
    reviews,
    reviewerId: submits.length ? finalReviewer : task.reviewerId,
    resubmits: Math.max(0, submits.length - 1),
    submittedAt: submits[submits.length - 1],
    approvedAt: timeline.approvedAt,
    reminders: timeline.reminded?.length ?? task.reminders,
  };
}

// ------------------------------------------------------ historic task data

/** `mR` - which projects each person works on (for generated history). */
export const PERSON_PROJECTS = {
  udhaya: ["northwind", "helios", "bd"],
  bharath: ["northwind"],
  sachi: ["helios"],
  bheeshma: ["northwind", "bd"],
  prajwal: ["northwind", "helios"],
  abisho: ["bd"],
  alok: ["helios"],
};

/** `PV` - project owner per project id. */
export const PROJECT_PM = { northwind: "bheeshma", helios: "alok", bd: "abisho" };

/**
 * `AV` - per-person performance curves; the argument `p` is progress through
 * the history window (0 = oldest, 1 = yesterday).
 */
export const PERFORMANCE_PROFILES = {
  sachi: { onTime: () => 0.92, perDay: () => 5, resub: () => 0.06 },
  bheeshma: { onTime: () => 0.9, perDay: () => 4.8, resub: () => 0.08 },
  udhaya: {
    onTime: (p) => 0.5 + 0.42 * p,
    perDay: (p) => 3 + 2 * p,
    resub: (p) => 0.38 - 0.28 * p,
  },
  bharath: {
    onTime: (p) => (p < 0.45 ? 0.86 : 0.86 - 0.72 * (p - 0.45)),
    perDay: (p) => (p < 0.45 ? 4.8 : 4.8 - 3 * (p - 0.45)),
    resub: (p) => (p < 0.45 ? 0.1 : 0.1 + 0.62 * (p - 0.45)),
  },
  prajwal: { onTime: () => 0.72, perDay: () => 4, resub: () => 0.2 },
  alok: { onTime: () => 0.79, perDay: () => 3.8, resub: () => 0.17 },
  abisho: { onTime: () => 0.8, perDay: () => 3.5, resub: () => 0.15 },
};

/** `_V` - assigner -> [share of challenging, share of easy] targets. */
export const DIFFICULTY_MIX = {
  bheeshma: [0.38, 0.07],
  alok: [0.1, 0.1],
  abisho: [0.07, 0.4],
  prajwal: [0.12, 0.26],
  komala: [0.2, 0.15],
};

/** `OV` */
export const FEEDBACK_NOTES = [
  "Please personalise the first line for each prospect.",
  "A few contacts are outside the ICP. Swap them and resend.",
  "Tone is too salesy in the last batch, soften it.",
  "Missing the case-study link in several messages.",
  "Some emails bounced, please re-verify the addresses.",
  "Good start. Add the company size column before I approve.",
  "Two duplicates in the list, please clean up.",
  "Subject lines need work, keep them under 6 words.",
];

/** `TV` */
export const FORWARD_NOTES = [
  "Client-facing, please give it a final look.",
  "Komala, can you check the positioning?",
  "Needs a second pair of eyes on pricing.",
];

/** `EV` - 65 weekdays of generated, already-approved task history. */
export function buildHistoricTasks(projects) {
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const templates = [
    ["l1", 30, "Personalised"],
    ["l1", 45, "Semi-personalised"],
    ["l1", 60, "Templated"],
    ["l2", 40],
    ["followup", 50],
    ["prospect", 30],
    ["model", 10],
    ["email", 30],
    ["whatsapp", 60],
    ["deck", 1],
  ];
  const projectById = (id) => projects.find((p) => p.id === id);
  const tasks = [];
  const DAYS = 65;
  lastWeekdays(DAYS).forEach((day, f) => {
    const progress = (DAYS - 1 - f) / (DAYS - 1);
    Object.entries(PERSON_PROJECTS).forEach(([person, personProjects]) => {
      const profile = PERFORMANCE_PROFILES[person];
      const count = Math.max(2, Math.round(profile.perDay(progress) + (rand() - 0.5) * 2));
      let cursor = 600 + Math.floor(rand() * 20);
      for (let j = 0; j < count; j++) {
        const projectId = pick(personProjects);
        const project = projectById(projectId);
        const owner = PROJECT_PM[projectId];
        const assigner =
          owner === person || rand() < 0.1
            ? "komala"
            : projectId === "northwind" && person !== "prajwal" && rand() < 0.2
              ? "prajwal"
              : owner;
        const reviewer = owner === person ? "komala" : owner;
        let task;
        const customStandard = project?.customStandards?.[0];
        if (customStandard && rand() < 0.08) {
          const qty =
            customStandard.unit === "requests" ? pick([30, 40, 50]) : pick([10, 15, 20]);
          const std =
            computeStandardMinutes(project, "custom", qty, undefined, customStandard.id) ?? qty;
          task = makeTask(`h${f}-${person}-${j}`, "custom", qty, person, projectId, assigner, "done", {
            unit: customStandard.unit,
            title: `${qty} ${customStandard.name}`,
            customName: customStandard.name,
            customStandardId: customStandard.id,
            standardMinutes: std,
            targetMinutes: std,
          });
        } else {
          const [typeId, baseQty, variant] = pick(templates);
          const qty =
            typeId === "deck" ? 1 : Math.max(5, Math.round(baseQty * pick([1, 1, 1, 0.5, 1.5])));
          const std =
            computeStandardMinutes(project, typeId, qty, variant) ??
            standardMinutes(typeId, qty, variant);
          task = makeTask(`h${f}-${person}-${j}`, typeId, qty, person, projectId, assigner, "done", {
            variant,
            standardMinutes: std,
            targetMinutes: std,
          });
        }
        const [pChallenging, pEasy] = DIFFICULTY_MIX[assigner] ?? [0.15, 0.15];
        const roll = rand();
        const difficulty =
          roll < pChallenging ? "challenging" : roll < pChallenging + pEasy ? "easy" : "standard";
        const factor =
          difficulty === "challenging"
            ? 0.68 + rand() * 0.2
            : difficulty === "easy"
              ? 1.14 + rand() * 0.24
              : rand() < 0.5
                ? 1
                : 0.95 + rand() * 0.1;
        task.targetMinutes = Math.max(1, Math.round(task.standardMinutes * factor));
        const doneQty =
          rand() < 0.06
            ? Math.max(1, Math.round(task.qty * (0.7 + rand() * 0.25)))
            : task.qty;
        const allowed = task.targetMinutes * (doneQty / task.qty);
        const onTimeChance = Math.min(
          0.98,
          Math.max(
            0.05,
            profile.onTime(progress) +
              (difficulty === "challenging" ? -0.12 : difficulty === "easy" ? 0.08 : 0),
          ),
        );
        const minutes =
          rand() < onTimeChance
            ? Math.max(2, Math.floor(allowed * (0.72 + rand() * 0.27)))
            : Math.max(3, Math.ceil(allowed * (1.06 + rand() * 0.4)));
        const assignedAt = dateTimeIso(day, 570 + Math.floor(rand() * 45));
        const start = cursor >= 780 && cursor < 840 ? 840 : cursor;
        let end = start + minutes;
        if (start < 780 && end > 780) end += 60;
        let t = end + 2 + Math.floor(rand() * 9);
        const submits = [dateTimeIso(day, t)];
        const feedback = [];
        if (rand() < profile.resub(progress)) {
          const rounds = rand() < 0.25 ? 2 : 1;
          for (let h = 0; h < rounds; h++) {
            t += 25 + Math.floor(rand() * 90);
            feedback.push({ at: dateTimeIso(day, t), text: pick(FEEDBACK_NOTES) });
            t += 20 + Math.floor(rand() * 50);
            submits.push(dateTimeIso(day, t));
          }
        }
        let forward;
        if (reviewer !== "komala" && rand() < 0.04) {
          t += 15 + Math.floor(rand() * 30);
          forward = { at: dateTimeIso(day, t), to: "komala", note: pick(FORWARD_NOTES) };
        }
        t += 20 + Math.floor(rand() * 120);
        const approvedAt = dateTimeIso(day, t);
        cursor = end + 10 + Math.floor(rand() * 15) + feedback.length * 15;
        tasks.push(
          applyTaskTimeline(
            {
              ...task,
              date: day,
              doneQty,
              minutes,
              reviewerId: reviewer,
              priority: assigner === "komala",
              historic: true,
            },
            { assignedAt, reviewer, submits, feedback, forward, approvedAt },
          ),
        );
      }
    });
  });
  return tasks;
}

/** `CV` - all demo tasks: today's hand-written ones plus generated history. */
export function buildDemoTasks(projects = buildDemoProjects()) {
  return [...buildTodayTasks(projects), ...buildHistoricTasks(projects)];
}

/** `MV` - the hand-written current tasks (timestamps relative to "now"). */
export function buildTodayTasks(projects) {
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const spanStart = Math.min(600, Math.max(0, minutesNow - 30));
  const span = minutesNow - spanStart;
  // `hoursAgo(h)`: ISO time h "working hours" before now, squeezed into today if needed.
  const hoursAgo = (h) => {
    const mins = minutesNow - 390 >= spanStart ? h * 60 : (h / 6.5) * span;
    return new Date(now.getTime() - Math.round(mins) * 6e4).toISOString();
  };
  const yesterday = previousWeekday();
  const projectById = (id) => projects.find((p) => p.id === id);
  const make = (id, typeId, qty, assignee, projectId, assigner, status, extra, timeline, targetFactor = 1) => {
    const std =
      computeStandardMinutes(projectById(projectId), typeId, qty, extra.variant, extra.customStandardId) ??
      standardMinutes(typeId, qty, extra.variant);
    const base = makeTask(id, typeId, qty, assignee, projectId, assigner, status, {
      standardMinutes: std,
      targetMinutes: Math.max(1, Math.round(std * targetFactor)),
      ...extra,
    });
    return applyTaskTimeline(base, { ...timeline, assignedAt: timeline.assignedAt ?? hoursAgo(6) });
  };
  const a = hoursAgo;
  const s = yesterday;
  return [
    make("t1", "model", 10, "udhaya", "northwind", "bheeshma", "done",
      { doneQty: 10, minutes: 28 },
      { reviewer: "bheeshma", submits: [a(4.2)], approvedAt: a(3) }),
    make("t2", "prospect", 30, "udhaya", "northwind", "bheeshma", "in_review",
      { doneQty: 30, minutes: 55 },
      { reviewer: "bheeshma", submits: [a(0.4)] }),
    make("t3", "l1", 30, "udhaya", "northwind", "bheeshma", "todo",
      { variant: "Personalised" }, {}, 0.85),
    make("t4", "l2", 40, "udhaya", "northwind", "bheeshma", "changes",
      { doneQty: 40, minutes: 62 },
      {
        reviewer: "bheeshma",
        submits: [a(2.5)],
        feedback: [
          { at: a(1), text: "Lovely tone! Please add the case-study link in the last 10." },
        ],
      },
      0.85),
    make("t5", "deck", 1, "udhaya", "northwind", "komala", "todo",
      { priority: true, title: "Northwind QBR deck" },
      { assignedAt: a(5) }, 1.25),
    make("t12", "followup", 25, "udhaya", "northwind", "bheeshma", "in_progress",
      { date: s }, { assignedAt: dateTimeIso(s, 590) }),
    make("t13", "email", 30, "udhaya", "helios", "alok", "todo",
      {}, { assignedAt: a(5.5) }),
    make("t14", "whatsapp", 30, "udhaya", "helios", "alok", "todo",
      { date: s }, { assignedAt: dateTimeIso(s, 605) }),
    make("t15", "prospect", 30, "udhaya", "bd", "bheeshma", "todo",
      {}, { assignedAt: a(5.8) }),
    make("t16", "deck", 1, "bheeshma", "bd", "komala", "todo",
      { priority: true, title: "Lead Strategus capabilities deck" },
      { assignedAt: a(5) }),
    make("t17", "l1", 45, "bheeshma", "bd", "bheeshma", "in_progress",
      { variant: "Semi-personalised" }, { assignedAt: a(6.2) }),
    make("t19", "prospect", 30, "bheeshma", "bd", "abisho", "done",
      { doneQty: 30, minutes: 41 },
      { reviewer: "abisho", submits: [a(3.1)], approvedAt: a(2.2) }),
    make("t8", "l1", 60, "bharath", "northwind", "bheeshma", "in_review",
      { variant: "Templated", doneQty: 60, minutes: 72 },
      {
        reviewer: "bheeshma",
        submits: [a(3.6), a(0.7)],
        feedback: [
          { at: a(2.6), text: "Three messages still have the old pricing line. Fix and resend." },
        ],
      },
      0.83),
    make("t10", "whatsapp", 60, "bharath", "northwind", "bheeshma", "done",
      { doneQty: 60, minutes: 66 },
      { reviewer: "bheeshma", submits: [a(5.3)], approvedAt: a(5) }),
    make("t26", "custom", 40, "bharath", "northwind", "prajwal", "done",
      {
        unit: "requests",
        title: "40 LinkedIn connection request",
        customName: "LinkedIn connection request",
        customStandardId: "cs-li",
        doneQty: 32,
        minutes: 19,
      },
      {
        assignedAt: a(6.1),
        reviewer: "prajwal",
        submits: [a(2)],
        approvedAt: a(1.4),
      }),
    make("t18", "email", 30, "bharath", "northwind", "bheeshma", "todo",
      { date: s },
      { assignedAt: dateTimeIso(s, 600), reminded: [{ at: a(2), by: "bheeshma" }] }),
    make("t9", "deck", 1, "sachi", "helios", "komala", "in_review",
      { doneQty: 1, minutes: 55, priority: true, title: "Helios pitch deck v2" },
      { assignedAt: a(5), reviewer: "komala", submits: [a(0.5)] }),
    make("t11", "prospect", 30, "sachi", "helios", "alok", "done",
      { doneQty: 30, minutes: 52 },
      { reviewer: "alok", submits: [a(3)], approvedAt: a(2) }),
    make("t25", "l2", 40, "sachi", "helios", "alok", "todo",
      {}, { assignedAt: a(5.9) }),
    make("t20", "l2", 40, "alok", "helios", "komala", "done",
      { doneQty: 40, minutes: 70 },
      { reviewer: "komala", submits: [a(2.4)], approvedAt: a(1.5) }),
    make("t21", "email", 30, "alok", "helios", "komala", "in_review",
      { doneQty: 30, minutes: 58 },
      { reviewer: "komala", submits: [a(0.6)] }),
    make("t22", "email", 30, "prajwal", "northwind", "bheeshma", "done",
      { doneQty: 30, minutes: 57 },
      { reviewer: "bheeshma", submits: [a(3.3)], approvedAt: a(2.1) }),
    make("t23", "whatsapp", 60, "prajwal", "helios", "alok", "in_review",
      { doneQty: 45, minutes: 52 },
      { reviewer: "alok", submits: [a(0.9)] }),
    make("t24", "l1", 30, "abisho", "bd", "komala", "done",
      { variant: "Personalised", doneQty: 30, minutes: 40 },
      { reviewer: "komala", submits: [a(2.7)], approvedAt: a(1) },
      1.12),
    make("t27", "email", 20, "abisho", "bd", "komala", "in_progress",
      {}, { assignedAt: a(5.5) }),
  ];
}

// --------------------------------------------------------- daily / weekly

/** `NR` - default plan blocks for a person from project hours (10am to 7pm around the lunch break). */
export function defaultPlanBlocks(projects, personId, lunch = { start: "13:00", end: "14:00" }) {
  const blocks = [];
  const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  const windows = [
    [600, toMin(lunch.start)],
    [toMin(lunch.end), 1140],
  ].filter(([from, to]) => to > from);
  const clock = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  let w = 0;
  let cursor = windows[0][0];
  for (const project of projects.filter((p) => p.status === "active" && (p.hours[personId] ?? 0) > 0)) {
    let remaining = Math.round((project.hours[personId] * 60) / 15) * 15;
    while (remaining > 0 && w < windows.length) {
      const end = Math.min(windows[w][1], cursor + remaining);
      blocks.push({
        id: newId(),
        start: clock(cursor),
        end: clock(end),
        projectId: project.id,
        taskIds: [],
      });
      remaining -= end - cursor;
      cursor = end;
      if (cursor >= windows[w][1]) {
        w++;
        if (w < windows.length) cursor = windows[w][0];
      }
    }
  }
  return blocks;
}

/** `aU` - ten days of generated daily updates (before today). */
export function buildHistoricDaily(projects, tasks) {
  const sodNotes = [
    "Clear the follow-ups first, then fresh L1s.",
    "Prospect list for the new ICP, then messages.",
    "Calls in the morning, emails after lunch.",
    "Finish yesterday's carry-over, then the new batch.",
    "Deck review first, outreach after.",
  ];
  const eodNotes = [
    "Good day, two warm replies.",
    "Hit the message target, calls were quiet.",
    "CRM was slow but caught up by 6.",
    "One meeting interest from a VP Sales.",
    "Carry-over: 10 follow-ups for tomorrow.",
  ];
  const extraWork = [
    "Cleaned up the CRM list",
    "Client call prep",
    "Finished the carry-over follow-ups",
    "Proposal revision",
    "Research for tomorrow's prospects",
    "Fixed bounced emails",
  ];
  const extraChance = { bharath: 0.45, udhaya: 0.25 };
  let seed = 11;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const clock = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const daily = {};
  lastWeekdays(10).forEach((day) => {
    Object.entries(PERSON_PROJECTS).forEach(([person, personProjects]) => {
      if (rand() < 0.08) return;
      const plan = defaultPlanBlocks(projects, person);
      if (rand() < 0.3 && plan.length) {
        const last = plan[plan.length - 1];
        if (last.end > "17:00") {
          last.end = "17:00";
          plan.push({
            id: newId(),
            start: "17:00",
            end: "19:00",
            projectId: "",
            taskIds: [],
            custom: {
              title: pick([
                "Urgent client call prep",
                "Ad-hoc list cleanup",
                "Proposal revision",
              ]),
              priority: true,
              targetQty: 5,
              unit: "items",
              achieved: 4 + Math.floor(rand() * 2),
            },
          });
        }
      }
      const sentEod = rand() < 0.9;
      if (sentEod)
        plan.forEach((block) => {
          const planned = clockToMinutes(block.end) - clockToMinutes(block.start);
          block.actualMinutes = Math.max(
            15,
            Math.round((planned * pick([0.75, 0.85, 1, 1, 1, 1, 1.1, 1.25, 1.5])) / 5) * 5,
          );
        });
      const extra = [];
      if (sentEod && rand() < (extraChance[person] ?? 0.18)) {
        const start = 1140 + pick([0, 15, 30]);
        const length = pick([30, 45, 60, 90]);
        extra.push({
          id: newId(),
          start: clock(start),
          end: clock(start + length),
          minutes: length,
          work: pick(extraWork),
          projectId: pick(personProjects),
        });
      }
      const sodTargets = {};
      const eodActuals = {};
      personProjects.forEach((projectId) => {
        const responses = 2 + Math.floor(rand() * 4);
        sodTargets[projectId] = { responses, interest: 1 };
        eodActuals[projectId] = {
          responses: Math.max(0, responses + Math.floor(rand() * 4) - 2),
          interest: Math.floor(rand() * 3),
        };
      });
      const entry = {
        ...emptyDaily(),
        plan,
        sodTargets,
        eodActuals,
        extra,
        sodNote: pick(sodNotes),
        eodNote: pick(eodNotes),
        sodAt: new Date(`${day}T10:${String(Math.floor(rand() * 20)).padStart(2, "0")}:00`).toISOString(),
        eodAt: sentEod
          ? new Date(`${day}T18:${String(30 + Math.floor(rand() * 29)).padStart(2, "0")}:00`).toISOString()
          : undefined,
      };
      if (entry.eodAt) entry.eodSnapshot = dailySnapshot(tasks, person, day, entry, entry.eodAt);
      daily[`${person}|${day}`] = entry;
    });
  });
  return daily;
}

/** `oU` - last week's finished weekly updates and this week's targets. */
export function buildDemoWeekly(tasks) {
  const thisWeek = currentWeekStart(0);
  const lastWeek = currentWeekStart(-1);
  const row = (label, qty) => ({ id: `w${label}${qty}`, label, qty });
  const out = {};
  const people = {
    udhaya: [
      "300 personalised L1s across Northwind + Helios, BD prospect list.",
      "Hit L1s, prospect list 80% done.",
      [
        ["Meetings interest", 3],
        ["Case studies", 1],
      ],
      [
        ["Meetings interest", 4],
        ["Case studies", 1],
      ],
    ],
    bharath: [
      "150 calls, 10 interested leads.",
      "142 calls, 11 interested, two demos booked.",
      [
        ["Calls", 150],
        ["Interested leads", 10],
      ],
      [
        ["Calls", 142],
        ["Interested leads", 11],
      ],
    ],
    sachi: [
      "Helios deck v3 + 200 L2 follow-ups.",
      "Deck shipped, 180 L2s.",
      [
        ["L2 follow-ups", 200],
        ["Deck versions", 1],
      ],
      [
        ["L2 follow-ups", 180],
        ["Deck versions", 1],
      ],
    ],
    bheeshma: [
      "Book 4 Northwind meetings, clear review queue daily.",
      "4 meetings booked ✓",
      [["Meetings booked", 4]],
      [["Meetings booked", 4]],
    ],
    alok: [
      "Helios: 3 meetings, new CFO sequence live.",
      "2 meetings, sequence live.",
      [["Meetings booked", 3]],
      [["Meetings booked", 2]],
    ],
    abisho: [
      "BD: 20 agency founders contacted.",
      "24 contacted, 3 replies.",
      [["Founders contacted", 20]],
      [["Founders contacted", 24]],
    ],
    prajwal: [
      "Support Northwind + Helios, 200 emails.",
      "210 emails sent.",
      [["Emails", 200]],
      [["Emails", 210]],
    ],
  };
  const lastFriday = addDays(lastWeek, 4);
  Object.entries(people).forEach(([person, [targetsNote, eowNote, targets, actuals]]) => {
    const record = {
      targetsNote,
      targetsCustom: targets.map(([label, qty]) => row(label, qty)),
      targetsAt: new Date(lastWeek + "T10:15:00").toISOString(),
      eowNote,
      eowCustom: actuals.map(([label, qty]) => row(label, qty)),
      eowAt: new Date(lastFriday + "T18:40:00").toISOString(),
    };
    record.eowSnapshot = weeklySnapshot(tasks, person, lastWeek, record, record.eowAt);
    out[`${person}|${lastWeek}`] = record;
    if (person !== "prajwal")
      out[`${person}|${thisWeek}`] = {
        ...emptyWeekly(),
        targetsNote,
        targetsCustom: targets.map(([label, qty]) => row(label, qty)),
        targetsAt: new Date(thisWeek + "T10:20:00").toISOString(),
      };
  });
  return out;
}

/** `sU` - hand-written daily updates for today (Alok, Abisho, Prajwal). */
export function buildTodayDailyBase() {
  const at = (h, m) => new Date(new Date().setHours(h, m, 0, 0)).toISOString();
  const block = (id, start, end, projectId, actualMinutes, taskIds = []) => ({
    id,
    start,
    end,
    projectId,
    taskIds,
    actualMinutes,
  });
  const today = todayKey(0);
  return {
    [`alok|${today}`]: {
      ...emptyDaily(),
      plan: [
        block("ba1", "10:00", "13:00", "helios", 170, ["t20"]),
        block("ba2", "14:00", "17:00", "helios", 205, ["t21"]),
      ],
      sodNote: "Helios CFO sequence: L2 follow-ups + 2 calls.",
      sodTargets: { helios: { responses: 5, interest: 2 } },
      sodCustom: [{ id: "a1", label: "CFO list review", qty: 1 }],
      sodAt: at(10, 7),
      eodNote: "Good replies on L2s, one CFO wants a deck.",
      eodActuals: { helios: { responses: 6, interest: 1 } },
      eodCustom: [{ id: "a2", label: "CFO list review", qty: 1 }],
      eodAt: at(18, 35),
      extra: [
        {
          id: "xa1",
          start: "09:00",
          end: "09:45",
          minutes: 45,
          work: "Prepped the CFO list before stand-up",
          projectId: "helios",
        },
      ],
    },
    [`abisho|${today}`]: {
      ...emptyDaily(),
      sodNote: "BD outreach to 15 agency founders.",
      sodTargets: { bd: { responses: 3, interest: 1, calls: 6 } },
      sodAt: at(10, 2),
    },
    [`prajwal|${today}`]: {
      ...emptyDaily(),
      plan: [
        block("bp1", "10:00", "13:00", "northwind", 180, ["t22"]),
        block("bp2", "14:00", "15:00", "northwind", 75),
        block("bp3", "15:00", "19:00", "helios", 220, ["t23"]),
      ],
      sodNote: "Emails for Northwind, WhatsApp batch for Helios.",
      sodTargets: { northwind: { responses: 3 }, helios: { responses: 2 } },
      sodAt: at(10, 18),
      eodNote: "Emails done; WhatsApp batch half done, rest tomorrow.",
      eodActuals: { northwind: { responses: 4 }, helios: { responses: 1 } },
      eodCustom: [{ id: "p1", label: "Helped Sachi with deck data", qty: 1 }],
      eodAt: at(18, 50),
      extra: [
        {
          id: "xp1",
          minutes: 30,
          work: "Helped Sachi with the Helios deck data",
          projectId: "helios",
        },
      ],
    },
  };
}

/** `lU` - all daily updates: history + today's hand-written ones. */
export function buildDemoDaily(projects, tasks) {
  const lastDay = previousWeekday();
  const at = (h, m) => new Date(new Date().setHours(h, m, 0, 0)).toISOString();
  const historic = buildHistoricDaily(projects, tasks);
  const daily = {
    ...historic,
    ...buildTodayDailyBase(),
    [`udhaya|${todayKey(0)}`]: {
      ...emptyDaily(),
      plan: [
        {
          id: "b1",
          start: "10:00",
          end: "13:00",
          projectId: "northwind",
          taskIds: [],
        },
        {
          id: "b2",
          start: "14:00",
          end: "16:00",
          projectId: "helios",
          taskIds: ["t13", "t14"],
        },
        {
          id: "b3",
          start: "16:00",
          end: "18:00",
          projectId: "bd",
          taskIds: ["t15"],
        },
      ],
      sodNote: "Finish the QBR deck first, then personalised L1s.",
      sodCustom: [{ id: "sc1", label: "Case-study one-pager for Northwind", qty: 1 }],
      sodTargets: { northwind: { messages: 60 } },
      sodAt: at(10, 5),
    },
    [`bharath|${todayKey(0)}`]: {
      ...emptyDaily(),
      plan: [
        {
          id: "b4",
          start: "10:00",
          end: "13:00",
          projectId: "northwind",
          taskIds: ["t8", "t10"],
          actualMinutes: 195,
        },
        {
          id: "b4b",
          start: "14:00",
          end: "19:00",
          projectId: "northwind",
          taskIds: ["t26", "t18"],
          actualMinutes: 270,
        },
      ],
      sodNote: "Telecalling block in the morning, emails after lunch.",
      sodTargets: { northwind: { calls: 25, responses: 4 } },
      sodAt: at(10, 12),
      eodNote: "Great call day, 2 people asked for a demo next week.",
      eodActuals: { northwind: { calls: 28, responses: 5, interest: 2 } },
      eodAt: at(18, 40),
      extra: [
        {
          id: "xb1",
          start: "08:30",
          end: "09:30",
          minutes: 60,
          work: "Call list cleanup before the shift",
          projectId: "northwind",
        },
        {
          id: "xb2",
          start: "13:00",
          end: "13:30",
          minutes: 30,
          work: "Worked through lunch on WhatsApp replies",
          projectId: "northwind",
        },
      ],
    },
    [`sachi|${todayKey(0)}`]: {
      ...emptyDaily(),
      plan: [
        {
          id: "b5",
          start: "10:00",
          end: "12:00",
          projectId: "helios",
          taskIds: [],
          custom: {
            title: "Helios pitch deck fixes for CFO call",
            priority: true,
            targetQty: 8,
            unit: "slides",
            projectId: "helios",
          },
        },
        {
          id: "b6",
          start: "12:00",
          end: "13:00",
          projectId: "helios",
          taskIds: [],
        },
        {
          id: "b6b",
          start: "14:00",
          end: "19:00",
          projectId: "helios",
          taskIds: [],
        },
      ],
      sodNote: "Deck fixes first (urgent), then L2 follow-ups.",
      sodTargets: { helios: { messages: 80, responses: 6 } },
      sodAt: at(10, 3),
    },
    [`bheeshma|${todayKey(0)}`]: {
      ...emptyDaily(),
      plan: [
        {
          id: "bb1",
          start: "10:00",
          end: "13:00",
          projectId: "northwind",
          taskIds: [],
          actualMinutes: 190,
        },
        {
          id: "bb2",
          start: "14:00",
          end: "15:00",
          projectId: "northwind",
          taskIds: [],
          actualMinutes: 60,
        },
        {
          id: "bb3",
          start: "15:00",
          end: "17:00",
          projectId: "bd",
          taskIds: ["t17", "t19"],
          actualMinutes: 100,
        },
      ],
      sodNote: "Review the team queue by noon, client call at 3.",
      sodTargets: { northwind: { meetings: 1, interest: 2 } },
      sodAt: at(10, 20),
      eodNote: "Approved 4 reviews, booked Acme Cloud for tomorrow.",
      eodActuals: { northwind: { meetings: 1, interest: 3 } },
      eodAt: at(18, 55),
    },
    [`udhaya|${lastDay}`]: {
      ...emptyDaily(),
      ...(historic[`udhaya|${lastDay}`] ?? {}),
      sodNote: "Follow-ups and WhatsApp batch.",
      eodNote: "Follow-ups 20/25 done, rest carried to today. Two positive replies.",
      eodActuals: { northwind: { responses: 2 } },
      eodAt: new Date(`${lastDay}T18:45:00`).toISOString(),
    },
  };
  const nowStamp = new Date().toISOString();
  // Updates "sent in the future" (later today than the current clock) are reset.
  Object.entries(daily).forEach(([key, entry]) => {
    if (key.split("|")[1] === todayKey(0)) {
      if (entry.eodAt && entry.eodAt > nowStamp) {
        entry.eodAt = undefined;
        entry.eodNote = "";
        entry.eodActuals = {};
        entry.eodCustom = [];
        entry.extra = [];
        entry.plan = entry.plan.map((b) => ({ ...b, actualMinutes: undefined }));
      }
      if (entry.sodAt && entry.sodAt > nowStamp)
        entry.sodAt = new Date(Date.now() - 5 * 6e4).toISOString();
    }
  });
  Object.entries(daily).forEach(([key, entry]) => {
    if (!entry.eodAt) return;
    const [person, day] = key.split("|");
    if (!entry.eodSnapshot || day === todayKey(0) || day === lastDay)
      entry.eodSnapshot = dailySnapshot(tasks, person, day, entry, entry.eodAt);
  });
  return daily;
}

/**
 * `Fg` - the complete initial (demo) store state: me, profiles, tasks,
 * projects, notices, convs, msgs, aliases, daily, weekly.
 */
export function buildInitialState() {
  const minutesAgo = (m) => new Date(Date.now() - m * 6e4).toISOString();
  let projects = buildDemoProjects();
  const tasks = buildDemoTasks(projects);
  const daily = buildDemoDaily(projects, tasks);
  Object.entries(daily)
    .sort((a, b) => (a[1].eodAt ?? "").localeCompare(b[1].eodAt ?? ""))
    .forEach(([key, entry]) => {
      if (!entry.eodAt) return;
      const [person, day] = key.split("|");
      projects = finalizeProjectsForDay(projects, person, day, entry.eodAt, daily);
    });
  return {
    me: "udhaya",
    profiles: {},
    tasks,
    projects,
    notices: [
      {
        id: "n1",
        to: "bheeshma",
        text: "Udhaya sent 30 prospect mapping to you for review",
        at: minutesAgo(24),
        read: false,
        kind: "task",
      },
      {
        id: "n2",
        to: "bheeshma",
        text: "Bharath resubmitted 60 templated 1st level messages for review (resubmit 1)",
        at: minutesAgo(42),
        read: false,
        kind: "task",
      },
      {
        id: "n3",
        to: "komala",
        text: "Sachi sent Helios pitch deck v2 to you for review",
        at: minutesAgo(30),
        read: false,
        kind: "task",
      },
      {
        id: "n4",
        to: "udhaya",
        text: "Bheeshma left feedback on 40 2nd level messages",
        at: minutesAgo(60),
        read: false,
        kind: "task",
      },
      {
        id: "n5",
        to: "udhaya",
        text: "Komala gave you a priority task: Northwind QBR deck",
        at: minutesAgo(300),
        read: true,
        kind: "task",
      },
      {
        id: "n6",
        to: "prajwal",
        text: "Bheeshma made you an admin of Northwind SaaS - US",
        at: minutesAgo(1440 * 6),
        read: true,
        kind: "project",
      },
      {
        id: "n7",
        to: "alok",
        text: "Prajwal sent 45 WhatsApp messages to you for review",
        at: minutesAgo(54),
        read: false,
        kind: "task",
      },
    ],
    convs: [
      {
        id: "c-all",
        name: "Everyone",
        memberIds: PEOPLE.map((p) => p.id),
        group: true,
      },
      {
        id: "c-fri",
        name: "Friday lunch plans",
        memberIds: ["udhaya", "bheeshma", "bharath", "sachi"],
        group: true,
      },
    ],
    msgs: [
      {
        id: "m1",
        convId: "c-all",
        alias: "Calm Otter",
        text: "Whoever refilled the chai machine, legend ☕",
        at: minutesAgo(120),
      },
      {
        id: "m2",
        convId: "c-all",
        alias: "Sunny Panda",
        text: "CRM is crawling today, anyone else?",
        at: minutesAgo(70),
      },
      {
        id: "m3",
        convId: "c-all",
        alias: "Brave Koala",
        text: "Yes 😅 coffee break till it loads",
        at: minutesAgo(65),
      },
      {
        id: "m4",
        convId: "c-fri",
        alias: "Witty Falcon",
        text: "Biryani or dosa this Friday?",
        at: minutesAgo(40),
      },
    ],
    aliases: {},
    daily,
    weekly: buildDemoWeekly(tasks),
  };
}
