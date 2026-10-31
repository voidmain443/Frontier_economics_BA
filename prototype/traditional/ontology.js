// The archive's ontology (docs/part3-ontology.md). What a textbook teaches is
// a model, and a model is a state of the wheel (wheel.js): some cells move
// (what the model solves), some are held still at a given value (what it holds
// fixed: a figure's hidden axis), and the rest are left out. Models are joined
// by five relations, and rest on eight classical assumptions.

export const RELATIONS = [
  { id: 'open', name: 'Opens', says: 'a part held still starts to move' },
  { id: 'add', name: 'Adds', says: 'a part left out is built' },
  { id: 'relax', name: 'Relaxes', says: 'the same parts, under a different assumption' },
  { id: 'measure', name: 'Measures', says: 'data ask what the moving parts produce' },
  { id: 'return', name: 'Returns', says: 'the same structure, in another cell' },
];

// Where each assumption is made and where it is relaxed: Part 1 stages (1–8)
// and Part 2 sections, by figure. touched: relaxed in passing, as a
// consequence of another.
export const ASSUMPTIONS = [
  { id: 'A1', name: 'A representative agent', says: 'one agent stands for all of its kind; only the total matters', made: { 3: '3.2', 6: '6.2' }, relaxed: {}, touched: { 8: '8.10' }, p2: ['2.3', '2.4', '2.5'] },
  { id: 'A2', name: 'No connections', says: 'anyone can trade with anyone', made: { 1: '1.1' }, relaxed: {}, p2: ['2.6', '2.7', '2.8', '2.9'] },
  { id: 'A3', name: 'Price-taking', says: 'nobody can move the price', made: { 1: '1.1', 3: '3.2' }, relaxed: { 4: '4.1', 8: '8.7' } },
  { id: 'A4', name: 'Full information', says: 'everyone knows the same things', made: { 1: '1.1' }, relaxed: { 5: '5.3', 8: '8.3' } },
  { id: 'A5', name: 'Complete markets', says: 'everything has a market', made: { 5: '5.1' }, relaxed: { 5: '5.2', 8: '8.6' } },
  { id: 'A6', name: 'Consistent choice', says: 'a plan made today is kept tomorrow', made: { 2: '2.1' }, relaxed: { 8: '8.9' }, p2: ['2.5'] },
  { id: 'A7', name: 'Equilibrium at once', says: 'markets clear without delay', made: { 5: '5.1' }, relaxed: { 6: '6.3' }, p2: ['2.10'] },
  { id: 'A8', name: 'Data show relationships', says: 'a pattern in the data is the relationship', made: { 7: '7.1' }, relaxed: { 7: '7.2' } },
];

