#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { artifactPath, inspectGraph, loadGraph, toMermaid, validateGraph } from './graph.mjs';

const help = `make-next-graph (Node.js >=22, no dependencies)
  node make.mjs init --template research|software|content --out <graph.json>
    [--spec <native-spec-file> ...]  software template only; paths relative to the workspace
  node make.mjs validate <graph.json>
  node make.mjs next <graph.json> [--root <workspace>] [--goal <id>] [--json]
  node make.mjs mermaid <graph.json>

next is read-only. It never executes a recipe or writes node status.
Exit codes: 0 = inspected successfully (even when work remains); 2 = invalid input or IO error.
Artifact paths resolve from --root (default: the directory containing graph.json).
`;

function parse(argv) {
  const [command, ...args] = argv;
  const options = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--spec') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for --spec');
      (options.spec ??= []).push(args[++i]);
      continue;
    }
    if (['--root', '--goal', '--template', '--out'].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (Object.hasOwn(options, arg.slice(2))) throw new Error(`Duplicate option: ${arg}`);
      options[arg.slice(2)] = args[++i];
    } else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  return { command, options, positional };
}

export async function main(argv) {
  if (!argv.length || ['--help', '-h', 'help'].includes(argv[0])) { process.stdout.write(help); return; }
  const { command, options, positional } = parse(argv);
  if (command === 'init') {
    if (!['research', 'software', 'content'].includes(options.template) || !options.out || positional.length) {
      throw new Error('init requires --template research|software|content and --out <graph.json>');
    }
    if (Object.keys(options).some((key) => !['template', 'out', 'spec'].includes(key))) throw new Error('Unsupported init option');
    if (options.spec && options.template !== 'software') throw new Error('--spec binds the software template to native specification files');
    const source = fileURLToPath(new URL(`../assets/templates/${options.template}.json`, import.meta.url));
    const { order, ...graph } = await loadGraph(source);
    if (options.spec) {
      const spec = graph.nodes.find((node) => node.id === 'software.spec');
      spec.files = options.spec.map(artifactPath);
      spec.recipe.writes = [...spec.files];
      spec.recipe.instructions = 'Use the selected specification method in its native workspace; read and update these original files without creating a parallel specification.';
      validateGraph(graph);
    }
    const target = path.resolve(options.out);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(graph, null, 2)}\n`, { flag: 'wx' });
    process.stdout.write(`Created ${target}\n`);
    return;
  }
  if (!['validate', 'next', 'mermaid'].includes(command) || positional.length !== 1) throw new Error(help);
  if (command !== 'next' && Object.keys(options).length) throw new Error(`${command} does not accept options`);
  if (command === 'next' && Object.keys(options).some((key) => !['root', 'goal', 'json'].includes(key))) throw new Error('Unsupported next option');
  const filename = path.resolve(positional[0]);
  const graph = await loadGraph(filename);
  if (command === 'validate') { process.stdout.write(`Valid: ${graph.name}; ${graph.nodes.length} nodes\n`); return; }
  if (command === 'mermaid') { process.stdout.write(toMermaid(graph)); return; }
  const result = await inspectGraph(graph, path.resolve(options.root ?? path.dirname(filename)),
    options.goal ? { goals: [options.goal] } : {});
  if (options.json) { process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); return; }
  const lines = [`${result.name}: ${result.status}`, 'Semantic acceptance: for the agent/person to assess.'];
  for (const node of result.ready) lines.push(`NEXT ${node.id}: ${node.action} — ${node.recipe.instructions}`);
  for (const item of result.attention) lines.push(`ATTENTION ${item.id}: ${item.action}${item.upstream ? ` (${item.upstream.join(', ')})` : ''}${item.reason ? ` — ${item.reason}` : ''}`);
  for (const item of result.waiting) lines.push(`WAIT ${item.id}: ${item.reason ?? item.blockedBy.join(', ')}`);
  if (result.evidenceReady) lines.push('Referenced artifacts/checks are available. Read them against the goal before declaring completion.');
  process.stdout.write(`${lines.join('\n')}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
}
