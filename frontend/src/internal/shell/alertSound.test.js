import test from 'node:test';
import assert from 'node:assert/strict';
import { alertTune, loudest, playAlert } from './alertSound.js';

test('unknown kinds fall back to the plain ding', () => {
  assert.equal(alertTune('good'), 'good');
  assert.equal(alertTune('nope'), 'info');
});

test('when several alerts arrive together the most important tune wins', () => {
  assert.equal(loudest(['chat', 'info']), 'info');
  assert.equal(loudest(['good', 'late', 'info']), 'late');
  assert.equal(loudest(['soon', 'warn']), 'soon');
});

test('without a browser (or before the first click) playing is a quiet no-op', () => {
  assert.equal(playAlert('late'), false);
});
