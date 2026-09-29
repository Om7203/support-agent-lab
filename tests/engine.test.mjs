import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from '../src/engine.mjs';
import { runAgent } from '../src/graph.mjs';
import { createApp } from '../server.mjs';
import { runBrowserDemo } from '../web/demo-core.mjs';
import { retrievalChain } from '../examples/langchain-retrieval.mjs';

test('answers a policy question with a citation', async () => {
  const result = await runAgent('When will my parcel arrive after shipping?');
  assert.equal(result.route, 'answer');
  assert.equal(result.citations[0].id, 'shipping');
  assert.deepEqual(result.trace, ['validate', 'retrieve', 'decide', 'answer']);
});

test('hands sensitive account actions to a person', async () => {
  const result = await runAgent('I was charged twice. Can you refund me?');
  assert.equal(result.route, 'handoff');
  assert.deepEqual(result.citations, []);
  assert.equal(result.trace.at(-1), 'handoff');
});

test('abstains when the knowledge base has no answer', async () => {
  const result = await runAgent('Do you sell bicycles in Munich?');
  assert.equal(result.route, 'abstain');
  assert.deepEqual(result.citations, []);
});

test('rejects empty and oversized input', () => {
  assert.throws(() => validateQuestion('   '), /enter a question/i);
  assert.throws(() => validateQuestion('x'.repeat(501)), /500 characters/i);
});

test('HTTP API returns a structured response and validates malformed JSON', async (context) => {
  const server = createApp();
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  context.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: 'What is the warranty?' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).citations[0].id, 'warranty');
  const invalid = await fetch(`${base}/api/chat`, { method: 'POST', body: '{bad' });
  assert.equal(invalid.status, 400);
  assert.equal((await fetch(`${base}/health`)).status, 200);
});

test('browser fallback and graph agree on representative answers and routes', async () => {
  const questions = ['How long does delivery take?', 'I want a human agent', 'Do you sell bicycles?'];
  for (const question of questions) {
    const graphResult = await runAgent(question);
    const browserResult = runBrowserDemo(question);
    assert.equal(graphResult.route, browserResult.route);
    assert.equal(graphResult.answer, browserResult.answer);
  }
});

test('LangChain retrieval exercise returns the matching document', async () => {
  const hits = await retrievalChain.invoke('How long does delivery take?');
  assert.equal(hits[0].id, 'shipping');
});
