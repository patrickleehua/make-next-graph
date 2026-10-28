import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { artifactPath, inspectGraph, loadGraph, observeFile, validateGraph } from '../skills/make-next-graph/scripts/graph.mjs';
import { capture } from '../skills/make-next-graph/scripts/record.mjs';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cli = path.join(project, 'skills/make-next-graph/scripts/make.mjs');

async function workspace(t) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'make-next-graph-'));
  t.after(async () => {
    const resolved = path.resolve(folder);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('make-next-graph-'));
    await rm(resolved, { recursive: true, force: true });
  });
  return folder;
}

function node(id, requires = [], extra = {}) {
  return { id, title: id, kind: 'artifact', files: [`${id}.md`], requires,
    acceptance: 'Observable result matches the goal.', recipe: { instructions: `Produce ${id}` }, ...extra };
}
const definition = (nodes, goals = [nodes.at(-1).id]) => ({ version: 1, name: 'Test task', goals, nodes });
const graph = (nodes, goals) => validateGraph(definition(nodes, goals));
const check = (id, requires = []) => node(id, requires, { kind: 'check', files: [`${id}.json`], check: { path: `${id}.json` } });
const put = (root, file, content = 'Real artifact\n') => writeFile(path.join(root, file), content);

test('smallest frontier, parallel suggestions, all outputs, and read-only recomputation', async (t) => {
  const root = await workspace(t);
  const task = graph([node('source', [], { kind: 'input', recipe: undefined }), node('a', ['source']),
    node('b', ['source'], { files: ['b.md', 'b-extra.md'] }), node('delivery', ['a', 'b'])]);
  await put(root, 'source.md');
  await put(root, 'b.md');
  const before = await readdir(root);
  const first = await inspectGraph(task, root);
  assert.deepEqual(first.ready.map((item) => item.id), ['a', 'b']);
  assert.deepEqual(first.parallelCandidates, ['a', 'b']);
  assert.equal(first.evidenceReady, false);
  assert.deepEqual(await inspectGraph(task, root), first);
  assert.deepEqual(await readdir(root), before);
  await put(root, 'a.md');
  await put(root, 'b-extra.md');
  assert.deepEqual((await inspectGraph(task, root)).ready.map((item) => item.id), ['delivery']);
});

test('goal selection ignores unrelated unknown evidence and missing branches', async (t) => {
  const root = await workspace(t);
  const task = graph([node('a'), check('bad'), node('other', ['bad'])], ['a']);
  await put(root, 'bad.json', '{broken');
  const result = await inspectGraph(task, root);
  assert.deepEqual(result.nodes.map((item) => item.id), ['a']);
  assert.equal(result.status, 'needs-work');
  assert.deepEqual(result.ready.map((item) => item.id), ['a']);
  await assert.rejects(inspectGraph(task, root, { goals: ['absent'] }), /Unknown selected goal/u);
});

test('real failure blocks delivery and proposes investigation, not a claimed pass', async (t) => {
  const root = await workspace(t);
  const task = graph([check('tests'), node('delivery', ['tests'])]);
  await put(root, 'tests.json', JSON.stringify({ exitCode: 1, stdout: 'not ok - required behavior', stderr: '' }));
  const result = await inspectGraph(task, root);
  assert.equal(result.nodes[0].fact, 'failed');
  assert.deepEqual(result.ready.map((item) => [item.id, item.action]), [['tests', 'investigate-failure']]);
  assert.deepEqual(result.nodes[1].blockedBy, ['tests']);
  assert.equal(result.evidenceReady, false);
});

test('unverified result stays unverified through existing downstream artifacts', async (t) => {
  const root = await workspace(t);
  const task = graph([check('tests'), node('delivery', ['tests'])]);
  await put(root, 'tests.json', JSON.stringify({ exitCode: null, stdout: '', stderr: '', reason: 'Dependency unavailable' }));
  await put(root, 'delivery.md');
  const result = await inspectGraph(task, root);
  assert.equal(result.nodes[0].fact, 'unverified');
  assert.equal(result.nodes[1].fact, 'present');
  assert.equal(result.nodes[1].usable, false);
  assert.equal(result.status, 'needs-attention');
  assert.deepEqual(result.ready, []);
});

