// Part 3's textbooks (docs/textbook-plan.md, D113, D114): twenty-two books,
// 301 chapters, read in eight works. A work ends when what it hands in passes
// three tests on a case the books do not contain; nothing here says how long a
// work takes. The chapters each work reads are the plan's table 4.1, and the
// books are its table 4.3; tools/check_works.py checks the order in the plan.

const R = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// waits: the works it waits for. col, row: its place in Figure 3.12's grid
// (row 0 is both rows). adds: the cells of the wheel it sets moving.
export const WORKS = [
  { no: 1, name: 'Read', hands: 'unit cards and conditional paragraphs', waits: [], col: 1, row: 0,
    adds: ['Goods', 'Taxes', 'Households', 'Firms', 'Labor', 'Capital', 'Money', 'Governments', 'Central banks', 'Policy rules', 'Other countries', 'Foreign exchange', 'Land and air'] },
  { no: 2, name: 'Solve', hands: 'a one-page derivation', waits: [1], col: 2, row: 0, adds: ['Optimization', 'Strategy', 'Contracts'] },
  { no: 3, name: 'Prove', hands: 'a one-page proof, and where it fails', waits: [2], col: 3, row: 1, adds: ['Equilibrium'] },
  { no: 4, name: 'Build the economy', hands: 'a reversal review', waits: [3], col: 4, row: 1, adds: ['Banks'] },
  { no: 5, name: 'Measure', hands: 'a refutation plan, and its estimate', waits: [2], col: 3, row: 2, adds: ['Measurement'] },
  { no: 6, name: 'Compute', hands: 'a computation report', waits: [3, 4, 5], col: 5, row: 1, adds: ['Computation', 'Networks'] },
  { no: 7, name: 'Review and answer', hands: 'a referee report and a policy memo, in three fields or more', waits: [4, 5], col: '5 / span 2', row: 2, adds: ['Property', 'Regulation', 'History'] },
  { no: 8, name: 'Question and write', hands: 'a first paper', waits: [6, 7], col: 6, row: 1, adds: [] },
];

