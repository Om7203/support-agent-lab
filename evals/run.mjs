import { readFile } from 'node:fs/promises';
import { runAgent } from '../src/graph.mjs';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
let passed = 0;
const results = [];
for (const item of cases) {
  const result = await runAgent(item.question);
  const ok = result.route === item.expectedRoute && (!item.expectedCitation || result.citations.some((citation) => citation.id === item.expectedCitation));
  if (ok) passed++;
  results.push({ question: item.question, expected: item.expectedRoute, actual: result.route, passed: ok });
}
console.log(JSON.stringify({ passed, total: cases.length, results }, null, 2));
if (passed !== cases.length) process.exitCode = 1;