test('truncated or malformed check output and unreadable inputs are unknown', async (t) => {
  const root = await workspace(t);
  const task = graph([check('tests')]);
  for (const raw of ['{broken', '{"exitCode":0}', '{"exitCode":"0","stdout":"","stderr":""}']) {
    await put(root, 'tests.json', raw);
    assert.equal((await inspectGraph(task, root)).nodes[0].fact, 'unknown');
  }
  const observation = async (_, file) => ({ path: file, fact: 'unknown', reason: 'EACCES' });
  const denied = await inspectGraph(graph([node('input', [], { kind: 'input', recipe: undefined }), node('output', ['input'])]), root, { observe: observation });
  assert.equal(denied.status, 'needs-attention');
  assert.deepEqual(denied.ready, []);
  assert.equal(denied.nodes[0].fact, 'unknown');
});

test('missing external input asks for the input rather than fabricating a producer', async (t) => {
  const root = await workspace(t);
  const task = graph([node('goal', [], { kind: 'input', recipe: undefined }), node('delivery', ['goal'])]);
  const result = await inspectGraph(task, root);
  assert.deepEqual(result.ready, []);
  assert.equal(result.waiting[0].reason, 'External input is missing');
});

test('existing final file cannot hide a missing transitive prerequisite', async (t) => {
  const root = await workspace(t);
  const task = graph([node('first'), node('middle', ['first']), node('final', ['middle'])]);
  await put(root, 'middle.md');
  await put(root, 'final.md');
  const result = await inspectGraph(task, root);
  assert.equal(result.evidenceReady, false);
  assert.deepEqual(result.ready.map((item) => item.id), ['first']);
  assert.equal(result.nodes[2].fact, 'present');
  assert.equal(result.nodes[2].usable, false);
});

test('newer upstream is a transitive advisory and never deletes or invalidates artifacts', async (t) => {
  const root = await workspace(t);
  const task = graph([node('a'), node('b', ['a']), node('c', ['b'])]);
  for (const file of ['a.md', 'b.md', 'c.md']) await put(root, file);
  await utimes(path.join(root, 'a.md'), 300, 300);
  await utimes(path.join(root, 'b.md'), 200, 200);
  await utimes(path.join(root, 'c.md'), 100, 100);
  const result = await inspectGraph(task, root);
  assert.equal(result.evidenceReady, true);
  assert.deepEqual(result.nodes.map((item) => item.fact), ['present', 'present', 'present']);
  assert.deepEqual(result.nodes[2].possiblyAffectedBy, ['b']);
  assert.equal(result.attention.length, 2);
  assert.equal(await readFile(path.join(root, 'c.md'), 'utf8'), 'Real artifact\n');
  assert.equal((await stat(path.join(root, 'c.md'))).mtimeMs, 100000);
});

test('adding a domain intermediate preserves existing artifacts and exposes the new gap', async (t) => {
  const root = await workspace(t);
  await put(root, 'draft.md');
  await put(root, 'delivery.md');
  const before = graph([node('draft'), node('delivery', ['draft'])]);
  assert.equal((await inspectGraph(before, root)).evidenceReady, true);
  const after = graph([node('draft'), node('domain-review', ['draft']), node('delivery', ['draft', 'domain-review'])]);
  const result = await inspectGraph(after, root);
  assert.deepEqual(result.ready.map((item) => item.id), ['domain-review']);
  assert.equal(result.nodes[2].fact, 'present');
  assert.equal(result.evidenceReady, false);
  assert.equal(await readFile(path.join(root, 'delivery.md'), 'utf8'), 'Real artifact\n');
});

test('composition loads reusable fragments, deduplicates a diamond and rejects escaping includes', async (t) => {
  const root = await workspace(t);
  await mkdir(path.join(root, 'parts'));
  await put(root, 'parts/base.json', JSON.stringify({ version: 1, nodes: [node('base')] }));
  await put(root, 'parts/left.json', JSON.stringify({ version: 1, includes: ['base.json'], nodes: [node('left', ['base'])] }));
  await put(root, 'parts/right.json', JSON.stringify({ version: 1, includes: ['base.json'], nodes: [node('right', ['base'])] }));
  const top = { ...definition([node('final', ['left', 'right'])]), includes: ['parts/left.json', 'parts/right.json'] };
  await put(root, 'graph.json', JSON.stringify(top));
  assert.deepEqual((await loadGraph(path.join(root, 'graph.json'))).nodes.map((item) => item.id), ['base', 'left', 'right', 'final']);
  await put(root, 'graph.json', JSON.stringify({ ...top, includes: ['../outside.json'] }));
  await assert.rejects(loadGraph(path.join(root, 'graph.json')), /Path must/u);
});

