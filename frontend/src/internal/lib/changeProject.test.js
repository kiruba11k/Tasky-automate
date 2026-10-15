import test from "node:test";
import assert from "node:assert/strict";
import { changeProject, moveEntries } from "./changeProject.js";

const projects = [
  { id: "p1", name: "One", customStandards: [{ id: "s1", name: "Special" }] },
  { id: "p2", name: "Two", customStandards: [] },
];
const blk = (id, projectId, extra = {}) => ({ id, start: "10:00", end: "11:00", projectId, taskIds: [], ...extra });
const row = (id, projectId, extra = {}) => ({ id, projectId, task: "t", ...extra });

test("moveEntries re-points only the old project's rows and keeps custom standards as custom tasks", () => {
  const out = moveEntries([row("a", "p1"), row("b", "p2"), row("c", "p1", { task: "std:s1" })], "p1", "p2", projects);
  assert.deepEqual(out.map((r) => r.projectId), ["p2", "p2", "p2"]);
  assert.equal(out[2].task, "__custom");
  assert.equal(out[2].custom, "Special");
  assert.equal(moveEntries([row("a", "p1")], "p1", "p1", projects)[0].projectId, "p1");
});

test("changing the only block of a project moves its rows and clears Auto", () => {
  const r = changeProject({ plan: [blk("a", "p1", { auto: true }), blk("b~2", "p2")], entries: [row("e1", "p1")], projects, from: "p1", to: "other:Hiring", blockId: "a" });
  assert.equal(r.plan[0].projectId, "other:Hiring");
  assert.equal(r.plan[0].auto, undefined);
  assert.equal(r.entries[0].projectId, "other:Hiring");
  assert.ok(r.movedEntries);
});

test("a block split by lunch (ids a and a~2) changes as one", () => {
  const r = changeProject({ plan: [blk("a", "p1"), blk("a~2", "p1")], entries: [], projects, from: "p1", to: "p2", blockId: "a" });
  assert.deepEqual(r.plan.map((b) => b.projectId), ["p2", "p2"]);
});

test("rows stay when another block still uses the old project", () => {
  const r = changeProject({ plan: [blk("a", "p1"), blk("b", "p1")], entries: [row("e1", "p1")], projects, from: "p1", to: "p2", blockId: "a" });
  assert.equal(r.entries[0].projectId, "p1");
  assert.equal(r.movedEntries, false);
  assert.equal(changeProject({ plan: [blk("a", "p1")], from: "p1", to: "p1", blockId: "a" }), null);
  assert.equal(changeProject({ plan: [blk("a", "p1")], from: "p1", to: "p2", blockId: "zzz" }), null);
});

test("extra rows count as uses of the old project and follow a change", () => {
  const extra = [{ id: "x1", projectId: "p1", work: "One", minutes: 30 }];
  const kept = changeProject({ plan: [blk("a", "p1")], extra, entries: [row("e1", "p1")], projects, from: "p1", to: "p2", blockId: "a" });
  assert.equal(kept.entries[0].projectId, "p1");
  const r = changeProject({ extra, entries: [row("e1", "p1")], projects, from: "p1", to: "other:Training", extraId: "x1" });
  assert.equal(r.extra[0].projectId, undefined);
  assert.equal(r.extra[0].work, "Training");
  assert.equal(r.entries[0].projectId, "other:Training");
});

test("autoPlanned for the old project is raised to the assigned minutes so it is not topped up again", () => {
  const r = changeProject({ plan: [blk("a", "p1", { auto: true })], autoPlanned: { p1: 30 }, assigned: { p1: 60 }, projects, from: "p1", to: "p2", blockId: "a" });
  assert.equal(r.autoPlanned.p1, 60);
  const r2 = changeProject({ plan: [blk("a", "p1")], autoPlanned: { p1: 90 }, assigned: { p1: 60 }, projects, from: "p1", to: "p2", blockId: "a" });
  assert.equal(r2.autoPlanned.p1, 90);
  const r3 = changeProject({ plan: [blk("a", "p1")], assigned: {}, projects, from: "p1", to: "p2", blockId: "a" });
  assert.deepEqual(r3.autoPlanned, {});
});

test("changing a whole table moves every block, extra row and saved row; a table with no block only moves rows", () => {
  const r = changeProject({ plan: [blk("a", "p1"), blk("b", "p1")], extra: [{ id: "x", projectId: "p1", work: "One", minutes: 15 }], entries: [row("e", "p1"), row("f", "p2")], projects, from: "p1", to: "p2" });
  assert.ok(r.plan.every((b) => b.projectId === "p2"));
  assert.equal(r.extra[0].projectId, "p2");
  assert.deepEqual(r.entries.map((x) => x.projectId), ["p2", "p2"]);
  const free = changeProject({ plan: [blk("a", "p2")], entries: [row("e", "p1")], projects, from: "p1", to: "p2" });
  assert.equal(free.plan[0].projectId, "p2");
  assert.equal(free.entries[0].projectId, "p2");
});
