import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

try {
  const root = path.resolve(process.argv[2] ?? '.');
  const snapshot = JSON.parse(await readFile(path.join(root, 'sources/snapshot.json'), 'utf8'));
  const ranking = JSON.parse(await readFile(path.join(root, 'analysis/ranking.json'), 'utf8'));
  const coverage = JSON.parse(await readFile(path.join(root, 'analysis/coverage.json'), 'utf8'));
  const digest = await readFile(path.join(root, 'digest.md'), 'utf8');
  assert.ok(['live', 'fixture'].includes(snapshot.mode));
  assert.ok(snapshot.items.length > 0 && snapshot.items.length <= 5);
  assert.equal(coverage.stories, snapshot.items.length);
  const ranked = [...snapshot.items].sort((a, b) => b.score - a.score || a.id - b.id);
  assert.deepEqual(ranking.ids, ranked.map((item) => item.id));
  const [header, ...sections] = digest.split(/^## /mu);
  const expectedHosts = {};
  assert.equal(sections.length, ranked.length, 'Wrong number of displayed stories');
  for (let i = 0; i < ranked.length; i++) {
    const item = ranked[i];
    const section = sections[i];
    const heading = section.split(/\r?\n/u)[0]
      .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
      .replace(/\\([\\`*_{}\[\]#!|])/gu, '$1');
    assert.equal(heading, item.title.replace(/[\r\n]/gu, ' '), 'Displayed title differs from the source');
    assert.ok(section.includes(`<!-- item:${item.id} -->`), 'Displayed item order differs from ranking');
    const scores = [...section.matchAll(/^Saved score: (.+)$/gmu)];
    assert.equal(scores.length, 1, 'Each displayed story needs exactly one score');
    assert.equal(Number(scores[0][1]), item.score, 'Displayed score differs from the source');
    assert.ok(snapshot.ids.includes(item.id));
    const discussion = `https://news.ycombinator.com/item?id=${item.id}`;
    const host = new URL(item.url ?? discussion).hostname;
    expectedHosts[host] = (expectedHosts[host] ?? 0) + 1;
    const links = (label) => [...section.matchAll(new RegExp(`^\\[${label}\\]\\((.+)\\)\\r?$`, 'gmu'))].map((match) => match[1]);
    assert.deepEqual(links('Discussion'), [discussion], `Discussion link differs for item ${item.id}`);
    assert.deepEqual(links('Original article'), item.url ? [`<${new URL(item.url).href}>`] : [], `Original link differs for item ${item.id}`);
  }
  assert.deepEqual(coverage.hosts, expectedHosts);
  const displayedCoverage = [...header.matchAll(/^(\d+) returned stories from (\d+) source hosts\. Sorted by saved score\.\r?$/gmu)];
  assert.equal(displayedCoverage.length, 1, 'Expected one displayed source coverage summary');
  assert.equal(Number(displayedCoverage[0][1]), snapshot.items.length, 'Displayed story count differs from the snapshot');
  assert.equal(Number(displayedCoverage[0][2]), Object.keys(expectedHosts).length, 'Displayed host count differs from the snapshot');
  assert.equal((digest.match(/<!-- item:\d+ -->/gu) ?? []).length, snapshot.items.length);
  assert.ok(digest.includes(snapshot.source));
  assert.ok(digest.includes(snapshot.fetchedAt));
  assert.ok(digest.includes(`Mode: ${snapshot.mode}`));
  process.stdout.write(`PASS: ${snapshot.items.length} items; displayed titles/scores, item order, links, source coverage and provenance match the saved ${snapshot.mode} snapshot.\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