test('dependency cycles, unknown nodes, duplicate producers and stored status are rejected', () => {
  assert.throws(() => graph([node('a', ['b']), node('b', ['a'])]), /Dependency cycle/u);
  assert.throws(() => graph([node('a', ['absent'])]), /unknown prerequisite/u);
  assert.throws(() => graph([node('a'), node('a')]), /duplicate node/u);
  assert.throws(() => graph([node('a'), node('b', [], { files: ['a.md'] })]), /Two producers/u);
  assert.throws(() => graph([node('a', [], { status: 'done' })]), /unsupported fields/u);
});

test('include cycles and duplicate IDs across fragments are rejected', async (t) => {
  const root = await workspace(t);
  await put(root, 'part.json', JSON.stringify({ version: 1, includes: ['part.json'], nodes: [] }));
  await put(root, 'graph.json', JSON.stringify({ ...definition([] , ['a']), includes: ['part.json'] }));
  await assert.rejects(loadGraph(path.join(root, 'graph.json')), /Include cycle/u);
  await put(root, 'part.json', JSON.stringify({ version: 1, nodes: [node('a')] }));
  await put(root, 'graph.json', JSON.stringify({ ...definition([node('a')]), includes: ['part.json'] }));
  await assert.rejects(loadGraph(path.join(root, 'graph.json')), /duplicate node/u);
});

test('portable paths reject traversal, absolute paths and ambiguous Windows names', () => {
  for (const file of ['../private', 'a/../private', 'C:\\private', '/private', '\\\\server\\file', 'a//b', 'NUL.txt', 'a/CON', 'a*.txt', 'a.']) {
    assert.throws(() => artifactPath(file));
  }
  assert.equal(artifactPath('results\\test.json'), 'results/test.json');
});

test('empty files, directories and out-of-root symlinks are unknown', async (t) => {
  const root = await workspace(t);
  await put(root, 'empty.md', '');
  await mkdir(path.join(root, 'folder'));
  assert.equal((await observeFile(root, 'empty.md')).fact, 'unknown');
  assert.equal((await observeFile(root, 'folder')).fact, 'unknown');
  const outside = await workspace(t);
  await put(outside, 'private.md');
  try { await symlink(outside, path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.diagnostic('Symlink test unavailable on this host'); return; } throw error; }
  assert.equal((await observeFile(root, 'escape/private.md')).fact, 'unknown');
  assert.equal((await observeFile(root, 'escape/missing.md')).fact, 'unknown');
});

test('a dangling directory symlink is unknown and never suggested as a writable output', async (t) => {
  const root = await workspace(t), outside = await workspace(t);
  try { await symlink(path.join(outside, 'absent'), path.join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) { t.diagnostic('Symlink test unavailable on this host'); return; } throw error; }
  assert.equal((await observeFile(root, 'escape/output.md')).fact, 'unknown');
  const result = await inspectGraph(graph([node('output', [], {files:['escape/output.md']})]), root);
  assert.equal(result.evidenceReady, false);
  assert.deepEqual(result.ready, []);
  assert.equal(result.attention[0].action, 'inspect-evidence');
});

test('explicit raw capture retains real failures, unavailable commands and expected red exit', async (t) => {
  const root = await workspace(t);
  const fail = await capture(process.execPath, ['-e', 'process.stdout.write("assertion failed");process.stderr.write("detail");process.exit(1)'], path.join(root, 'red.json'));
  assert.equal(fail.exitCode, 1);
  assert.equal(fail.stdout, 'assertion failed');
  assert.equal(fail.stderr, 'detail');
  const task = graph([node('red', [], { kind: 'check', files: ['red.json'], check: { path: 'red.json', expectExitCode: 1 } })]);
  assert.equal((await inspectGraph(task, root)).evidenceReady, true);
  assert.equal((await inspectGraph(task, root)).semanticAcceptance, 'not-evaluated');
  const unavailable = await capture('definitely-not-an-installed-command-78283', [], path.join(root, 'missing.json'));
  assert.equal(unavailable.exitCode, null);
  assert.ok(unavailable.reason);
  const timeout = await capture(process.execPath, ['-e', 'setInterval(()=>{},1000)'], path.join(root, 'timeout.json'), { timeout: 100 });
  assert.equal(timeout.exitCode, null);
});

