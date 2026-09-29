// Browser-only version of the deterministic sample. Keep parity with src/engine.mjs.
const articles = [
  { id:'shipping', title:'Shipping', keywords:['delivery','deliver','shipping','ship','arrival','dispatch','parcel'], answer:'Standard delivery takes 3–5 business days after dispatch. Tracking appears in the order confirmation email once the parcel ships.' },
  { id:'returns', title:'Returns', keywords:['return','send back','exchange','refund','item'], answer:'Items can be returned within 30 days of delivery if they are unused and in their original packaging. Start a return from your order page.' },
  { id:'warranty', title:'Warranty', keywords:['warranty','broken','defect','repair','faulty'], answer:'Products include a two-year limited warranty for manufacturing defects. Contact support with the order number and a description of the issue.' },
  { id:'address', title:'Changing a delivery address', keywords:['address','change address','wrong address','move','shipping address'], answer:'A delivery address can be changed only before the order is dispatched. Contact support with the order number so a person can check its status.' }
];
const stop = new Set(['a','an','and','are','can','do','for','how','i','is','it','my','of','on','the','to','what','when','where','will','you']);
const tokenize = (value) => [...new Set(value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])].filter((word) => word.length > 2 && !stop.has(word));
export function runBrowserDemo(input) {
  const question = input.trim();
  if (!question || question.length > 500) throw new RangeError('Enter a question under 500 characters.');
  const trace = ['validate','retrieve','decide'];
  const terms = tokenize(question);
  const hits = articles.map((article) => {
    const keywords = article.keywords.map((value) => value.toLowerCase());
    const keywordTokens = new Set(keywords.flatMap(tokenize));
    const titleTokens = new Set(tokenize(article.title));
    const score = terms.reduce((total, term) => total + (keywords.some((keyword) => keyword === term) ? 3 : 0) + (keywordTokens.has(term) ? 2 : 0) + (titleTokens.has(term) ? 1 : 0), 0);
    return { article, score };
  }).filter((hit) => hit.score > 0).sort((a,b) => b.score-a.score || a.article.id.localeCompare(b.article.id));
  if (/\b(chargeback|charged twice|payment|card number|cancel my order|complaint|legal|human|person|agent)\b/i.test(question)) return {route:'handoff',answer:'This needs a person to check the account or order. Please contact the support team; this demo does not create a ticket or access customer records.',citations:[],confidence:'not_applicable',trace:[...trace,'handoff']};
  if (!hits.length || hits[0].score < 2) return {route:'abstain',answer:"I couldn't find this in the sample help articles. Please contact the support team rather than relying on a guess.",citations:[],confidence:'low',trace:[...trace,'abstain']};
  const top = hits[0];
  return {route:'answer',answer:top.article.answer,citations:[{id:top.article.id,title:top.article.title,url:`/kb/${top.article.id}`}],confidence:top.score>=5?'high':'medium',trace:[...trace,'answer']};
}
