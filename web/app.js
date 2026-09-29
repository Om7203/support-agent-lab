import { runBrowserDemo } from './demo-core.mjs';

const form = document.querySelector('#question-form');
const input = document.querySelector('#question');
const output = document.querySelector('#result');
const traceList = document.querySelector('#trace-list');
const isStatic = location.port !== '3000';
document.querySelector('#runtime-label').textContent = isStatic ? 'BROWSER DEMO · NO MODEL CALL' : 'LOCAL LANGGRAPH SERVER';
document.querySelector('#trace-runtime').textContent = isStatic ? 'BROWSER RULES' : 'LANGGRAPH';
if (!isStatic) document.querySelector('.trace-note').textContent = 'This local page calls the LangGraph server. The public portfolio demo runs the same deterministic decision rules in your browser; neither version calls a live language model.';

function render(result) {
  output.replaceChildren();
  const route = document.createElement('span'); route.className = `route ${result.route}`; route.textContent = result.route.toUpperCase();
  const answer = document.createElement('p'); answer.className = 'answer'; answer.textContent = result.answer;
  output.append(route, answer);
  if (result.citations.length) {
    const citation = document.createElement('p'); citation.className = 'citation';
    citation.textContent = `SOURCE · ${result.citations.map((source) => source.title).join(', ')} (sample help article)`;
    output.append(citation);
  }
  traceList.querySelectorAll('li').forEach((item, index) => { item.classList.toggle('active', index < result.trace.length); });
  traceList.lastElementChild.querySelector('span').textContent = result.trace.at(-1) === 'answer' ? 'Answer with citation' : result.trace.at(-1) === 'handoff' ? 'Human handoff' : 'Abstain';
}

async function run(question) {
  output.textContent = 'Running the workflow…';
  try {
    let result;
    if (isStatic) result = runBrowserDemo(question);
    else {
      const response = await fetch('/api/chat', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question})});
      result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Request failed.');
    }
    render(result);
  } catch (error) { output.textContent = error.message; }
}

form.addEventListener('submit', (event) => { event.preventDefault(); run(input.value); });
document.querySelectorAll('[data-question]').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.question; run(input.value); }));