test('a bounded large-output capture remains readable and unverified', async (t) => {
  const root = await workspace(t);
  const output = path.join(root, 'loud.json');
  const record = await capture(process.execPath, ['-e', 'process.stdout.write("\\u0000".repeat(20 * 1024 * 1024))'], output);
  assert.equal(record.exitCode, null);
  assert.ok((await stat(output)).size <= 4 * 1024 * 1024, 'captured evidence must fit the check reader');
  const result = await inspectGraph(graph([check('loud')]), root);
  assert.equal(result.nodes[0].fact, 'unverified');
  assert.equal(result.evidenceReady, false);
  assert.ok(result.nodes[0].reason);
});

test('default next output identifies the unreadable file and reason', async (t) => {
  const root = await workspace(t);
  const filename = path.join(root, 'graph.json');
  await put(root, 'empty.md', '');
  await put(root, 'readable.md');
  await put(root, 'graph.json', JSON.stringify(definition([node('source', [], {
    kind: 'input', recipe: undefined, files: ['empty.md', 'readable.md'],
  })])));
  const result = spawnSync(process.execPath, [cli, 'next', filename], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /empty\.md.*Empty or incomplete artifact/u);
});

test('CLI init is standalone, refuses overwrite, and next does not interpret recipe commands', async (t) => {
  const root = await workspace(t);
  const filename = path.join(root, 'graph.json');
  const initialized = spawnSync(process.execPath, [cli, 'init', '--template', 'content', '--out', filename], { encoding: 'utf8' });
  assert.equal(initialized.status, 0, initialized.stderr);
  const original = await readFile(filename, 'utf8');
  assert.equal(JSON.parse(original).includes, undefined);
  assert.equal(spawnSync(process.execPath, [cli, 'init', '--template', 'content', '--out', filename]).status, 2);
  assert.equal(await readFile(filename, 'utf8'), original);
  await put(root, 'unsafe.json', JSON.stringify(definition([node('a', [], { recipe: { instructions: 'Do nothing automatically', command: 'create some-side-effect' } })])));
  const inspected = spawnSync(process.execPath, [cli, 'next', path.join(root, 'unsafe.json'), '--json'], { encoding: 'utf8' });
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.equal(JSON.parse(inspected.stdout).ready[0].id, 'a');
  assert.deepEqual((await readdir(root)).sort(), ['graph.json', 'unsafe.json']);
});

test('the copied skill bundle works outside the source repository, including raw command capture', async (t) => {
  const root = await workspace(t);
  const bundle = path.join(root, 'portable skill');
  await cp(path.join(project, 'skills/make-next-graph'), bundle, { recursive: true });
  assert.match(await readFile(path.join(bundle, 'LICENSE'), 'utf8'), /MIT License/u);
  const standalone = path.join(bundle, 'scripts/make.mjs');
  const taskFile = path.join(root, 'task/graph.json');
  const initialized = spawnSync(process.execPath, [standalone, 'init', '--template', 'research', '--out', taskFile], { encoding: 'utf8', cwd: root });
  assert.equal(initialized.status, 0, initialized.stderr);
  await put(path.join(root, 'task'), 'goal.md', 'Compare public sources and deliver a sourced recommendation.\n');
  const inspected = spawnSync(process.execPath, [standalone, 'next', taskFile, '--json'], { encoding: 'utf8', cwd: root });
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.deepEqual(JSON.parse(inspected.stdout).ready.map((item) => item.id), ['research.sources']);
  const recordPath = path.join(root, 'task/check.json');
  const captured = spawnSync(process.execPath, [path.join(bundle, 'scripts/record.mjs'), recordPath, '--', process.execPath, '-e', 'process.stdout.write("actual output");process.exit(7)'], { encoding: 'utf8', cwd: root });
  assert.equal(captured.status, 7, captured.stderr);
  assert.equal(captured.stdout, 'actual output');
  assert.equal(JSON.parse(await readFile(recordPath, 'utf8')).exitCode, 7);
});
