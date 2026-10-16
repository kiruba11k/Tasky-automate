import test from "node:test";
import assert from "node:assert/strict";
import { CUSTOM_TASK, entryName, taskChoices } from "./entryHelpers.js";
import { TASK_TYPES } from "../lib/constants.js";

const project = { id: "p1", customStandards: [{ id: "c1", name: "Audit" }] };
const ids = (list) => list.map((t) => t.id);

test("taskChoices: standard types, project standards, then the person's extras", () => {
  const list = taskChoices(project, { hidden: [], extra: ["Client call"], removed: [] });
  assert.deepEqual(ids(list), [...TASK_TYPES.map((t) => t.id), "std:c1", "my:Client call"]);
  assert.equal(taskChoices(project).length, TASK_TYPES.length + 1);
});

test("taskChoices leaves out hidden and removed options, including extras and project standards", () => {
  const first = TASK_TYPES[0].id;
  const second = TASK_TYPES[1].id;
  const list = taskChoices(project, { hidden: [first, "my:Client call"], extra: ["Client call", "Hiring"], removed: [second, "std:c1"] });
  assert.ok(!ids(list).includes(first) && !ids(list).includes(second) && !ids(list).includes("std:c1") && !ids(list).includes("my:Client call"));
  assert.ok(ids(list).includes("my:Hiring"));
});

test("entryName shows extras without the prefix, custom names and standard names", () => {
  assert.equal(entryName({ task: "my:Client call" }, project), "Client call");
  assert.equal(entryName({ task: CUSTOM_TASK, custom: "Odd job" }, project), "Odd job");
  assert.equal(entryName({ task: CUSTOM_TASK }, project), "Custom task");
  assert.equal(entryName({ task: "std:c1" }, project), "Audit");
  assert.equal(entryName({ task: TASK_TYPES[0].id }, project), TASK_TYPES[0].name);
});
