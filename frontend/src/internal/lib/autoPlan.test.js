import test from "node:test";
import assert from "node:assert/strict";
import { assignedMinutesByProject, autoPlanBlocks } from "./autoPlan.js";

const lunch = { start: "13:00", end: "14:00" };
let n = 0;
const makeId = () => `a${++n}`;
const mins = (blocks) => blocks.reduce((s, b) => s + (Number(b.end.slice(0, 2)) * 60 + Number(b.end.slice(3)) - Number(b.start.slice(0, 2)) * 60 - Number(b.start.slice(3))), 0);
const run = (o) => autoPlanBlocks({ lunch, makeId, ...o });

test("an empty plan gets a block per project, one after another from 10:00", () => {
  const r = run({ assigned: { p1: 90, p2: 60 } });
  assert.deepEqual(r.plan.map((b) => [b.projectId, b.start, b.end, b.auto]), [["p1", "10:00", "11:30", true], ["p2", "11:30", "12:30", true]]);
  assert.deepEqual(r.autoPlanned, { p1: 90, p2: 60 });
  assert.deepEqual(r.extra, []);
});

test("planned minutes are topped up, not duplicated; nothing to add returns null", () => {
  const plan = [{ id: "x", start: "10:00", end: "11:00", projectId: "p1", taskIds: [] }];
  const r = run({ plan, assigned: { p1: 150 } });
  assert.equal(r.plan.length, 2);
  assert.equal(mins(r.plan.filter((b) => b.projectId === "p1")), 150);
  assert.equal(run({ plan, assigned: { p1: 60 } }), null);
  assert.equal(run({ plan, assigned: { p1: 30 } }), null);
});

test("a block the person deleted or shrank is not added back; growth adds only the difference", () => {
  assert.equal(run({ plan: [], autoPlanned: { p1: 120 }, assigned: { p1: 120 } }), null);
  assert.equal(run({ plan: [{ id: "x", start: "10:00", end: "10:30", projectId: "p1" }], autoPlanned: { p1: 120 }, assigned: { p1: 120 } }), null);
  const r = run({ plan: [], autoPlanned: { p1: 120 }, assigned: { p1: 180 } });
  assert.deepEqual(r.added, { p1: 60 });
  assert.equal(mins(r.plan), 60);
  assert.equal(r.autoPlanned.p1, 180);
});

test("lunch is respected: a block crossing it splits in two", () => {
  const r = run({ plan: [{ id: "x", start: "10:00", end: "12:00", projectId: "p9" }], assigned: { p1: 120 } });
  assert.deepEqual(r.plan.slice(1).map((b) => [b.id.includes("~"), b.start, b.end]), [[false, "12:00", "13:00"], [true, "14:00", "15:00"]]);
});

test("what does not fit before 19:00 goes to Extra hours", () => {
  const r = run({ plan: [{ id: "x", start: "10:00", end: "12:00", projectId: "p9" }], assigned: { p1: 480 }, names: { p1: "Northwind" } });
  assert.equal(mins(r.plan.filter((b) => b.projectId === "p1")), 360); // 12-13 and 14-19
  assert.equal(r.plan.at(-1).end, "19:00");
  assert.equal(r.extra.length, 1);
  assert.deepEqual([r.extra[0].minutes, r.extra[0].start, r.extra[0].end, r.extra[0].work, r.extra[0].projectId], [120, "19:00", "21:00", "Northwind", "p1"]);
  const again = run({ plan: r.plan, extra: r.extra, autoPlanned: r.autoPlanned, assigned: { p1: 480 } });
  assert.equal(again, null);
});

test("minutes already in Extra hours for the project count as planned", () => {
  assert.equal(run({ extra: [{ id: "e", start: "19:00", end: "20:00", minutes: 60, work: "x", projectId: "p1" }], assigned: { p1: 60 } }), null);
});

test("the plan holds the day's own tasks; earlier unfinished ones only when carry is asked for", () => {
  const today = "2026-10-15";
  const tasks = [
    { id: "1", assigneeId: "me", projectId: "p1", title: "T", date: today, targetMinutes: 60, status: "todo" },
    { id: "2", assigneeId: "me", projectId: "p1", title: "T", date: "2026-10-14", targetMinutes: 30, status: "todo" },
    { id: "3", assigneeId: "me", projectId: "p1", title: "T", date: "2026-10-14", targetMinutes: 90, status: "done" },
    { id: "4", assigneeId: "other", projectId: "p1", title: "T", date: today, targetMinutes: 500, status: "todo" },
  ];
  assert.deepEqual(assignedMinutesByProject(tasks, "me", today, { projects: [], today }), { p1: 60 });
  assert.deepEqual(assignedMinutesByProject(tasks, "me", today, { projects: [], today, carry: true }), { p1: 90 });
  assert.deepEqual(assignedMinutesByProject(tasks, "me", "2026-10-16", { projects: [], today }), {});
});

test("automatic Extra hours are capped at 3h a day", () => {
  const r = run({ plan: [{ id: "x", start: "10:00", end: "19:00", projectId: "p9" }], assigned: { p1: 600 } });
  assert.equal(r.extra.reduce((s, x) => s + x.minutes, 0), 180);
  assert.equal(r.autoPlanned.p1, 180);
  assert.equal(run({ plan: [{ id: "x", start: "10:00", end: "19:00", projectId: "p9" }], extra: r.extra, autoPlanned: r.autoPlanned, assigned: { p1: 600 } }), null);
});
