import test from 'node:test';
import assert from 'node:assert/strict';
import { streakOf } from './moodQuestLogic.js';

test('streak counts finished days in a row, ending today or yesterday', () => {
  const days = { '2026-10-12': { done: true }, '2026-10-11': { done: true }, '2026-10-09': { done: true } };
  assert.equal(streakOf(days, '2026-10-12'), 2); // today done: 12 and 11
  assert.equal(streakOf(days, '2026-10-13'), 2); // today not done yet: yesterday still counts
  assert.equal(streakOf(days, '2026-10-15'), 0); // a gap breaks it
  assert.equal(streakOf({}, '2026-10-12'), 0);
});

import { pickChallenge, CHALLENGES, ALL } from './moodQuestLogic.js';
test('every mood has challenges, ids are unique, and a re-roll never repeats the shown one', () => {
  assert.equal(new Set(ALL.map((c) => c[0])).size, ALL.length);
  for (const mood of Object.keys(CHALLENGES)) {
    assert.ok(CHALLENGES[mood].length >= 3);
    for (const [id] of CHALLENGES[mood]) for (let i = 0; i < 20; i += 1) assert.notEqual(pickChallenge(mood, id)[0], id);
  }
});
