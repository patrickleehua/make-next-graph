import test from 'node:test';
import assert from 'node:assert/strict';
import { rankStories } from '../src/feature.mjs';

test('ranks valid stories by score and uses ID to resolve ties', () => {
  const items = [
    { id: 9, type: 'story', score: 4 },
    { id: 2, type: 'story', score: 4 },
    { id: 8, type: 'story', score: 9 },
    { id: 3, type: 'story', score: 100, dead: true },
    { id: 4, type: 'story', score: 100, deleted: true },
    { id: 5, type: 'comment', score: 100 },
    { id: -1, type: 'story', score: 100 },
    { id: 7, type: 'story', score: NaN },
    null,
  ];
  assert.deepEqual(rankStories(items).map((item) => item.id), [8, 2, 9]);
});

test('limits the result, supports zero and defaults to five', () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, type: 'story', score: i }));
  assert.deepEqual(rankStories(items, 2).map((item) => item.id), [8, 7]);
  assert.equal(rankStories(items).length, 5);
  assert.deepEqual(rankStories(items, 0), []);
  assert.deepEqual(rankStories([]), []);
});

test('preserves the input array and record identity', () => {
  const a = Object.freeze({ id: 9, type: 'story', score: 1 });
  const b = Object.freeze({ id: 2, type: 'story', score: 5 });
  const input = Object.freeze([a, b]);
  const result = rankStories(input);
  assert.deepEqual(input, [a, b]);
  assert.deepEqual(result, [b, a]);
  assert.notEqual(result, input);
  assert.equal(result[0], b);
});

test('reports invalid inputs instead of silently returning a result', () => {
  for (const input of [null, {}, 'stories']) assert.throws(() => rankStories(input), TypeError);
  for (const limit of [-1, 1.5, NaN, '2', null]) assert.throws(() => rankStories([], limit), RangeError);
});
