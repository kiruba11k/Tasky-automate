import test from 'node:test';
import assert from 'node:assert/strict';
import { planColors } from './planColors.js';

const palette = ['A', 'B', 'C', 'D'];
const blk = (id, start, project) => ({ id, start, project });
const pref = (b) => ({ p1: 'A', p2: 'B', p3: 'A' })[b.project];
const colorsInOrder = (blocks, map) => [...blocks].sort((a, b) => a.start.localeCompare(b.start)).map((b) => map.get(b.id));
const neighboursDiffer = (list) => list.every((c, i) => i === 0 || c !== list[i - 1]);

test('different projects keep their own colour', () => {
  const blocks = [blk('a', '10:00', 'p1'), blk('b', '11:00', 'p2')];
  assert.deepEqual(colorsInOrder(blocks, planColors(blocks, pref, palette)), ['A', 'B']);
});

test('the same colour never repeats back to back, even for the same project or a colour clash', () => {
  const blocks = [blk('a', '10:00', 'p1'), blk('b', '11:00', 'p1'), blk('c', '12:00', 'p3'), blk('d', '13:00', 'p1')];
  const list = colorsInOrder(blocks, planColors(blocks, pref, palette));
  assert.ok(neighboursDiffer(list), list.join());
  assert.equal(list[0], 'A');
});

test('other work with no colour of its own also differs from its neighbours', () => {
  const blocks = [blk('a', '10:00', 'p1'), blk('b', '11:00', undefined), blk('c', '12:00', undefined), blk('d', '13:00', 'p2')];
  const list = colorsInOrder(blocks, planColors(blocks, pref, palette));
  assert.ok(neighboursDiffer(list), list.join());
});

test('a block split by lunch keeps one colour, and a long plan still never repeats', () => {
  const split = [blk('a', '10:00', 'p1'), blk('b', '11:00', 'p2'), blk('b~2', '14:00', 'p2'), blk('c', '15:00', 'p2')];
  const m = planColors(split, pref, palette);
  assert.equal(m.get('b'), m.get('b~2'));
  const many = Array.from({ length: 12 }, (_, i) => blk(`x${i}`, `${String(10 + (i % 9)).padStart(2, '0')}:${i < 9 ? '00' : '30'}`, 'p1'));
  assert.ok(neighboursDiffer(colorsInOrder(many, planColors(many, pref, palette))));
});
