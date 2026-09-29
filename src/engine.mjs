import { articles } from './knowledge.mjs';

const stopWords = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'for', 'how', 'i', 'is', 'it', 'my', 'of', 'on', 'the', 'to', 'what', 'when', 'where', 'will', 'you']);
const escalationTerms = /\b(chargeback|charged twice|payment|card number|cancel my order|complaint|legal|human|person|agent)\b/i;

export function tokenize(text) {
  return [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter((word) => word.length > 2 && !stopWords.has(word));
}

export function validateQuestion(input) {
  if (typeof input !== 'string') throw new TypeError('Question must be text.');
  const question = input.trim();
  if (!question) throw new RangeError('Please enter a question.');
  if (question.length > 500) throw new RangeError('Please keep the question under 500 characters.');
  return question;
}

export function retrieve(question, limit = 2) {
  const terms = tokenize(question);
  return articles.map((article) => {
    const keywords = article.keywords.map((value) => value.toLowerCase());
    const keywordTokens = new Set(keywords.flatMap(tokenize));
    const titleTokens = new Set(tokenize(article.title));
    const score = terms.reduce((total, term) => total + (keywords.some((keyword) => keyword === term) ? 3 : 0) + (keywordTokens.has(term) ? 2 : 0) + (titleTokens.has(term) ? 1 : 0), 0);
    return { article, score };
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id)).slice(0, limit);
}

export function requiresHuman(question) {
  return escalationTerms.test(question);
}

export function resolve(question) {
  const validQuestion = validateQuestion(question);
  const hits = retrieve(validQuestion);
  if (requiresHuman(validQuestion)) {
    return { route: 'handoff', answer: 'This needs a person to check the account or order. Please contact the support team; this demo does not create a ticket or access customer records.', citations: [], confidence: 'not_applicable' };
  }
  if (!hits.length || hits[0].score < 2) {
    return { route: 'abstain', answer: "I couldn't find this in the sample help articles. Please contact the support team rather than relying on a guess.", citations: [], confidence: 'low' };
  }
  const top = hits[0];
  return { route: 'answer', answer: top.article.answer, citations: [{ id: top.article.id, title: top.article.title, url: top.article.url }], confidence: top.score >= 5 ? 'high' : 'medium' };
}