// Every model of Parts 1 and 2: the cells it moves; what it holds, at the
// cell where the held quantity lives (null: it lives in no one cell; ''
// marks a cell held without a value to show); its relation to what comes
// before; the method at the hub it is solved with.
const M = (id, title, moving, held, rel, what, method) => ({ id, title, moving, held, rel, what, method });
export const MODELS = [
  M('1.1', 'Supply and demand', ['Goods'], [['Labor', 'income I = 1'], ['Households', ''], ['Firms', '']], 'start', 'the seed of the core', 'Equilibrium'),
  M('1.2', 'A tax and the trades it stops', ['Goods', 'Taxes'], [['Households', 'who the buyers are'], ['Firms', '']], 'add', 'a tax', 'Equilibrium'),
  M('1.3', 'Elasticity grows with time', ['Goods'], [[null, 'the time buyers have had to adjust'], ['Households', ''], ['Firms', '']], 'open', 'the time to adjust', 'Equilibrium'),
  M('2.1', 'The best affordable bundle', ['Households'], [['Goods', 'prices'], ['Labor', 'income I']], 'open', 'demand, into a household that chooses', 'Optimization'),
  M('2.2', 'Demand is a list of choices', ['Households'], [['Goods', 'the price of x'], ['Labor', 'income I']], 'open', 'the price, to trace out demand', 'Optimization'),
  M('2.3', 'Choice over time', ['Households'], [['Capital', 'interest rate r']], 'add', 'a second period', 'Optimization'),
  M('3.1', 'Plants of every size', ['Firms'], [['Capital', 'plant size K'], ['Labor', 'wage w']], 'open', 'supply, into a firm that chooses', 'Optimization'),
  M('3.2', 'Entry', ['Firms', 'Goods'], [[null, 'the number of firms N']], 'open', 'the number of firms', 'Equilibrium'),
  M('4.1', 'Two sellers', ['Firms', 'Goods'], [[null, 'profit, read as contours']], 'relax', 'price-taking (A3)', 'Strategy'),
  M('4.2', 'A threat not carried out', ['Firms'], [[null, 'the order of moves']], 'add', 'the order of moves', 'Strategy'),
  M('5.1', 'Two consumers make a box', ['Households', 'Goods'], [[null, 'two utilities, read as contours']], 'open', 'every market at once', 'Equilibrium'),
  M('5.2', 'A good everyone uses', ['Households', 'Taxes'], [[null, 'the number of households n']], 'relax', 'complete markets (A5)', 'Equilibrium'),
  M('5.3', 'Quality the buyer cannot see', ['Goods', 'Contracts'], [[null, 'quality']], 'relax', 'full information (A4)', 'Equilibrium'),
  M('6.1', 'Capital accumulates', ['Capital', 'Households', 'Firms'], [[null, 'time']], 'add', 'accumulation', 'Equilibrium'),
  M('6.2', 'IS–LM and aggregate demand', ['Goods', 'Money', 'Households', 'Firms'], [['Labor', 'price level P'], ['Governments', 'spending G'], ['Central banks', 'money supply M'], ['Taxes', '']], 'add', 'money and government', 'Equilibrium'),
  M('6.3', 'The Phillips curve', ['Labor', 'Goods'], [['Households', 'expected inflation']], 'relax', 'equilibrium at once (A7)', 'Equilibrium'),
  M('6.4', 'The central bank chooses', ['Central banks', 'Policy rules', 'Labor'], [[null, 'the bank’s loss, read as contours']], 'add', 'a policymaker who chooses', 'Optimization'),
  M('7.1', 'The scatter is a shadow', ['Measurement'], [[null, 'nothing: x₂ is left out']], 'measure', 'a relationship, from data', 'Measurement'),
  M('7.2', 'A cloud of prices', ['Goods', 'Measurement'], [[null, 'nothing: each point a month']], 'measure', 'the market of Figure 1.1', 'Measurement'),
  M('8.1', 'Trade', ['Other countries', 'Goods', 'Labor', 'Capital'], [[null, 'the relative price']], 'add', 'a second economy', 'Equilibrium'),
  M('8.2', 'The exchange rate', ['Foreign exchange', 'Capital'], [['Other countries', 'the expected rate']], 'add', 'a second currency', 'Equilibrium'),
  M('8.3', 'A run', ['Banks', 'Households'], [['Regulation', 'deposit guarantee, zero']], 'add', 'a balance sheet', 'Strategy'),
  M('8.4', 'Diversification', ['Capital', 'Households'], [[null, 'the correlation ρ']], 'return', 'the household’s tangency, pricing assets', 'Optimization'),
  M('8.5', 'The cost of a tax', ['Goods', 'Taxes', 'Governments'], [[null, 'the tax rate t']], 'add', 'a state that chooses taxes', 'Equilibrium'),
  M('8.6', 'A cost a century later', ['Goods', 'Land and air'], [[null, 'a hundred years to the damage']], 'relax', 'complete markets (A5)', 'Optimization'),
  M('8.7', 'A minimum wage', ['Labor', 'Firms', 'Regulation'], [[null, 'the minimum wage']], 'relax', 'price-taking (A3)', 'Optimization'),
  M('8.8', 'A cartel', ['Firms', 'Regulation'], [[null, 'patience δ']], 'add', 'repetition', 'Strategy'),
  M('8.9', 'Present bias', ['Households'], [[null, 'the day you decide']], 'relax', 'consistent choice (A6)', 'Optimization'),
  M('8.10', 'Missing credit', ['Firms', 'Capital', 'Property'], [[null, 'the owner’s wealth']], 'relax', 'complete markets (A5)', 'Optimization'),
  M('8.11', 'Malthus', ['Households', 'History'], [[null, 'technology']], 'add', 'the very long run', 'History'),
].map((m) => ({ ...m, part: 1, href: `classical.html#f${m.id.replace('.', '-')}` }));

export const MODELS_P2 = [
  M('2.3', 'No representative firm', ['Firms'], [[null, 'firm sizes, drawn not assumed']], 'relax', 'a representative agent (A1)', 'Computation'),
  M('2.4', 'Unlike households', ['Households'], [[null, 'income, by fifths of households']], 'relax', 'a representative agent (A1)', 'Measurement'),
  M('2.5', 'Games real people play', ['Strategy'], [[null, 'the mix of reasoning levels']], 'relax', 'a representative agent (A1), consistent choice (A6)', 'Measurement'),
  M('2.6', 'Who trades with whom', ['Goods', 'Networks'], [[null, 'the share of ties rewired']], 'relax', 'no connections (A2)', 'Computation'),
  M('2.7', 'Chains, not cores', ['Networks'], [[null, 'the average number of ties']], 'relax', 'no connections (A2)', 'Computation'),
  M('2.8', 'Connected firms', ['Firms', 'Goods'], [[null, 'the sector whose demand changes']], 'relax', 'no connections (A2)', 'Measurement'),
  M('2.9', 'Contagion between banks', ['Banks', 'Networks'], [[null, 'who owes whom']], 'relax', 'no connections (A2)', 'Computation'),
  M('2.10', 'Prices that never settle', ['Goods', 'Households'], [[null, 'nothing: time runs']], 'relax', 'equilibrium at once (A7)', 'Equilibrium'),
].map((m) => ({ ...m, part: 2, href: `beyond.html#f${m.id.replace('.', '-')}` }));

