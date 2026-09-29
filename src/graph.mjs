import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { requiresHuman, resolve, retrieve, validateQuestion } from './engine.mjs';

const AgentState = Annotation.Root({
  question: Annotation(),
  hits: Annotation(),
  route: Annotation(),
  result: Annotation(),
  trace: Annotation()
});

const graph = new StateGraph(AgentState)
  .addNode('validate', (state) => ({ question: validateQuestion(state.question), trace: ['validate'] }))
  .addNode('retrieve', (state) => ({ hits: retrieve(state.question), trace: [...state.trace, 'retrieve'] }))
  .addNode('decide', (state) => ({
    route: requiresHuman(state.question) ? 'handoff' : state.hits.length && state.hits[0].score >= 2 ? 'answer' : 'abstain',
    trace: [...state.trace, 'decide']
  }))
  .addNode('answer', (state) => ({ result: resolve(state.question), trace: [...state.trace, 'answer'] }))
  .addNode('handoff', (state) => ({ result: resolve(state.question), trace: [...state.trace, 'handoff'] }))
  .addNode('abstain', (state) => ({ result: resolve(state.question), trace: [...state.trace, 'abstain'] }))
  .addEdge(START, 'validate')
  .addEdge('validate', 'retrieve')
  .addEdge('retrieve', 'decide')
  .addConditionalEdges('decide', (state) => state.route, ['answer', 'handoff', 'abstain'])
  .addEdge('answer', END)
  .addEdge('handoff', END)
  .addEdge('abstain', END)
  .compile();

export async function runAgent(question) {
  const state = await graph.invoke({ question });
  return { ...state.result, trace: state.trace };
}
