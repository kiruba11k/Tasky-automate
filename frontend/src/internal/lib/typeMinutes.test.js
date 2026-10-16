import test from "node:test";
import assert from "node:assert/strict";
import { computeStandardMinutes, projectTaskTypes } from "./domain.js";

test("typeMinutes gives per-unit minutes for non-outreach task types", () => {
  const p = { typeMinutes: { deck: 90, email: 1.5 }, standards: { prospect: 2, l1: 2, l2: 1.5 } };
  assert.equal(computeStandardMinutes(p, "deck", 2), 180);
  assert.equal(computeStandardMinutes(p, "email", 3), 5);
  assert.equal(computeStandardMinutes(p, "email", 0.1), 1);
});

test("outreach types keep using the three legacy standards", () => {
  const p = { typeMinutes: { l1: 99 }, standards: { prospect: 3, l1: 4, l2: 5 } };
  assert.equal(computeStandardMinutes(p, "prospect", 10), 30);
  assert.equal(computeStandardMinutes(p, "l1", 10), 40);
  assert.equal(computeStandardMinutes(p, "l2", 10), 50);
});

test("types without a project value fall back to the built-in standard", () => {
  assert.equal(computeStandardMinutes({}, "deck", 1), computeStandardMinutes(undefined, "deck", 1));
});

test("projectTaskTypes hides the types a project removed", () => {
  const all = projectTaskTypes({});
  assert.ok(all.length > 3);
  const some = projectTaskTypes({ typesOff: ["deck", "email"] });
  assert.equal(some.length, all.length - 2);
  assert.ok(!some.some((t) => t.id === "deck"));
  assert.equal(projectTaskTypes(undefined).length, all.length);
});
