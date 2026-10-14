import test from 'node:test';
import assert from 'node:assert/strict';
import { trackerRole } from '../src/tracker.js';

test('a named project approver is at least a manager, even without an admin account', () => {
  process.env.PROJECT_APPROVERS = 'komala.m@leadstrategus.com';
  try {
    assert.equal(trackerRole({ email: 'komala.m@leadstrategus.com', role: 'member' }), 'manager');
    assert.equal(trackerRole({ email: 'Komala.M@leadstrategus.com', role: 'team_leader' }), 'manager');
    assert.equal(trackerRole({ email: 'x@y.com', role: 'member', approver: true }), 'manager');
    assert.equal(trackerRole({ email: 'komala.m@leadstrategus.com', role: 'member', track_role: 'pm' }), 'pm');
    assert.equal(trackerRole({ email: 'komala.m@leadstrategus.com', founder: true }), 'founder');
    assert.equal(trackerRole({ email: 'other@y.com', role: 'member' }), 'resource');
    assert.equal(trackerRole({ email: 'other@y.com', role: 'team_leader' }), 'pm');
  } finally {
    delete process.env.PROJECT_APPROVERS;
  }
});
