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

import { mergeQuest, normalizeQuest } from './moodQuestLogic.js';
test('progress from two devices merges: all stickers, finished days win, old list shape is upgraded', () => {
  assert.deepEqual(normalizeQuest({ days: {}, stickers: ['hi', 'tidy'] }, '2026-10-12').stickers, { hi: '2026-10-12', tidy: '2026-10-12' });
  const phone = { days: { '2026-10-12': { mood: 'tired', challenge: 'window', done: false, at: 5 } }, stickers: { window: '2026-10-11' } };
  const laptop = { days: { '2026-10-12': { mood: 'tired', challenge: 'window', done: true, at: 9 }, '2026-10-11': { mood: 'happy', challenge: 'joke', done: true, at: 1 } }, stickers: { joke: '2026-10-11' } };
  const m = mergeQuest(phone, laptop);
  assert.equal(m.days['2026-10-12'].done, true); // finished beats unfinished
  assert.equal(Object.keys(m.days).length, 2);
  assert.deepEqual(Object.keys(m.stickers).sort(), ['joke', 'window']);
  assert.deepEqual(mergeQuest(m, m), m); // merging again changes nothing
  assert.deepEqual(mergeQuest(undefined, undefined), { days: {}, stickers: {} });
});