// The wheel's state for a model: { moving, stopped: Map(cell → value) }, its
// method moving at the hub
export function stateOf(m, extra = {}) {
  return { moving: new Set([...m.moving, m.method]), stopped: new Map(m.held.filter(([c]) => c).map(([c, v]) => [c, v])), ...extra };
}

// The classical sequence of Part 1 as states of the wheel, stage by stage:
// each opens, adds, relaxes or measures one thing, until the whole wheel moves
// under the classical assumptions. cells: what moves by the end of the stage.
const grow = (prev, cells) => [...prev, ...cells];
const S1 = ['Goods', 'Taxes', 'Equilibrium'];
const S2 = grow(S1, ['Households', 'Optimization']);
const S3 = grow(S2, ['Firms']);
const S4 = grow(S3, ['Strategy']);
const S5 = grow(S4, ['Labor', 'Contracts']);
const S6 = grow(S5, ['Capital', 'Money', 'Governments', 'Central banks', 'Policy rules']);
const S7 = grow(S6, ['Measurement']);
const S8 = grow(S7, ['Other countries', 'Foreign exchange', 'Banks', 'Land and air', 'Regulation', 'Property', 'History']);
export const STAGES = [
  { no: 1, name: 'One market', rel: 'start', what: 'one market, the rest held', moving: S1, held: [['Labor', 'income I'], ['Households', 'demand given'], ['Firms', 'supply given']] },
  { no: 2, name: 'The household', rel: 'open', what: 'demand, into households', moving: S2, held: [['Labor', 'income I'], ['Firms', 'supply given']] },
  { no: 3, name: 'The firm', rel: 'open', what: 'supply, into firms', moving: S3, held: [['Labor', 'income I, wage w']] },
  { no: 4, name: 'A few firms', rel: 'relax', what: 'price-taking', moving: S4, held: [['Labor', 'income I, wage w']] },
  { no: 5, name: 'All markets', rel: 'open', what: 'income and wages', moving: S5, held: [] },
  { no: 6, name: 'Time, money, government', rel: 'add', what: 'capital, money, the state', moving: S6, held: [] },
  { no: 7, name: 'Measurement', rel: 'measure', what: 'what the wheel produces', moving: S7, held: [] },
  { no: 8, name: 'The field courses', rel: 'add', what: 'one thing per course', moving: S8, held: [] },
];
export const stageState = (s, extra = {}) => ({ moving: new Set(s.moving), stopped: new Map(s.held), ...extra });

// What the wheel produces, measured (Stage 7): Korea in 2025, from Bank of
// Korea ECOS and Statistics Korea (data/korea-growth.json)
export const MEASURED = 'Output <b>2,326</b> trillion won<br>Employed <b>28.8</b> million<br><i>Korea, 2025 (real, 2020 prices)</i>';

// A course is a path of units (docs/part3-ontology.md, 5.2): the units of
// Parts 1 and 2 it teaches, in the order it teaches them. Part 2's units are
// written 'p2:2.1'. The field courses start from the core units they build on
// (Part 1's 'Builds on').
export const COURSE_UNITS = {
  principles: ['1.1', '1.3', '1.2', '3.2', '5.2', '6.1', '6.2'],
  math: ['2.1', '2.2', '3.1', '5.1', 'p2:2.10', '6.1'],
  micro: ['2.1', '2.2', '2.3', '3.1', '3.2', '4.1', '5.1', 'p2:2.10', '5.3'],
  games: ['4.1', '4.2', '8.3', '8.8', 'p2:2.5'],
  macro: ['6.1', '6.2', '6.3', '6.4', 'p2:2.4'],
  metrics: ['7.1', '7.2'],
  trade: ['5.1', '8.1'],
  intlfin: ['2.3', '6.2', '8.2'],
  banking: ['6.2', '6.4', '8.3', 'p2:2.9'],
  finance: ['2.3', '8.4'],
  public: ['1.2', '5.2', '8.5'],
  environmental: ['5.2', '8.6'],
  labor: ['2.2', '3.1', '6.3', '8.7', 'p2:2.6'],
  io: ['3.2', '4.1', '4.2', '8.8', 'p2:2.3', 'p2:2.8'],
  behavioral: ['2.3', '8.9', 'p2:2.5'],
  development: ['5.3', '6.1', '8.10'],
  history: ['6.1', '8.11'],
};
const UNITS = new Map([...MODELS.map((m) => [m.id, m]), ...MODELS_P2.map((m) => [`p2:${m.id}`, m])]);
export const unitOf = (key) => UNITS.get(key);
// a unit's name as the site writes it
export const unitName = (m) => (m.part === 2 ? `Part 2, Figure ${m.id}` : `Figure ${m.id}`);
