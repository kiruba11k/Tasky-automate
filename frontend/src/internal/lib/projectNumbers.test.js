import test from "node:test";
import assert from "node:assert/strict";
import { projectPeriodCounts } from "../ui/projectStats.js";
import { loggedMetricExtras, rowMetric, taskMetric } from "./entries.js";
import { personMetrics } from "./domain.js";
import { templateMetrics, templateStandards, templateStandardMetric } from "./projectTemplates.js";
import { todayKey, addDays, currentWeekStart } from "./dates.js";

// The user's case: the Automation template, yesterday's Daily update with two Completed milestone rows.
const ANN = "ann";
const WEEK = currentWeekStart(0);
const day = (n) => addDays(WEEK, n);
const IN_WEEK = todayKey(0) > WEEK ? WEEK : addDays(WEEK, -7); // a day of the current project week
const emptyCounts = { week: {}, month: {}, pastWeeks: [], pastMonths: [] };
const project = (extra = {}) => ({
  id: "auto", template: "automation", ...emptyCounts,
  metrics: templateMetrics("automation"),
  customStandards: templateStandards("automation").map((c, i) => ({ ...c, id: `cs${i}` })),
  ...extra,
});
const stdId = (p, name) => `std:${p.customStandards.find((c) => c.name === name).id}`;
const milestone = (p, name, o = {}) => ({
  id: "r" + Math.random(), projectId: p.id, task: stdId(p, name), kind: "milestone",
  targetText: "Make the tracker working end to end", status: "Completed", estMin: 360, actualMin: 365, ...o,
});
const week = (p, daily, tasks = []) => projectPeriodCounts(p, tasks, daily, { kind: "week", key: WEEK, end: addDays(WEEK, 4) });
const month = (p, daily, tasks = []) => projectPeriodCounts(p, tasks, daily, { kind: "month", key: todayKey(0).slice(0, 7) });
// a weekday of this project week that is not after today, so the work is real
const DAY = todayKey(0) >= day(1) ? day(1) : day(0);

test("the Automation template's standards count toward its numbers", () => {
  const p = project();
  assert.deepEqual(p.customStandards.map((c) => c.metric), ["workflows", "bugs", "tested", "releases", "demos"]);
  assert.equal(templateStandardMetric("automation", "fix BUG"), "bugs");
  assert.equal(rowMetric(p, { task: stdId(p, "Build workflow") }), "workflows");
  // an older project made from the template has no `metric` on its standards: the template's mapping by name fills in
  const old = project({ customStandards: p.customStandards.map(({ metric, ...c }) => c) });
  assert.equal(rowMetric(old, { task: stdId(old, "Fix bug") }), "bugs");
  assert.equal(rowMetric(old, { task: "__custom", custom: " fix bug " }), "bugs");
  assert.equal(rowMetric(old, { task: "my:Test / QA" }), "tested");
  assert.equal(rowMetric(project({ template: undefined, customStandards: [{ id: "x", name: "Fix bug" }] }), { task: "std:x" }), undefined, "no template, no mapping");
});

test("yesterday's two Completed milestone rows give Workflows built 1 and Bugs fixed 1 for the week and the month", () => {
  const p = project();
  const daily = { [`${ANN}|${DAY}`]: { entries: [milestone(p, "Build workflow"), milestone(p, "Fix bug", { estMin: 120, actualMin: 115 })], eodAt: "x" } };
  const w = week(p, daily);
  assert.deepEqual([w.counts.workflows, w.counts.bugs, w.counts.releases ?? 0], [1, 1, 0]);
  assert.deepEqual(w.auto, { workflows: 1, bugs: 1 });
  assert.deepEqual([month(p, daily).counts.workflows, month(p, daily).counts.bugs], [1, 1]);
  // it counts as soon as it is saved, before the day is sent
  delete daily[`${ANN}|${DAY}`].eodAt;
  assert.equal(week(p, daily).counts.workflows, 1);
  // the milestone also counts as a done task for the person
  assert.equal(personMetrics([], daily, ANN, DAY, DAY).tasks, 2);
});

test("milestones count only once Completed; number rows add doneQty; text rows nothing", () => {
  const p = project();
  const num = (name, o) => ({ id: "n" + Math.random(), projectId: p.id, task: stdId(p, name), kind: "number", qty: 5, ...o });
  const daily = {
    [`${ANN}|${DAY}`]: { entries: [milestone(p, "Build workflow", { status: "In progress" }), num("Fix bug", { doneQty: 3 }), num("Test / QA", { qty: 4 }), { ...num("Deploy / release"), kind: "text", doneQty: 9 }] },
    [`bo|${DAY}`]: { entries: [num("Fix bug", { doneQty: 2 }), milestone(p, "Build workflow")] },
  };
  const c = week(p, daily).counts;
  assert.deepEqual([c.workflows, c.bugs, c.tested ?? 0, c.releases ?? 0], [1, 5, 0, 0]);
});

