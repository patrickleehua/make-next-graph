export function rankStories(items, limit = 5) {
  if (!Array.isArray(items)) throw new TypeError('Expected an array of story records');
  if (!Number.isInteger(limit) || limit < 0) throw new RangeError('Expected a nonnegative integer limit');
  return items.filter((item) => item && item.type === 'story' && !item.dead && !item.deleted
    && Number.isSafeInteger(item.id) && item.id > 0 && Number.isFinite(item.score))
    .sort((a, b) => b.score - a.score || a.id - b.id)
    .slice(0, limit);
}
