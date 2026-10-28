import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { capture } from '../skills/make-next-graph/scripts/record.mjs';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cli = path.join(project, 'skills/make-next-graph/scripts/make.mjs');

async function workspace(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'make-next-methods-'));
  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('make-next-methods-'));
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

const call = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('software init references selected native SDD files without copying them or requiring a tool adapter', async (t) => {
  const root = await workspace(t);
  const variants = {
    openspec: ['openspec/changes/rank-stories/proposal.md', 'openspec/changes/rank-stories/specs/ranking/spec.md', 'openspec/changes/rank-stories/tasks.md'],
    speckit: ['specs/001-rank-stories/spec.md', 'specs/001-rank-stories/plan.md', 'specs/001-rank-stories/tasks.md'],
    simple: ['acceptance.md'],
  };
  for (const [method, files] of Object.entries(variants)) {
    const folder = path.join(root, method);
    await mkdir(folder);
    await writeFile(path.join(folder, 'goal.md'), 'Rank source stories by score with stable ties.\n');
    for (const file of files) {
      await mkdir(path.dirname(path.join(folder, file)), { recursive: true });
      await writeFile(path.join(folder, file), `Native ${method} artifact: ${file}\n`);
    }
    const filename = path.join(folder, 'graph.json');
    const created = call('init', '--template', 'software', ...files.flatMap((file) => ['--spec', file]), '--out', filename);
    assert.equal(created.status, 0, created.stderr);
    const graph = JSON.parse(await readFile(filename, 'utf8'));
    const spec = graph.nodes.find((node) => node.id === 'software.spec');
    assert.deepEqual(spec.files, files);
    assert.deepEqual(spec.recipe.writes, files);
    assert.ok(!graph.nodes.some((node) => node.files.includes('spec.md')));
    const before = await Promise.all(files.map((file) => readFile(path.join(folder, file), 'utf8')));
    const next = call('next', filename, '--json');
    assert.equal(next.status, 0, next.stderr);
    assert.deepEqual(JSON.parse(next.stdout).ready.map((node) => node.id), ['software.tests']);
    assert.deepEqual(await Promise.all(files.map((file) => readFile(path.join(folder, file), 'utf8'))), before);
  }
});

test('native spec binding validates paths and rejects inapplicable or duplicate bindings before writing', async (t) => {
  const root = await workspace(t);
  for (const args of [
    ['--template', 'research', '--spec', 'spec.md'],
    ['--template', 'software', '--spec', '../private.md'],
    ['--template', 'software', '--spec', 'spec.md', '--spec', 'spec.md'],
  ]) {
    const result = call('init', ...args, '--out', path.join(root, 'graph.json'));
    assert.equal(result.status, 2);
    assert.deepEqual(await readdir(root), []);
  }
});

test('the small software example executes a meaningful red, the same tests green, and the delivered program', async (t) => {
  const root = await workspace(t);
  const example = path.join(project, 'examples/software-slice');
  await mkdir(path.join(root, 'src'));
  await mkdir(path.join(root, 'tests'));
  for (const [source, target] of [
    ['goal.md', 'goal.md'], ['goal.md', 'spec.md'], ['tests/acceptance.test.mjs', 'tests/acceptance.test.mjs'],
    ['starter.mjs', 'src/feature.mjs'], ['try.mjs', 'try.mjs'],
  ]) await writeFile(path.join(root, target), await readFile(path.join(example, source)));
  const filename = path.join(root, 'graph.json');
  const initialized = call('init', '--template', 'software', '--out', filename);
  assert.equal(initialized.status, 0, initialized.stderr);
  const testText = await readFile(path.join(root, 'tests/acceptance.test.mjs'), 'utf8');
  const red = await capture(process.execPath, ['--test', 'tests/acceptance.test.mjs'], path.join(root, 'checks/red.json'), { cwd: root });
  assert.equal(red.exitCode, 1, red.stdout + red.stderr);
  assert.match(red.stdout + red.stderr, /AssertionError/u);
  assert.doesNotMatch(red.stdout + red.stderr, /ERR_MODULE_NOT_FOUND|SyntaxError/u);
  await writeFile(path.join(root, 'src/feature.mjs'), await readFile(path.join(example, 'feature.mjs')));
  const green = await capture(process.execPath, ['--test', 'tests/acceptance.test.mjs'], path.join(root, 'checks/green.json'), { cwd: root });
  assert.equal(green.exitCode, 0, green.stdout + green.stderr);
  assert.equal(await readFile(path.join(root, 'tests/acceptance.test.mjs'), 'utf8'), testText);
  const actual = spawnSync(process.execPath, ['try.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(actual.status, 0, actual.stderr);
  assert.deepEqual(JSON.parse(actual.stdout).rankedIds, [8, 2, 9]);
  const next = call('next', filename, '--json');
  assert.deepEqual(JSON.parse(next.stdout).ready.map((node) => node.id), ['software.delivery']);
});
