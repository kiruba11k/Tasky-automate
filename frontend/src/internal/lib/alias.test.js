import test from 'node:test';
import assert from 'node:assert/strict';
import { randomAlias, ALIAS_ADJECTIVES, ALIAS_ANIMALS } from './domain.js';

test('an alias is "Adjective Animal" and never one that is already taken', () => {
  const taken = new Set();
  for (let i = 0; i < 200; i += 1) {
    const a = randomAlias(taken);
    const [adj, animal] = a.split(' ');
    assert.ok(ALIAS_ADJECTIVES.includes(adj) && ALIAS_ANIMALS.includes(animal));
    assert.ok(!taken.has(a), `${a} was already taken`);
    taken.add(a);
  }
  assert.ok(ALIAS_ADJECTIVES.length * ALIAS_ANIMALS.length >= 400);
});
