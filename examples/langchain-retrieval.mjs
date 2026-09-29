// Small LangChain exercise: compose validation and retrieval without an LLM.
import { RunnableLambda } from '@langchain/core/runnables';
import { retrieve, validateQuestion } from '../src/engine.mjs';

export const retrievalChain = RunnableLambda.from(validateQuestion)
  .pipe(RunnableLambda.from((question) => retrieve(question, 2)))
  .pipe(RunnableLambda.from((hits) => hits.map(({ article, score }) => ({ id: article.id, title: article.title, score }))));

if (process.argv[1]?.endsWith('langchain-retrieval.mjs')) {
  const question = process.argv.slice(2).join(' ') || 'When will my parcel arrive?';
  console.log(JSON.stringify(await retrievalChain.invoke(question), null, 2));
}
