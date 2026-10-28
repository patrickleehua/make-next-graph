import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runner = path.join(project, 'examples/web-digest/run.mjs');

test('fixture demo resumes in a new process, reuses its snapshot and checks the actual digest', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'make-next-graph-demo-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('make-next-graph-demo-'));
    await rm(root, { recursive: true, force: true });
  });
  const run = (...args) => spawnSync(process.execPath, [runner, '--fixture', '--root', root, ...args], { encoding: 'utf8' });
  const first = run('--until', 'snapshot');
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(JSON.parse(first.stdout).ready, ['ranking', 'coverage']);
  const snapshot = path.join(root, 'sources/snapshot.json');
  const original = await readFile(snapshot, 'utf8');
  const time = (await stat(snapshot)).mtimeMs;
  const resumed = run();
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(JSON.parse(resumed.stdout).status, 'evidence-ready');
  assert.equal(await readFile(snapshot, 'utf8'), original);
  assert.equal((await stat(snapshot)).mtimeMs, time);
  const raw = JSON.parse(await readFile(path.join(root, 'checks/verify.json'), 'utf8'));
  assert.equal(raw.exitCode, 0);
  assert.match(raw.stdout, /3 items/u);
  const deliveryTime = (await stat(path.join(root, 'delivery.md'))).mtimeMs;
  assert.equal(run().status, 0);
  assert.equal((await stat(path.join(root, 'delivery.md'))).mtimeMs, deliveryTime);
  await writeFile(path.join(root, 'digest.md'), '# Broken digest\n');
  const bad = spawnSync(process.execPath, [path.join(project, 'examples/web-digest/verify.mjs'), root], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  const liveAgainstFixture = spawnSync(process.execPath, [runner, '--root', root], { encoding: 'utf8' });
  assert.equal(liveAgainstFixture.status, 2);
  assert.match(liveAgainstFixture.stderr, /Snapshot mode differs/u);
});

test('delivery resume checks current artifacts even with preserved timestamps and recovers after a real repair', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'make-next-graph-repair-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('make-next-graph-repair-'));
    await rm(root, { recursive: true, force: true });
  });
  const run = () => spawnSync(process.execPath, [runner, '--fixture', '--root', root], { encoding: 'utf8' });
  assert.equal(run().status, 0);
  const digest = path.join(root, 'digest.md');
  const original = await readFile(digest, 'utf8');
  const times = await stat(digest);
  await writeFile(digest, '# Wrong content with an old timestamp\n');
  await utimes(digest, times.atime, times.mtime);
  const rejected = run();
  assert.equal(rejected.status, 2, 'A previous green record must not hide a changed result');
  const failed = JSON.parse(await readFile(path.join(root, 'checks/verify.json'), 'utf8'));
  assert.equal(failed.exitCode, 1);
  assert.match(failed.stderr, /displayed stories/u);
  assert.equal(await readFile(digest, 'utf8'), '# Wrong content with an old timestamp\n');
  await writeFile(digest, original);
  const repaired = run();
  assert.equal(repaired.status, 0, repaired.stderr);
  assert.equal(JSON.parse(await readFile(path.join(root, 'checks/verify.json'), 'utf8')).exitCode, 0);
});

test('the digest verifier checks displayed metadata, per-item links and coverage against the source', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'make-next-graph-content-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('make-next-graph-content-'));
    await rm(root, { recursive: true, force: true });
  });
  const made = spawnSync(process.execPath, [runner, '--fixture', '--root', root], { encoding: 'utf8' });
  assert.equal(made.status, 0, made.stderr);
  const file = path.join(root, 'digest.md');
  const original = await readFile(file, 'utf8');
  const pieces = original.split(/(?=^## )/mu);
  const variants = [
    original.replace('## Synthetic fixture: dependency graphs', '## A fabricated headline'),
    original.replace('Saved score: 30', 'Saved score: 999'),
    [pieces[0], pieces[2], pieces[1], ...pieces.slice(3)].join(''),
    original.replace('https://example.com/graphs', 'https://swap.invalid/TEMP')
      .replace('https://example.org/artifacts', 'https://example.com/graphs')
      .replace('https://swap.invalid/TEMP', 'https://example.org/artifacts'),
    original.replace('3 returned stories from 3 source hosts.', '999 returned stories from 999 source hosts.'),
    original.replace('item?id=1)', 'item?id=TEMP)').replace('item?id=2)', 'item?id=1)').replace('item?id=TEMP)', 'item?id=2)'),
    original.replace('[Original article](<https://example.com/graphs>)', '[Original article](<https://example.com/graphs>)\n[Original article](<https://example.com/graphs>)'),
  ];
  for (const content of variants) {
    assert.notEqual(content, original);
    await writeFile(file, content);
    const checked = spawnSync(process.execPath, [path.join(project, 'examples/web-digest/verify.mjs'), root], { encoding: 'utf8' });
    assert.equal(checked.status, 1, 'Inconsistent displayed metadata must fail even when links and IDs remain present');
  }
});
