#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture } from '../../skills/make-next-graph/scripts/record.mjs';
import { inspectGraph, loadGraph } from '../../skills/make-next-graph/scripts/graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

async function exists(file) {
  try {
    const info = await stat(file);
    if (!info.isFile() || !info.size) throw new Error(`Incomplete artifact: ${file}; inspect it before resuming`);
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function save(file, content) {
  if (await exists(file)) return;
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, content, { flag: 'wx' });
  await rename(temp, file);
}

async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const inline = (value) => String(value).replace(/[\r\n]/gu, ' ').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/([\\`*_{}\[\]#!|])/gu, '\\$1');

async function run() {
  const args = process.argv.slice(2);
  const options = { root: '.work/web-digest', until: 'delivery', fixture: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fixture') options.fixture = true;
    else if (['--root', '--until'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const key = args[i].slice(2);
      options[key] = args[++i];
    }
    else throw new Error('Usage: node run.mjs [--root <directory>] [--until snapshot|analysis|delivery] [--fixture]');
  }
  if (!['snapshot', 'analysis', 'delivery'].includes(options.until)) throw new Error('Invalid --until stage');
  const root = path.resolve(options.root);
  await mkdir(root, { recursive: true });
  const at = (file) => path.join(root, file);
  await save(at('graph.json'), await readFile(path.join(here, 'graph.json'), 'utf8'));
  await save(at('goal.md'), await readFile(path.join(here, 'goal.md'), 'utf8'));
  if (!(await exists(at('sources/snapshot.json')))) {
    let snapshot;
    if (options.fixture) snapshot = JSON.parse(await readFile(path.join(here, 'fixture.json'), 'utf8'));
    else {
      const source = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const list = await getJSON(source);
      if (!Array.isArray(list) || !list.every(Number.isSafeInteger)) throw new Error('Unexpected topstories response');
      const ids = list.slice(0, 5);
      const returned = await Promise.all(ids.map((id) => getJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)));
      const items = returned.filter((item) => item && item.type === 'story' && !item.deleted && !item.dead);
      if (!items.length || items.some((item) => !Number.isSafeInteger(item.id) || typeof item.title !== 'string' || !Number.isFinite(item.score))) {
        throw new Error('No usable story metadata returned');
      }
      snapshot = { mode: 'live', source, fetchedAt: new Date().toISOString(), ids, items };
    }
    await save(at('sources/snapshot.json'), json(snapshot));
  }
  const snapshot = JSON.parse(await readFile(at('sources/snapshot.json'), 'utf8'));
  if (snapshot.mode !== (options.fixture ? 'fixture' : 'live')) throw new Error('Snapshot mode differs; use a new output directory');
  if (options.until !== 'snapshot') {
    // Independent example producers. The generic planner does not launch them.
    await Promise.all([
      save(at('analysis/ranking.json'), json({ ids: [...snapshot.items].sort((a, b) => b.score - a.score || a.id - b.id).map((item) => item.id) })),
      save(at('analysis/coverage.json'), json({ stories: snapshot.items.length, hosts: snapshot.items.reduce((hosts, item) => {
        const host = new URL(item.url ?? `https://news.ycombinator.com/item?id=${item.id}`).hostname;
        hosts[host] = (hosts[host] ?? 0) + 1;
        return hosts;
      }, {}) })),
    ]);
  }
  if (options.until === 'delivery') {
    const ranking = JSON.parse(await readFile(at('analysis/ranking.json'), 'utf8'));
    const coverage = JSON.parse(await readFile(at('analysis/coverage.json'), 'utf8'));
    const byId = new Map(snapshot.items.map((item) => [item.id, item]));
    const lines = ['# Public web digest', '', `Mode: ${snapshot.mode}`, `Retrieved: ${snapshot.fetchedAt}`, `Source: <${snapshot.source}>`, '',
      `${coverage.stories} returned stories from ${Object.keys(coverage.hosts).length} source hosts. Sorted by saved score.`, '',
      'This digest uses API metadata only. Article bodies, claims and live link availability were not verified.', ''];
    for (const id of ranking.ids) {
      const item = byId.get(id);
      lines.push(`## ${inline(item.title)}`, `<!-- item:${item.id} -->`, '', `Saved score: ${item.score}`, '',
        ...(item.url ? [`[Original article](<${new URL(item.url).href}>)`] : ['No original URL was returned.']),
        `[Discussion](https://news.ycombinator.com/item?id=${id})`, '');
    }
    await save(at('digest.md'), `${lines.join('\n')}\n`);
    // An explicit delivery run verifies the current bytes, even if timestamps were
    // preserved. Keep the snapshot and edited artifacts; never repair by overwriting them.
    await capture(process.execPath, [path.join(here, 'verify.mjs'), root], at('checks/verify.json'), { cwd: root });
    const check = JSON.parse(await readFile(at('checks/verify.json'), 'utf8'));
    if (check.exitCode !== 0) throw new Error(`Verification did not pass: ${check.stderr || check.reason}; inspect checks/verify.json`);
    await save(at('delivery.md'), `# Delivery\n\nMode: ${snapshot.mode}\n\n- [Read the digest](digest.md)\n- [Original snapshot](sources/snapshot.json)\n- [Raw verification output](checks/verify.json)\n\nThe consistency check passed for ${snapshot.items.length} saved items. Article facts and live links remain outside this demo's verification scope.\n`);
  }
  const result = await inspectGraph(await loadGraph(at('graph.json')), root);
  process.stdout.write(`${json({ root, mode: snapshot.mode, status: result.status, ready: result.ready.map((node) => node.id), attention: result.attention })}`);
}

run().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
