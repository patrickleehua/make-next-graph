import { lstat, open, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values).size === values.length;
const maxCheckBytes = 4 * 1024 * 1024;

function onlyKeys(value, allowed, label) {
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length) throw new Error(`${label}: unsupported fields: ${extra.join(', ')}`);
}

// Portable, explicit paths keep observation bounded to the selected workspace.
export function artifactPath(value) {
  if (!nonempty(value) || /[\x00-\x1f:*?"<>|]/u.test(value)) throw new Error(`Invalid relative path: ${value}`);
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || /[. ]$/u.test(part)
    || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part))) {
    throw new Error(`Path must be portable and stay inside the workspace: ${value}`);
  }
  return normalized;
}

function stringList(value, label, { required = false, paths = false } = {}) {
  if (!Array.isArray(value) || (required && !value.length) || !value.every(nonempty) || !unique(value)) {
    throw new Error(`${label}: expected ${required ? 'a nonempty' : 'an'} array of unique strings`);
  }
  if (paths) value.forEach(artifactPath);
}

export function validateGraph(input) {
  if (!object(input)) throw new Error('Graph must be an object');
  onlyKeys(input, ['version', 'name', 'description', 'changeReason', 'goals', 'nodes'], 'Graph');
  if (input.version !== 1 || !nonempty(input.name)) throw new Error('Graph needs version: 1 and a name');
  for (const key of ['description', 'changeReason']) {
    if (input[key] !== undefined && !nonempty(input[key])) throw new Error(`${key} must be nonempty text`);
  }
  stringList(input.goals, 'goals', { required: true });
  if (!Array.isArray(input.nodes) || !input.nodes.length || input.nodes.length > 1000) {
    throw new Error('Graph needs 1..1000 nodes');
  }
  const byId = new Map();
  const producers = new Map();
  for (const node of input.nodes) {
    if (!object(node)) throw new Error('Node must be an object');
    onlyKeys(node, ['id', 'title', 'kind', 'files', 'requires', 'acceptance', 'recipe', 'check'], 'Node');
    if (!nonempty(node.id) || !/^[a-zA-Z][a-zA-Z0-9._-]*$/u.test(node.id) || byId.has(node.id)) {
      throw new Error(`Invalid or duplicate node id: ${node.id}`);
    }
    if (!nonempty(node.title) || !['input', 'artifact', 'check'].includes(node.kind)) {
      throw new Error(`${node.id}: title and kind (input/artifact/check) are required`);
    }
    stringList(node.files, `${node.id}.files`, { required: true, paths: true });
    if (new Set(node.files.map((file) => artifactPath(file).toLowerCase())).size !== node.files.length) {
      throw new Error(`${node.id}: duplicate portable paths`);
    }
    stringList(node.requires ?? [], `${node.id}.requires`);
    if (!nonempty(node.acceptance)) throw new Error(`${node.id}: describe acceptance in plain text`);
    if (node.kind === 'input' && node.recipe !== undefined) throw new Error(`${node.id}: an input has no producer`);
    if (node.kind !== 'input') {
      if (!object(node.recipe) || !nonempty(node.recipe.instructions)) throw new Error(`${node.id}: recipe.instructions required`);
      onlyKeys(node.recipe, ['instructions', 'role', 'command', 'writes'], `${node.id}.recipe`);
      for (const key of ['role', 'command']) {
        if (node.recipe[key] !== undefined && !nonempty(node.recipe[key])) throw new Error(`${node.id}: ${key} must be text`);
      }
      if (node.recipe.writes !== undefined) stringList(node.recipe.writes, `${node.id}.recipe.writes`, { required: true, paths: true });
      for (const file of node.files) {
        const key = artifactPath(file).toLowerCase();
        if (producers.has(key)) throw new Error(`Two producers for ${file}: ${producers.get(key)}, ${node.id}`);
        producers.set(key, node.id);
      }
    }
    if (node.kind === 'check') {
      if (!object(node.check)) throw new Error(`${node.id}: check definition required`);
      onlyKeys(node.check, ['path', 'expectExitCode'], `${node.id}.check`);
      artifactPath(node.check.path);
      if (!node.files.map(artifactPath).includes(artifactPath(node.check.path))) throw new Error(`${node.id}: check.path must be in files`);
      if (node.check.expectExitCode !== undefined && (!Number.isInteger(node.check.expectExitCode) || node.check.expectExitCode < 0 || node.check.expectExitCode > 255)) {
        throw new Error(`${node.id}: expected exit code must be an integer in 0..255`);
      }
    } else if (node.check !== undefined) throw new Error(`${node.id}: only check nodes have check definitions`);
    byId.set(node.id, { ...node, requires: node.requires ?? [] });
  }
  for (const node of byId.values()) {
    for (const dep of node.requires) if (!byId.has(dep)) throw new Error(`${node.id}: unknown prerequisite ${dep}`);
  }
  for (const goal of input.goals) if (!byId.has(goal)) throw new Error(`Unknown goal: ${goal}`);
  const visiting = new Set();
  const visited = new Set();
  const order = [];
  function visit(id, trail = []) {
    if (visiting.has(id)) throw new Error(`Dependency cycle: ${[...trail, id].join(' -> ')}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).requires) visit(dep, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }
  for (const id of byId.keys()) visit(id);
  return { ...input, nodes: [...byId.values()], order };
}

function contained(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Resolve includes as data; never import or run code from a graph.
export async function loadGraph(filename) {
  const entry = path.resolve(filename);
  const includeRoot = await realpath(path.dirname(entry));
  const active = new Set();
  const seen = new Set();
  let documentCount = 0;
  async function load(file, top = false) {
    const canonical = await realpath(file);
    if (!contained(includeRoot, canonical)) throw new Error('Graph include escapes its directory');
    if (active.has(canonical)) throw new Error(`Include cycle: ${path.basename(canonical)}`);
    if (seen.has(canonical)) return [];
    if (++documentCount > 64) throw new Error('At most 64 graph documents may be included');
    active.add(canonical);
    const doc = JSON.parse(await readFile(canonical, 'utf8'));
    if (!object(doc)) throw new Error('Graph document must be an object');
    onlyKeys(doc, top ? ['version', 'name', 'description', 'changeReason', 'goals', 'includes', 'nodes']
      : ['version', 'description', 'includes', 'nodes'], 'Graph document');
    if (doc.version !== 1 || !Array.isArray(doc.nodes)) throw new Error('Each graph document needs version: 1 and nodes');
    const nodes = [];
    if (doc.includes !== undefined) {
      stringList(doc.includes, 'includes', { paths: true });
      for (const include of doc.includes) {
        if (!include.endsWith('.json')) throw new Error('Includes must be JSON documents');
        nodes.push(...await load(path.resolve(path.dirname(canonical), artifactPath(include))));
      }
    }
    nodes.push(...doc.nodes);
    active.delete(canonical);
    seen.add(canonical);
    if (top) {
      const { includes, ...rest } = doc;
      return { ...rest, nodes };
    }
    return nodes;
  }
  return validateGraph(await load(entry, true));
}

async function safeFile(root, relative) {
  const portable = artifactPath(relative);
  const full = path.resolve(root, portable);
  // Check existing parents too: a missing leaf inside an outside symlink is unknown.
  let ancestor = full;
  for (;;) {
    try {
      // lstat preserves a dangling link as an existing entry instead of walking
      // past it and treating an outside destination as an ordinary missing file.
      await lstat(ancestor);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      ancestor = parent;
      continue;
    }
    let canonical;
    try { canonical = await realpath(ancestor); }
    catch (error) { throw new Error(`Cannot resolve existing artifact path: ${error.code ?? error.message}`); }
    if (!contained(root, canonical)) throw new Error('Resolved path escapes workspace');
    break;
  }
  return full;
}

export async function observeFile(root, relative) {
  try {
    const full = await safeFile(root, relative);
    const info = await stat(full);
    if (!info.isFile()) return { path: relative, fact: 'unknown', reason: 'Expected a regular file' };
    if (!info.size) return { path: relative, fact: 'unknown', reason: 'Empty or incomplete artifact' };
    const handle = await open(full, 'r');
    try { await handle.read(Buffer.alloc(1), 0, 1, 0); } finally { await handle.close(); }
    return { path: relative, fact: 'present', mtimeMs: info.mtimeMs, bytes: info.size };
  } catch (error) {
    return { path: relative, fact: error.code === 'ENOENT' ? 'missing' : 'unknown', reason: error.code ?? error.message };
  }
}

async function observeNode(root, node, observe) {
  const files = await Promise.all(node.files.map((file) => observe(root, file)));
  const fact = files.some((file) => file.fact === 'unknown') ? 'unknown'
    : files.some((file) => file.fact === 'missing') ? 'missing' : 'present';
  const result = { id: node.id, title: node.title, kind: node.kind, fact, files };
  if (fact === 'unknown') result.reason = files.filter((file) => file.fact === 'unknown')
    .map((file) => `${file.path}: ${file.reason ?? 'Cannot observe file'}`).join('; ');
  if (fact !== 'present' || node.kind !== 'check') return result;
  try {
    const file = files.find((item) => artifactPath(item.path) === artifactPath(node.check.path));
    if (file.bytes > maxCheckBytes) throw new Error('Check output exceeds 4 MiB; keep full logs separately');
    const record = JSON.parse(await readFile(await safeFile(root, node.check.path), 'utf8'));
    if (!object(record) || !Object.hasOwn(record, 'exitCode') || !(record.exitCode === null || Number.isInteger(record.exitCode))
      || typeof record.stdout !== 'string' || typeof record.stderr !== 'string') {
      throw new Error('Check output needs exitCode (integer or null), stdout and stderr');
    }
    result.exitCode = record.exitCode;
    if (record.exitCode === null) {
      result.fact = 'unverified';
      result.reason = typeof record.reason === 'string' ? record.reason : 'No process exit code was observed';
    } else if (record.exitCode !== (node.check.expectExitCode ?? 0)) {
      result.fact = 'failed';
      result.reason = `exitCode ${record.exitCode}; expected ${node.check.expectExitCode ?? 0}`;
    }
  } catch (error) {
    result.fact = 'unknown';
    result.reason = `Unreadable check evidence: ${error.message}`;
  }
  return result;
}

export async function inspectGraph(graph, workspace, { goals = graph.goals, observe = observeFile } = {}) {
  // Also validate direct library calls; order is derived and never stored in graph.json.
  const { order: previousOrder, ...definition } = graph;
  graph = validateGraph(definition);
  stringList(goals, 'selected goals', { required: true });
  const root = await realpath(workspace);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const selected = new Set();
  function select(id) {
    if (!byId.has(id)) throw new Error(`Unknown selected goal: ${id}`);
    if (selected.has(id)) return;
    selected.add(id);
    byId.get(id).requires.forEach(select);
  }
  goals.forEach(select);
  const observed = await Promise.all(graph.nodes.filter((node) => selected.has(node.id))
    .map((node) => observeNode(root, node, observe)));
  const facts = new Map(observed.map((node) => [node.id, node]));
  const ready = [];
  const attention = [];
  const waiting = [];
  for (const id of graph.order.filter((nodeId) => selected.has(nodeId))) {
    const node = byId.get(id);
    const fact = facts.get(id);
    fact.blockedBy = node.requires.filter((dep) => !facts.get(dep).usable);
    fact.usable = fact.fact === 'present' && !fact.blockedBy.length;
    const ownTimes = fact.files.filter((file) => file.fact === 'present').map((file) => file.mtimeMs);
    const oldest = ownTimes.length ? Math.min(...ownTimes) : null;
    fact.possiblyAffectedBy = [];
    if (fact.fact === 'present' && oldest !== null) {
      for (const dep of node.requires) {
        const upstream = facts.get(dep);
        if (upstream.possiblyAffectedBy.length || upstream.files.some((file) => file.fact === 'present' && file.mtimeMs > oldest)) {
          fact.possiblyAffectedBy.push(dep);
        }
      }
    }
    if (fact.possiblyAffectedBy.length) attention.push({ id, action: 'assess-impact', upstream: fact.possiblyAffectedBy });
    if (['unknown', 'unverified'].includes(fact.fact)) attention.push({ id, action: 'inspect-evidence', reason: fact.reason ?? 'Some files cannot be observed' });
    if (node.kind === 'input' && fact.fact === 'missing') waiting.push({ id, reason: 'External input is missing', files: node.files });
    else if (['missing', 'failed'].includes(fact.fact) && !fact.blockedBy.length) {
      ready.push({ id, action: fact.fact === 'failed' ? 'investigate-failure' : 'produce', files: node.files,
        recipe: node.recipe, acceptance: node.acceptance, possiblyAffectedBy: fact.possiblyAffectedBy });
    } else if (fact.blockedBy.length) waiting.push({ id, blockedBy: fact.blockedBy });
  }
  const relevantFacts = [...facts.values()];
  const unknown = relevantFacts.some((fact) => ['unknown', 'unverified'].includes(fact.fact));
  const evidenceReady = goals.every((id) => facts.get(id).usable);
  return {
    name: graph.name, goals,
    status: unknown ? 'needs-attention' : evidenceReady ? 'evidence-ready' : 'needs-work',
    evidenceReady, semanticAcceptance: 'not-evaluated',
    ready, attention, waiting,
    nodes: graph.order.filter((id) => selected.has(id)).map((id) => facts.get(id)),
    parallelCandidates: ready.map((node) => node.id),
    parallelNote: 'Dependency-independent suggestions only. The host coordinates ownership and overlapping writes.',
  };
}

export function toMermaid(graph) {
  const indices = new Map(graph.nodes.map((node, i) => [node.id, `n${i}`]));
  const label = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', ' ');
  return ['flowchart TD', ...graph.nodes.flatMap((node) => [
    `  ${indices.get(node.id)}["${label(node.id)}: ${label(node.title)}"]`,
    ...node.requires.map((dep) => `  ${indices.get(dep)} --> ${indices.get(node.id)}`),
  ])].join('\n') + '\n';
}