test("not double counted with an assigned task, and the larger of logged rows and tasks wins", () => {
  const p = project();
  const row = { id: "n", projectId: p.id, task: stdId(p, "Fix bug"), kind: "number", qty: 4, doneQty: 3 };
  const task = (o) => ({ id: "t" + Math.random(), assigneeId: ANN, projectId: p.id, typeId: p.customStandards[1].id, customName: "Fix bug", qty: 4, doneQty: 4, status: "done", date: DAY, title: "x", unit: "bugs", ...o });
  const daily = { [`${ANN}|${DAY}`]: { entries: [row] } };
  assert.equal(taskMetric(p, task()), "bugs");
  assert.equal(week(p, daily, [task()]).counts.bugs, 4, "task 4 vs row 3: 4, not 7");
  assert.equal(week(p, daily, [task({ doneQty: 2 })]).counts.bugs, 3, "row 3 vs task 2: 3, not 5");
  assert.equal(week(p, {}, [task()]).counts.bugs, 4, "an approved assigned task counts on its own");
  assert.equal(week(p, {}, [task({ status: "todo" })]).counts.bugs ?? 0, 0, "an unfinished task does not");
  // a task of another person on the same day is a different bucket
  assert.equal(week(p, daily, [task({ assigneeId: "bo" })]).counts.bugs, 7);
});

test("typed project numbers (end-of-day actuals) are not added on top: the larger per person, day and number", () => {
  const p = project();
  const daily = { [`${ANN}|${DAY}`]: { entries: [milestone(p, "Fix bug"), milestone(p, "Fix bug")], eodActuals: { [p.id]: { bugs: 5, workflows: 1 } } } };
  const c = week(p, daily).counts;
  assert.deepEqual([c.bugs, c.workflows], [5, 1]);
  assert.equal(week(p, { [`${ANN}|${DAY}`]: { entries: [milestone(p, "Fix bug")], eodActuals: { [p.id]: { bugs: 0 } } } }).counts.bugs, 1);
});

test("a saved week's typed numbers win over what is derived", () => {
  const daily = { [`${ANN}|${DAY}`]: { entries: [milestone(project(), "Build workflow")] } };
  const p = project({ weekActuals: { [WEEK]: { workflows: 4 } } });
  const c = week(p, daily).counts;
  assert.equal(c.workflows, 4);
  assert.equal(c.bugs ?? 0, 0, "numbers not typed stay derived");
  assert.equal(week(project(), daily).counts.workflows, 1);
});

test("only this project's rows count", () => {
  const p = project();
  const other = project({ id: "other" });
  const daily = { [`${ANN}|${DAY}`]: { entries: [milestone(other, "Build workflow"), milestone({ id: "other:Stuff", customStandards: p.customStandards }, "Fix bug")] } };
  assert.deepEqual(loggedMetricExtras(p, [], daily, WEEK, addDays(WEEK, 7)), {});
  assert.equal(week(p, daily).counts.workflows ?? 0, 0);
});

test("days outside the period are not counted; a past week is read from the stored days", () => {
  const p = project();
  const lastWeek = addDays(WEEK, -7);
  const daily = { [`${ANN}|${lastWeek}`]: { entries: [milestone(p, "Fix bug")] }, [`${ANN}|${DAY}`]: { entries: [milestone(p, "Build workflow")] } };
  assert.deepEqual([week(p, daily).counts.bugs ?? 0, week(p, daily).counts.workflows], [0, 1]);
  const past = projectPeriodCounts({ ...p, pastWeeks: [{ start: lastWeek, counts: { bugs: 2 } }] }, [], daily, { kind: "week", key: lastWeek });
  assert.equal(past.counts.bugs, 3, "the counter plus the logged row");
});

test("outbound numbers are unchanged", () => {
  const p = { id: "ob", template: "outbound", metrics: templateMetrics("outbound"), customStandards: [], ...emptyCounts, week: { calls: 2 }, month: { calls: 5 } };
  const row = (o) => ({ id: "x" + Math.random(), projectId: "ob", task: "l1", kind: "number", qty: 30, ...o });
  const task = { id: "t", assigneeId: ANN, projectId: "ob", typeId: "l1", qty: 30, doneQty: 20, status: "done", date: DAY, title: "x", unit: "messages" };
  const daily = { [`${ANN}|${DAY}`]: { entries: [row({ doneQty: 25 })], eodActuals: { ob: { calls: 3 } } } };
  const c = week(p, daily, [task]).counts;
  assert.deepEqual([c.messages, c.calls, c.responses ?? 0], [25, 5, 0]); // messages: task 20 + the 5 the row adds; calls 2 counter + 3 typed
  assert.deepEqual(week(p, {}, []).counts, { calls: 2 });
  assert.equal(month(p, {}).counts.calls, 5);
  assert.deepEqual(loggedMetricExtras(p, [task], daily, WEEK, addDays(WEEK, 7)), {});
});
