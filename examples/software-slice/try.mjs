import assert from 'node:assert/strict';
import { rankStories } from './src/feature.mjs';

const result = rankStories([
  { id: 9, type: 'story', score: 4 },
  { id: 2, type: 'story', score: 4 },
  { id: 8, type: 'story', score: 9 },
  { id: 3, type: 'story', score: 100, dead: true },
]);
assert.deepEqual(result.map((item) => item.id), [8, 2, 9]);
process.stdout.write(`${JSON.stringify({ rankedIds: result.map((item) => item.id) })}\n`);
