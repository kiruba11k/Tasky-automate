import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SHEET_COLOR, sheetAchievedText, sheetColorOf, sheetTargetText } from "./sheetText.js";

test("sheetColorOf prefers the per-table colour, then the single colour, then the default", () => {
  assert.equal(sheetColorOf({ sheetColors: { day: "#112233" }, sheetColor: "#445566" }, "day"), "#112233");
  assert.equal(sheetColorOf({ sheetColors: { day: "#112233" }, sheetColor: "#445566" }, "week"), "#445566");
  assert.equal(sheetColorOf({}, "day"), DEFAULT_SHEET_COLOR);
  assert.equal(sheetColorOf(undefined, "week"), "#7B1A48");
});

test("sheetTargetText", () => {
  assert.equal(sheetTargetText({ qty: 5, desc: "to leads" }, "Calls"), "5 Calls (to leads)");
  assert.equal(sheetTargetText({ qty: 5, desc: "more calls" }, "Calls"), "5 Calls");
  assert.equal(sheetTargetText({ qty: 0 }, "Calls"), "Calls");
  assert.equal(sheetTargetText({ kind: "milestone", targetText: "Ship it" }, "Launch"), "Ship it");
  assert.equal(sheetTargetText({ kind: "text" }, "Notes"), "Notes");
});

test("sheetAchievedText", () => {
  assert.equal(sheetAchievedText({ kind: "text", actualText: "Done" }, "N", 0), "Done");
  assert.equal(sheetAchievedText({ kind: "milestone", status: "Not started" }, "M", 0), "");
  assert.equal(sheetAchievedText({ kind: "milestone", status: "Blocked" }, "M", 0), "Blocked");
  assert.equal(sheetAchievedText({ qty: 5 }, "Calls", 3), "3 of 5 Calls");
  assert.equal(sheetAchievedText({}, "Calls", 3), "3 Calls");
  assert.equal(sheetAchievedText({ qty: 5 }, "Calls", 0), "");
});