// read: work → the chapters read in it. course: the course page of the
// course taught now, where there is one. takes: the method at the hub it
// teaches, or the one thing it changes in the core.
export const BOOKS = [
  { no: 1, id: 'reasoning', side: 'core', name: 'Economic reasoning: models, conditions, evidence', short: 'Reasoning', course: null,
    question: 'What logical form does an economic claim have, and when can it be called wrong?',
    takes: 'method: the conditional, holding fixed, refutation, causes, writing', read: { 1: R(1, 12) } },
  { no: 2, id: 'principles', side: 'core', name: 'Principles of economics', short: 'Principles', course: 'principles',
    question: 'From one market to the whole economy, what does economics hold fixed, and what does it solve?',
    takes: 'the start: the core in seed form', read: { 1: R(1, 17) } },
  { no: 3, id: 'math1', side: 'core', name: 'Mathematics for economists I: optimization and comparative statics', short: 'Math I', course: 'math',
    question: 'How is a chooser’s problem solved, and how does the answer move when a held value moves?',
    takes: 'Optimization', read: { 2: R(1, 14) } },
  { no: 4, id: 'math2', side: 'core', name: 'Mathematics for economists II: analysis and topology', short: 'Math II', course: null,
    question: 'When does an equilibrium exist, and when is it unique, continuous and stable?',
    takes: 'Equilibrium: existence, and the grounds of comparative statics', read: { 3: R(1, 16) } },
  { no: 5, id: 'probability', side: 'core', name: 'Probability and statistics', short: 'Prob. & stats', course: null,
    question: 'How are an uncertain world and its data put into numbers?',
    takes: 'the grounds of Measurement', read: { 2: R(1, 6), 5: R(7, 16) } },
  { no: 6, id: 'micro', side: 'core', name: 'Intermediate microeconomics', short: 'Micro', course: 'micro',
    question: 'When households and firms choose, where does the market settle, and does it get there?',
    takes: 'opens households and firms, then all markets at once', read: { 2: [...R(1, 10), 13, 14], 3: [11, 12, 15, 16] } },
  { no: 7, id: 'games', side: 'core', name: 'Game theory', short: 'Games', course: 'games',
    question: 'What does one choose when another’s choice changes one’s own result?',
    takes: 'Strategy; relaxes price-taking (A3)', read: { 2: R(1, 11), 3: R(12, 15) } },
  { no: 8, id: 'macro', side: 'core', name: 'Intermediate macroeconomics', short: 'Macro', course: 'macro',
    question: 'What sets the output, prices and employment of a whole open economy?',
    takes: 'adds time, money, the state, other countries, and the money banks create', read: { 4: R(1, 18) } },
  { no: 9, id: 'metrics', side: 'core', name: 'Econometrics', short: 'Metrics', course: 'metrics',
    question: 'How are relations read from data?',
    takes: 'Measurement; relaxes that data show relationships (A8)', read: { 5: R(1, 15) } },
  { no: 10, id: 'computation', side: 'core', name: 'Computational economics', short: 'Computing', course: null,
    question: 'How is a model solved that cannot be solved on the page?',
    takes: 'Computation: unlike and connected agents, solved by simulation', read: { 6: R(1, 13) } },
  { no: 11, id: 'trade', side: 'field', name: 'International trade', short: 'Trade', course: 'trade',
    question: 'Who gains from trade between countries, and who loses inside each of them?',
    takes: 'adds a second country’s goods and factors', read: { 7: R(1, 11) } },
  { no: 12, id: 'intlfin', side: 'field', name: 'International finance', short: 'Intl finance', course: 'intlfin',
    question: 'What sets exchange rates, current accounts and the room for national policy?',
    takes: 'the exchange rate as an asset price, crises, and the network of capital flows', read: { 7: R(1, 12) } },
  { no: 13, id: 'banking', side: 'field', name: 'Money and banking', short: 'Money & banking', course: 'banking',
    question: 'When do banks fail, how does a crisis spread, and what stops it?',
    takes: 'adds the risks of balance sheets, and their regulation', read: { 7: R(1, 12) } },
  { no: 14, id: 'public', side: 'field', name: 'Public economics', short: 'Public', course: 'public',
    question: 'When should the state tax, spend or insure, and how much does it cost?',
    takes: 'adds the state as one who chooses', read: { 7: R(1, 14) } },
  { no: 15, id: 'labor', side: 'field', name: 'Labor economics', short: 'Labor', course: 'labor',
    question: 'How are wages and employment set, and why do they differ so much between people?',
    takes: 'adds people as what is traded, and the friction of matching', read: { 7: R(1, 13) } },
  { no: 16, id: 'io', side: 'field', name: 'Industrial organization', short: 'IO', course: 'io',
    question: 'How do firms compete when markets are not perfectly competitive?',
    takes: 'adds strategy between firms', read: { 7: R(1, 13) } },
  { no: 17, id: 'development', side: 'field', name: 'Development economics', short: 'Development', course: 'development',
    question: 'Why do some countries stay poor, and what helps the poor in them?',
    takes: 'relaxes complete markets (A5)', read: { 7: R(1, 13) } },
  { no: 18, id: 'environmental', side: 'field', name: 'Environmental economics', short: 'Environment', course: 'environmental',
    question: 'How should a society price damage to the environment, including damage far in the future?',
    takes: 'adds a very long horizon', read: { 7: R(1, 13) } },
  { no: 19, id: 'finance', side: 'field', name: 'Financial economics', short: 'Finance', course: 'finance',
    question: 'What is a risky future payment worth today?',
    takes: 'adds the price of risk', read: { 7: R(1, 12) } },
  { no: 20, id: 'behavioral', side: 'field', name: 'Behavioral economics', short: 'Behavioral', course: 'behavioral',
    question: 'What changes when people are not the agents of the core courses?',
    takes: 'relaxes consistent choice (A6)', read: { 7: R(1, 12) } },
  { no: 21, id: 'history', side: 'field', name: 'Economic history', short: 'Econ history', course: 'history',
    question: 'How did the world economy become what it is?',
    takes: 'History: time outside the model', read: { 7: R(1, 12) } },
  { no: 22, id: 'method', side: 'last', name: 'Methods and philosophy of economics', short: 'Philosophy', course: null,
    question: 'What has economics known, how did it come to know it, and where was it wrong?',
    takes: 'method, read a second time, and the first paper', read: { 8: R(1, 12) } },
];

export const chaptersOf = (b) => Object.values(b.read).flat().sort((x, y) => x - y);

// "1–10, 13, 14": a list of chapters as runs (in Korean, "1~10, 13, 14")
export function runs(chs, dash = '–') {
  const out = [];
  for (const c of chs) {
    const last = out.at(-1);
    if (last && c === last[1] + 1) last[1] = c;
    else out.push([c, c]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : b === a + 1 ? `${a}, ${b}` : `${a}${dash}${b}`)).join(', ');
}
