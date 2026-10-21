import test from "node:test";
import assert from "node:assert/strict";
import { splitEstimates } from "./estimateSplit.js";

const row = (id, projectId, more = {}) => ({ id, projectId, task: "t", ...more });
const est = (rows) => rows.map((r) => r.estMin);

test("planned minutes are split evenly over the project's rows in steps of 5", () => {
  const rows = [row("a", "p"), row("b", "p")];
  assert.deepEqual(est(splitEstimates(rows, [{ pid: "p", planned: 120 }])), [60, 60]);
});

test("the last row takes the remainder", () => {
  const rows = [row("a", "p"), row("b", "p"), row("c", "p")];
  assert.deepEqual(est(splitEstimates(rows, [{ pid: "p", planned: 100 }])), [30, 30, 40]);
  assert.deepEqual(est(splitEstimates([row("a", "p"), row("b", "p")], [{ pid: "p", planned: 65 }])), [30, 35]);
});

test("rows typed by hand keep their estimate and the rest shares what is left", () => {
  const rows = [row("a", "p", { estMin: 45, estManual: true }), row("b", "p"), row("c", "p"), row("d", "q")];
  const out = splitEstimates(rows, [{ pid: "p", planned: 120 }, { pid: "q", planned: 0 }]);
  assert.deepEqual(est(out), [45, 35, 40, undefined]);
  assert.equal(out[0].estManual, true);
  assert.equal(splitEstimates([row("a", "p", { estMin: 20, estManual: true })], [{ pid: "p", planned: 60 }]).length, 1);
});

test("nothing planned, or nothing to change, returns the same list", () => {
  const rows = [row("a", "p", { estMin: 33 })];
  assert.equal(splitEstimates(rows, [{ pid: "p", planned: 0 }]), rows);
  const done = splitEstimates([row("a", "p")], [{ pid: "p", planned: 60 }]);
  assert.equal(splitEstimates(done, [{ pid: "p", planned: 60 }]), done);
  assert.deepEqual(est(splitEstimates([row("a", "p", { estMin: 90, estManual: true }), row("b", "p")], [{ pid: "p", planned: 60 }])), [90, 0]);
});
