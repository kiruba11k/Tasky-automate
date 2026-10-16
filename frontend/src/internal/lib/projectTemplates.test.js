import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  AUTO_COUNTED_METRIC_IDS,
  templateOf,
  templateMetrics,
  usesMeetings,
  validateMetrics,
} from "./projectTemplates.js";
import { DEFAULT_METRICS } from "./domain.js";
import { TASK_TYPES } from "./constants.js";

test("template ids are unique and the default exists", () => {
  const ids = PROJECT_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_TEMPLATE_ID));
  assert.ok(PROJECT_TEMPLATES.length >= 3);
});

test("outbound is exactly today's numbers with every task type on", () => {
  const t = templateOf("outbound");
  assert.deepEqual(t.metrics, DEFAULT_METRICS);
  assert.deepEqual(t.typesOff, []);
  assert.deepEqual(templateOf(undefined), t, "old projects without a template are outbound");
  assert.deepEqual(templateOf({ id: "x" }), t);
  assert.deepEqual(templateOf("nonsense"), t);
  assert.equal(usesMeetings({}), true);
});

test("every template is well formed", () => {
  for (const t of PROJECT_TEMPLATES) {
    assert.ok(t.name && t.description && t.icon, `${t.id} has a name, description and icon`);
    assert.deepEqual(validateMetrics(t.metrics).map((m) => m.id), t.metrics.map((m) => m.id), `${t.id} metrics validate`);
    assert.equal(new Set(t.metrics.map((m) => m.id)).size, t.metrics.length, `${t.id} metric ids are unique`);
    assert.equal(new Set(t.metrics.map((m) => m.label.toLowerCase())).size, t.metrics.length);
    t.typesOff.forEach((id) => assert.ok(TASK_TYPES.some((x) => x.id === id), `${t.id} hides a real task type (${id})`));
    const names = t.customStandards.map((c) => c.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, `${t.id} standards are unique`);
    t.customStandards.forEach((c) => assert.ok(c.name && c.unit && c.minutes > 0 && c.minutes <= 480));
  }
});

test("only outbound numbers are counted automatically from tasks", () => {
  for (const t of PROJECT_TEMPLATES) {
    if (t.id === "outbound") continue;
    t.metrics.forEach((m) => assert.ok(!AUTO_COUNTED_METRIC_IDS.includes(m.id), `${t.id}/${m.id} must be counted by hand`));
    const outboundIds = DEFAULT_METRICS.map((m) => m.id);
    t.metrics.forEach((m) => assert.ok(!outboundIds.includes(m.id), `${t.id}/${m.id} must not reuse an outbound id`));
    assert.equal(usesMeetings({ template: t.id }), false);
  }
  for (const id of AUTO_COUNTED_METRIC_IDS) assert.ok(DEFAULT_METRICS.some((m) => m.id === id));
});

test("non-outbound templates hide the outreach task types", () => {
  for (const id of ["automation", "agents", "blank"]) {
    const off = templateOf(id).typesOff;
    for (const type of ["prospect", "l1", "l2", "followup", "whatsapp", "email"]) assert.ok(off.includes(type), `${id} hides ${type}`);
  }
});

test("templateMetrics returns copies", () => {
  const a = templateMetrics("automation");
  a[0].label = "changed";
  assert.notEqual(templateMetrics("automation")[0].label, "changed");
});

test("validateMetrics rejects bad lists", () => {
  assert.throws(() => validateMetrics([{ id: "a", label: " " }]));
  assert.throws(() => validateMetrics([{ id: "a", label: "A" }, { id: "b", label: "a" }]));
  assert.throws(() => validateMetrics([{ id: "a", label: "A" }, { id: "a", label: "B" }]));
  assert.throws(() => validateMetrics(Array.from({ length: 31 }, (_, i) => ({ id: `m${i}`, label: `M${i}` }))));
  const out = validateMetrics([{ label: "New number" }]);
  assert.ok(out[0].id.startsWith("n-"));
});
