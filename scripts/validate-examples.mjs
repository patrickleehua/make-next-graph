import { fileURLToPath } from 'node:url';
import { loadGraph } from '../skills/make-next-graph/scripts/graph.mjs';

for (const file of ['skills/make-next-graph/assets/templates/research.json', 'skills/make-next-graph/assets/templates/software.json',
  'skills/make-next-graph/assets/templates/content.json', 'examples/web-digest/graph.json']) {
  const graph = await loadGraph(fileURLToPath(new URL(`../${file}`, import.meta.url)));
  process.stdout.write(`Valid: ${file} (${graph.nodes.length} nodes)\n`);
}
