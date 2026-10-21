import test from 'node:test';
import assert from 'node:assert/strict';
import { eodProjectWork, buildEodRequests, eodStatusText, pendingForReviewer, groupByProject, decisionFor, sendSummary } from './eodReview.js';

const projects = [
  { id: 'a', name: 'A', pmId: 'pmA' },
  { id: 'b', name: 'B', pmId: 'pmB' },
  { id: 'c', name: 'C', pmId: 'u1' },
  { id: 'd', name: 'D' },
];
const row = (projectId, extra = {}) => ({ id: Math.random().toString(36), projectId, task: 'deck', estMin: 30, actualMin: 40, ...extra });
const AT = '2026-10-21T18:00:00.000Z';

test('a day reports each project that has rows once, with its minutes', () => {
  const work = eodProjectWork({ entries: [row('a'), row('a', { actualMin: undefined, estMin: 20 }), row('b'), row('a', { task: '' }), row('other:Admin work')] });
  assert.deepEqual(work.map((w) => [w.projectId, w.rows.length, w.minutes]), [['a', 2, 60], ['b', 1, 40]]);
});

test('plan blocks and extra hours count only when the project has no rows', () => {
  const work = eodProjectWork({
    entries: [row('a')],
    plan: [{ projectId: 'a', actualMinutes: 50 }, { projectId: 'b', actualMinutes: 90 }, { projectId: 'd', actualMinutes: 0 }, { custom: { title: 'x', projectId: 'c' }, actualMinutes: 15 }],
    extra: [{ work: 'x', minutes: 30, projectId: 'b' }, { work: 'y', minutes: 30 }],
  });
  const by = Object.fromEntries(work.map((w) => [w.projectId, w]));
  assert.equal(by.a.minutes, 40);
  assert.equal(by.b.minutes, 120);
  assert.equal(by.b.rows.length, 0);
  assert.equal(by.c.minutes, 15);
  assert.equal(by.d, undefined);
  assert.deepEqual(eodProjectWork({}), []);
});

test('a send goes to each project manager; own projects approve at once; no manager means no request', () => {
  const record = { entries: [row('a'), row('a'), row('b'), row('c'), row('d')] };
  const { reviews, sends } = buildEodRequests({ record, projects, personId: 'u1', at: AT });
  assert.deepEqual(reviews.a, { status: 'pending', reviewerId: 'pmA', sentAt: AT });
  assert.deepEqual(reviews.b, { status: 'pending', reviewerId: 'pmB', sentAt: AT });
  assert.equal(reviews.c.status, 'approved');
  assert.equal(reviews.c.auto, true);
  assert.equal(reviews.c.by, 'u1');
  assert.equal(reviews.d, undefined);
  assert.deepEqual(sends.map((s) => [s.projectId, s.reviewerId, s.rows]), [['a', 'pmA', 2], ['b', 'pmB', 1]]);
});

test('status text and tone', () => {
  assert.deepEqual(eodStatusText({ status: 'pending' }, 'Bheeshma'), { tone: 'butter', text: 'Sent to Bheeshma for approval' });
  assert.deepEqual(eodStatusText({ status: 'approved' }, 'Bheeshma'), { tone: 'mint', text: 'Approved by Bheeshma' });
  assert.deepEqual(eodStatusText({ status: 'changes', note: 'Redo it' }, 'Bheeshma'), { tone: 'coral', text: 'Changes asked: Redo it' });
  assert.equal(eodStatusText(undefined), null);
  assert.equal(sendSummary(3, 150), '3 tasks, 2h 30m');
  assert.equal(sendSummary(1, 45), '1 task, 45m');
});

test('a manager sees only the pending requests of their projects; leadership sees all; never their own', () => {
  const daily = {
    'u1|2026-10-21': { entries: [row('a'), row('b')], eodReviews: { a: { status: 'pending', reviewerId: 'pmA', sentAt: AT }, b: { status: 'pending', reviewerId: 'pmB', sentAt: AT } } },
    'u2|2026-10-20': { entries: [row('a')], eodReviews: { a: { status: 'pending', reviewerId: 'pmA', sentAt: AT } } },
    'u2|2026-10-21': { eodReviews: { a: { status: 'approved', reviewerId: 'pmA', sentAt: AT, decidedAt: AT, by: 'pmA' } } },
    'pmA|2026-10-21': { eodReviews: { a: { status: 'pending', reviewerId: 'pmA', sentAt: AT } } },
  };
  const a = pendingForReviewer({ daily, projects, me: 'pmA' });
  assert.deepEqual(a.map((x) => [x.personId, x.day, x.projectId, x.rows.length]), [['u1', '2026-10-21', 'a', 1], ['u2', '2026-10-20', 'a', 1]]);
  assert.deepEqual(pendingForReviewer({ daily, projects, me: 'pmB' }).map((x) => x.projectId), ['b']);
  assert.equal(pendingForReviewer({ daily, projects, me: 'nobody' }).length, 0);
  assert.equal(pendingForReviewer({ daily, projects, me: 'boss', seesAll: true }).length, 4);
  assert.deepEqual(groupByProject(pendingForReviewer({ daily, projects, me: 'boss', seesAll: true })).map((g) => [g.projectId, g.items.length]), [['a', 3], ['b', 1]]);
});

test('a decision answers the current send and a send-back needs feedback', () => {
  const pending = { status: 'pending', reviewerId: 'pmA', sentAt: AT };
  const ok = decisionFor(pending, 'approved', 'pmA', '2026-10-21T19:00:00.000Z');
  assert.deepEqual(ok, { status: 'approved', reviewerId: 'pmA', sentAt: AT, by: 'pmA', decidedAt: '2026-10-21T19:00:00.000Z', for: AT });
  assert.throws(() => decisionFor(pending, 'changes', 'pmA', AT, '  '), /Feedback cannot be empty\./);
  const back = decisionFor(pending, 'changes', 'pmA', AT, ' Redo the deck ');
  assert.equal(back.note, 'Redo the deck');
  assert.equal(back.status, 'changes');
  assert.equal('note' in decisionFor({ ...back }, 'approved', 'pmA', AT), false);
});
