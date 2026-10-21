import test from "node:test";
import assert from "node:assert/strict";
import { moveRows, rowForDay, nextWorkingDay, isOffDay, moveTargetProblem, reschedulableTasks, maxPlanDate, rescheduleNote } from "./moveRows.js";

const row = (id, extra = {}) => ({ id, projectId: "p1", task: "l1", qty: 10, estMin: 30, doneQty: 4, actualMin: 20, remarks: "ok", status: "In progress", ...extra });
let n = 0;
const newId = () => `new${++n}`;

test("rows moved to today or later keep their targets and lose their results", () => {
  const r = rowForDay(row("a"), "x", "2026-10-26", "2026-10-21");
  assert.equal(r.id, "x");
  assert.equal(r.qty, 10);
  assert.equal(r.estMin, 30);
  assert.equal(r.doneQty, undefined);
  assert.equal(r.actualMin, undefined);
  assert.equal(r.remarks, "");
  assert.equal(r.status, undefined);
});

test("a milestone row starts again as Not started", () => {
  assert.equal(rowForDay(row("a", { kind: "milestone" }), "x", "2026-10-22", "2026-10-21").status, "Not started");
});

test("rows moved to a day that has gone by keep what was recorded", () => {
  const r = rowForDay(row("a"), "x", "2026-10-19", "2026-10-21");
  assert.equal(r.doneQty, 4);
  assert.equal(r.actualMin, 20);
  assert.equal(r.remarks, "ok");
});

test("moveRows moves one row or all rows and leaves the rest", () => {
  const from = [row("a"), row("b")];
  const to = [row("c")];
  const one = moveRows({ fromEntries: from, toEntries: to, ids: ["b"], targetDate: "2026-10-23", today: "2026-10-21", newId });
  assert.deepEqual(one.from.map((r) => r.id), ["a"]);
  assert.equal(one.to.length, 2);
  assert.equal(one.to[0].id, "c");
  assert.notEqual(one.to[1].id, "b");
  assert.equal(one.moved, 1);
  const all = moveRows({ fromEntries: from, toEntries: to, targetDate: "2026-10-23", today: "2026-10-21", newId });
  assert.equal(all.from.length, 0);
  assert.equal(all.to.length, 3);
  assert.equal(from.length, 2, "the inputs are not changed");
});

test("moveRows with nothing to move returns null", () => {
  assert.equal(moveRows({ fromEntries: [], targetDate: "2026-10-23", newId }), null);
  assert.equal(moveRows({ fromEntries: [row("a")], ids: ["zzz"], targetDate: "2026-10-23", newId }), null);
});

test("the next working day skips weekends, holidays and full-day leave, but not half days", () => {
  const profiles = { me: { leaves: [{ date: "2026-10-26", kind: "holiday" }, { date: "2026-10-27", kind: "full" }, { date: "2026-10-28", kind: "half" }] } };
  assert.equal(nextWorkingDay(profiles, "me", "2026-10-23"), "2026-10-28"); // Fri -> weekend, Mon holiday, Tue leave -> Wed (half day)
  assert.equal(nextWorkingDay({}, "me", "2026-10-21"), "2026-10-22");
  assert.equal(nextWorkingDay(profiles, "other", "2026-10-23"), "2026-10-26", "another person's leave is not mine");
  assert.equal(isOffDay(profiles, "me", "2026-10-24"), true);
  assert.equal(isOffDay(profiles, "me", "2026-10-28"), false);
});

test("a move target must be a date in range on a day that was not sent", () => {
  assert.ok(moveTargetProblem("", {}));
  assert.equal(moveTargetProblem(maxPlanDate("2026-10-21"), {}, { today: "2026-10-21" }), null);
  assert.ok(moveTargetProblem("2027-03-01", {}, { today: "2026-10-21" }));
  assert.ok(moveTargetProblem("2026-10-23", { eodAt: "x" }, { today: "2026-10-21" }));
  assert.equal(moveTargetProblem("2026-10-24", {}, { today: "2026-10-21" }), null);
});

test("only open tasks given to or by the viewer can be rescheduled", () => {
  const t = (id, extra) => ({ id, assigneeId: "me", assignedById: "pm", date: "2026-10-21", status: "todo", ...extra });
  const tasks = [t("1"), t("2", { status: "done" }), t("3", { status: "in_review" }), t("4", { date: "2026-10-22" }), t("5", { assigneeId: "x" })];
  assert.deepEqual(reschedulableTasks(tasks, "me", "2026-10-21", "me").map((x) => x.id), ["1"]);
  assert.deepEqual(reschedulableTasks(tasks, "me", "2026-10-21", "pm").map((x) => x.id), ["1"]);
  assert.deepEqual(reschedulableTasks(tasks, "me", "2026-10-21", "stranger"), []);
  assert.deepEqual(rescheduleNote("21 Oct", "23 Oct", "Ann"), { action: "rescheduled", note: "21 Oct to 23 Oct by Ann" });
});
