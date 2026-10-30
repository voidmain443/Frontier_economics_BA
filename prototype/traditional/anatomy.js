// Anatomy blocks: for each assembly, the reasoning step by step and the parts it
// is built from. Flat, they read as a derivation with its parts list; unfolded,
// the stage beside the page performs the same steps with the same cards.

import { drawCard, PARTS, EQS } from './parts.js';

export const ANATOMY = [
  {
    id: 'opportunity', after: 'figure[data-fig="ppf"]', title: 'What the frontier’s slope is',
    parts: ['ppf'],
    steps: [
      'Along the frontier every resource is in use, so more of x means less of y.',
      'The slope −dy/dx is the marginal rate of transformation: the opportunity cost of x, counted in y.',
      'The frontier bows outward because resources are not equally suited to both goods, so the opportunity cost rises.',
      'The same slope returns in general equilibrium, where efficiency requires MRT = MRS.',
    ],
  },
  {
    id: 'market', after: 'figure[data-fig="sd"]', title: 'A market, before its parts are built',
    parts: ['sd'],
    steps: [
      'Principles gives demand and supply as facts about a market.',
      'Each is a sum: demand over households (built in Micro 2–4), supply over firms (Micro 7–8).',
      'Between equilibria the price moves with excess demand, dP/dt = κ[D(P) − S(P)]. The book shows only where it stops.',
      'Unfolded, the curves are wires and the price is a rod: when income rises, watch the rod travel from E to E′.',
    ],
  },
  {
    id: 'elasticity', after: '#principles-4', title: 'Why revenue peaks where |ε| = 1',
    parts: ['elastic', 'eq-elastic'],
    steps: [
      'On a straight demand curve, P = 10 − Q, the slope is constant but the elasticity ε = (dQ/dP)(P/Q) is not: it runs from −∞ at the top to 0 at the bottom.',
      'Revenue is the rectangle P·Q under a point on the curve.',
      'Stand that area on end as a bar over its point and slide the point down the line. The bars rise, peak and fall.',
      'dR/dP = Q(1 + ε), so revenue is flat exactly where ε = −1: the midpoint.',
      'This is why a seller with market power never prices on the inelastic half (Micro 9).',
    ],
  },
  {
    id: 'surplus', after: '#principles-5', title: 'Surplus is a sum over people',
    parts: ['surplus', 'eq-surplus'],
    steps: [
      'Replace the demand curve with twenty buyers, each willing to pay a different amount, sorted from the highest. Replace supply with twenty sellers, sorted by cost.',
      'At a price of 10, ten trades happen. Each buyer gains wtp − p and each seller p − c; consumer and producer surplus are these gains added up.',
      'A tax t splits the price: buyers pay p_b and sellers keep p_s = p_b − t.',
      'Every trade whose gain wtp − c is smaller than t no longer happens. The deadweight loss is exactly the gains of those trades.',
      'Who bears the tax depends on how steeply each row of steps rises: elasticity again (Principles 4).',
    ],
  },
  {
    id: 'externality', after: '#principles-6', title: 'A cost no one is charged',
    parts: ['surplus', 'externality'],
    steps: [
      'A seller’s step is its private cost.',
      'If production also harms others, the social cost of each unit is higher by the external cost.',
      'The market trades where demand meets private cost, so it trades too many units.',
      'The lost surplus is a triangle like a tax’s, on the other side. A corrective tax equal to the external cost removes it (Pigou).',
    ],
  },
  {
    id: 'lagrange', after: 'figure[data-fig="optim"]', title: 'The rule behind every tangency',
    parts: ['optim', 'eq-lagrange'],
    steps: [
      'At a constrained optimum the objective cannot rise along the constraint, so its gradient is perpendicular to the constraint.',
      'Both gradients then point the same way: ∇f = λ∇g.',
      'λ is how much the optimum rises if the constraint is relaxed by one unit: a shadow price.',
      'Micro uses this rule again and again: the consumer (MRS = p_x/p_y), the firm (MRTS = w/r), the planner (MRS = MRT), the household over time (the Euler equation).',
    ],
  },
  {
    id: 'consumer', after: 'figure[data-fig="consumer"]', title: 'The consumer is the same picture',
    parts: ['optim', 'consumer'],
    steps: [
      'f is utility; its contours are the indifference curves.',
      'g is spending; the constraint is the budget line.',
      '∇f = λ∇g becomes MRS = p_x/p_y, and λ is the marginal utility of income.',
    ],
  },
  {
    id: 'demand', after: '#micro-3', title: 'A demand curve is a list of optima',
    parts: ['consumer', 'demandI', 'eq-slutsky'],
    steps: [
      'Raise p_x: the budget line turns inward about its intercept on the y axis.',
      'Each price has its own tangency. Record the chosen x* at each price.',
      'Plotting (x*, p_x) gives one household’s demand curve, the curve Principles took as given.',
      'The Slutsky equation splits each step into a substitution effect, along the indifference curve, and an income effect, the lost purchasing power.',
    ],
  },
  {
    id: 'sum', after: '#micro-4', title: 'Market demand is a horizontal sum',
    parts: ['demandI', 'market'],
    steps: [
      'Three households with incomes 4, 6 and 10 each spend half their income on x: x_i = ½ m_i / p.',
      'At one price, lay their quantities end to end.',
      'Do it at every price: the market demand is X(p) = Σ x_i(p).',
      'Whether such a sum behaves like a single person is a separate question, taken up where macro begins (the aggregation junction).',
    ],
  },
  {
    id: 'time', after: '#micro-5', title: 'Time is a second good',
    parts: ['consumer', 'intertemporal', 'eq-euler'],
    steps: [
      'Relabel the two goods c₁ and c₂: consumption now and later.',
      'The price of later consumption is 1/(1 + r), so the budget line through the endowment has slope −(1 + r).',
      'The tangency is the Euler equation, u′(c₁) = β(1 + r)u′(c₂).',
      'This card is reused more than any other: macro’s consumption and IS curve, finance’s asset prices, international finance’s current account.',
    ],
  },
  {
    id: 'envelope', after: '#micro-7', title: 'Plants of every size, and their envelope',
    parts: ['isoquant', 'envelope', 'eq-envelope'],
    steps: [
      'Cost minimization (MRTS = w/r) gives the cheapest way to make each output with a given plant.',
      'In the short run the plant is fixed, so each plant size K has its own U-shaped average cost curve. Draw one per size, each on its own plane along a K axis.',
      'Collapse the planes: the lowest cost at each output traces the long-run average cost, the envelope.',
      'Each short-run curve touches the envelope at one point, and that point is its own minimum only at the bottom of the envelope. Jacob Viner’s draftsman famously drew it otherwise.',
      'Where the envelope falls there are economies of scale; where it rises, diseconomies. Its minimum is the efficient scale.',
    ],
  },
  {
    id: 'entry', after: '#micro-8', title: 'Why competition ends at the minimum',
    parts: ['envelope', 'supply', 'longrun'],
    steps: [
      'A competitive firm supplies along its marginal cost curve, above average variable cost.',
      'Industry supply adds the firms’ quantities across, the way market demand added households’.',
      'While price is above the minimum of average cost, firms earn profits and new firms enter. Supply shifts right and price falls.',
      'Entry stops when price equals the minimum of the envelope: zero profit, every firm at efficient scale. Long-run supply is flat at that price.',
    ],
  },
  {
    id: 'monopoly', after: '#micro-9', title: 'The top of the profit hill',
    parts: ['market', 'monopoly', 'eq-monopoly'],
    steps: [
      'A single seller faces the whole market demand, the card from Micro 4.',
      'Profit π(Q) = P(Q)Q − C(Q) is a hill over output.',
      'Its slope is MR − MC: the seller climbs while MR > MC, and the top is flat where MR = MC.',
      'The price is read off demand at that quantity; the markup (P − MC)/P = 1/|ε| depends on the elasticity of Principles 4.',
      'The units between 4 and 8 that competition would trade are lost: the same deadweight triangle as a tax.',
    ],
  },
  {
    id: 'structure', after: '#micro-10', title: 'One line from monopoly to competition',
    parts: ['monopoly', 'cournot', 'nfirms', 'longrun'],
    steps: [
      'With two sellers, each picks its output given the other’s: a best-reply curve. Their crossing is the Nash equilibrium (Game theory 2).',
      'With n identical sellers facing P = 12 − Q and cost 2, the Cournot price is (12 + 2n)/(n + 1).',
      'One seller gives the monopoly price 7, two give 5.33, and as n grows the price falls to marginal cost: perfect competition.',
      'Monopoly, oligopoly and competition are points on one curve, not three separate theories.',
    ],
  },
  {
    id: 'box', after: '#micro-11', title: 'Two consumers make a box',
    parts: ['consumerA', 'consumerB', 'edgeworth', 'eq-welfare'],
    steps: [
      'Household A’s indifference map is the consumer card. Household B’s is the same kind of card in B’s own axes.',
      'Turn B’s card half a turn and lay it on A’s, so that the total endowment of both goods fills the box.',
      'Every point in the box is now a way of dividing both goods between A and B.',
      'Where A’s and B’s indifference curves are tangent, no trade can help one without hurting the other: the contract curve, the Pareto-efficient allocations.',
      'A price line through the endowment ω that clears both markets picks one of them: the Walrasian equilibrium. On the page, the price wire turns until the two choices meet.',
    ],
  },
  {
    id: 'welfare', after: '#j-ge', title: 'Where the welfare theorems send the rest of the degree',
    parts: ['market', 'edgeworth', 'eq-welfare'],
    steps: [
      'The first theorem says a competitive equilibrium is Pareto efficient. Each assumption it needs names a field: externalities (environmental), public goods (public), market power (industrial organization), full information (contracts, banking).',
      'The second says any efficient allocation can be reached with lump-sum transfers. Public economics asks what happens when the transfers themselves distort.',
      'Long-run macro is this box with time and many households; trade theory is this box with two countries.',
    ],
  },
  {
    id: 'failure', after: '#micro-12', title: 'Each failure is a broken assumption',
    parts: ['eq-welfare', 'externality', 'surplus'],
    steps: [
      'An externality is a market that is missing: the side effect has no price.',
      'Its loss is the triangle of the surplus card, and its repair is a price for the side effect: a tax, a permit market, or bargaining over clear property rights (Coase).',
      'A public good is one no one can be excluded from, so voluntary payment falls short of Σ MRS = MRT.',
    ],
  },
  {
    id: 'aggregate', after: '#j-aggregation', title: 'From many households to one',
    parts: ['demandI', 'market', 'eq-aggregate'],
    steps: [
      'Market demand was a sum over households (Micro 4).',
      'Macroeconomics wants one consumption function for a whole economy.',
      'A sum of households behaves like a single household only if every household’s spending responds to income in the same straight-line way (Gorman).',
      'Otherwise moving income between households changes total demand. Most macro models assume a representative household anyway; heterogeneous-agent models do not.',
    ],
  },
  {
    id: 'longrun', after: '#macro-2', title: 'The classical economy is micro, added up',
    parts: ['isoquant', 'labor', 'intertemporal', 'loanable'],
    steps: [
      'Firms hire labor until the wage equals the marginal product of labor: labor demand is the firm’s technology card read from another side (Micro 7).',
      'Households supply labor by trading leisure against goods (Micro 3).',
      'Their crossing fixes employment, and so output Y = F(K, L): the vertical long-run supply.',
      'Households save along the Euler equation (Micro 5) and firms invest until MPK = r + δ (Micro 7). Saving meets investment at the real interest rate.',
    ],
  },
  {
    id: 'solow', after: 'figure[data-fig="solow"]', title: 'The loanable funds market, repeated every year',
    parts: ['loanable', 'solow'],
    steps: [
      'Each year’s saving becomes new capital.',
      'Capital wears out and is spread over a growing workforce.',
      'k̇ = s f(k) − (n + δ)k: the tank beside the page, with a faucet and a drain.',
    ],
  },
  {
    id: 'euler', after: '#macro-5', title: 'Consumption is the time card',
    parts: ['intertemporal', 'eq-euler'],
    steps: [
      'Macro’s consumption function is the two-period consumer of Micro 5 extended over a lifetime.',
      'Temporary income is spread over many years: consumption follows permanent income.',
    ],
  },
  {
    id: 'lm', after: '#macro-6', title: 'LM is a list of money markets',
    parts: ['money', 'lm'],
    steps: [
      'The demand for real balances rises with income and falls with the interest rate.',
      'At one level of income, money demand meets the fixed supply at one interest rate.',
      'Repeat at each income: the equilibrium rates trace the LM curve, r = 0.9Y − M/P.',
    ],
  },
  {
    id: 'islm', after: '#macro-8', title: 'IS is the shadow of a stack of goods markets',
    parts: ['intertemporal', 'loanable', 'cross', 'is', 'lm', 'islm'],
    steps: [
      'The goods market at one interest rate is a Keynesian cross: planned spending AE = C(Y) + I(r) + G against the 45° line. C comes from the consumer over time (Micro 5), I from the firm’s marginal product of capital (Micro 7).',
      'A higher r lowers investment, so the AE line drops and output falls.',
      'Stack the crosses along an r axis and drop each equilibrium to the floor (Y, r): the points trace the IS curve.',
      'LM is built the same way from money markets (Macro 6).',
      'Where IS and LM cross, both markets clear at once. IS–LM is the general equilibrium of two markets with prices held fixed.',
    ],
  },
  {
    id: 'adas', after: '#macro-9', title: 'AD is the shadow of a stack of IS–LMs',
    parts: ['islm', 'labor', 'adas', 'eq-ad'],
    steps: [
      'A higher price level lowers real balances M/P and shifts LM up.',
      'Solve IS–LM at each price level and drop output to the floor (Y, P): aggregate demand slopes down.',
      'Supply comes from the labor market (Macro 2): vertical at full employment when wages are flexible, sloping up in the short run when wages and prices adjust slowly.',
      'The history of the model is the history of that supply curve: classical (vertical), Keynesian (flat), the synthesis (rising in the short run, vertical in the long), then expectations (Macro 10).',
    ],
  },
  {
    id: 'phillips', after: '#macro-10', title: 'AS, rewritten in inflation and unemployment',
    parts: ['adas', 'phillips'],
    steps: [
      'Okun’s law turns output gaps into unemployment gaps.',
      'Short-run AS becomes a Phillips curve: inflation is above expectations when unemployment is below its natural rate.',
      'Each level of expected inflation has its own curve. When expectations rise the curve shifts up; the record in chapter 7 shows it happening, 1960–1986.',
    ],
  },
  {
    id: 'nk', after: '#macro-11', title: 'Modern macro is micro cards, relabeled',
    parts: ['intertemporal', 'monopoly', 'eq-nk'],
    steps: [
      'The IS equation is the Euler equation (Micro 5), with output replacing consumption.',
      'The Phillips curve comes from firms with market power (Micro 9) that reset prices only from time to time: inflation depends on expected inflation and the output gap.',
      'The third equation is a rule for the central bank’s interest rate.',
      'The micro consumer and the micro monopolist are the foundations of the model central banks use.',
    ],
  },
  {
    id: 'open', after: '#macro-13', title: 'IS–LM with a world interest rate',
    parts: ['islm', 'mf', 'eq-trilemma'],
    steps: [
      'Open the capital account: money flows until the domestic rate equals the world rate plus expected depreciation.',
      'Net exports depend on the exchange rate and enter IS.',
      'With a fixed exchange rate, LM must follow the world rate and monetary policy is given up. With a float, the exchange rate moves IS.',
      'A country can have only two of fixed rates, free capital and its own monetary policy: Korea in 1997, chapter 7.',
    ],
  },
  {
    id: 'ols', after: 'figure[data-fig="regression"]', title: 'A fitted line is a projection',
    parts: ['regression', 'eq-ols'],
    steps: [
      'Least squares minimizes the squared vertical distances: the springs on the page come to rest there.',
      'In matrix form the fitted values are the projection of y onto the columns of X (Math 7).',
      'The slope here is about 1.0 though the true effect is 0.5, because x₂ is left out and moves with x₁. Unfolded, x₂ is the height above the page.',
    ],
  },
  {
    id: 'iv', after: '#metrics-8', title: 'An instrument isolates one channel',
    parts: ['regression', 'eq-iv'],
    steps: [
      'An instrument z moves x but reaches y only through x.',
      'Its covariance with y, divided by its covariance with x, is the causal slope: β = Cov(z, y)/Cov(z, x).',
      'Every empirical field course reuses this design (labor, development, public).',
    ],
  },
];

ANATOMY.push({
  id: 'world', after: '#ch8 > h2', title: 'One world economy, and why the courses come in this order',
  parts: ['market', 'edgeworth', 'islm', 'adas', 'mf', 'eq-nk'],
  steps: [
    'Households, firms, banks, financial markets, the government, the central bank and the rest of the world: each is an agent a course built, and each decision it makes is a card from micro.',
    'The real layer: goods and labor pass between households and firms through markets (micro), and across borders (trade).',
    'The financial layer: saving, credit, money and assets pass through banks and markets (macro, money and banking, finance, international finance).',
    'The layers meet in three prices. The interest rate joins saving to investment, the exchange rate joins one country to another, and the price level joins money to goods.',
    'That is why the courses come in this order. Principles names the parts and mathematics supplies the rule. Micro builds the agents and one market at a time, and general equilibrium joins the markets. Macro adds them up and adds time and money, econometrics measures them, and each field course reopens one assumption.',
  ],
});

ANATOMY.push({
  id: 'archive', after: '#archive-anchor', title: 'An archive arranged by what economics studies',
  parts: [], exitLabel: 'Close the space',
  cam: { az: -0.55, el: 0.42, dist: 4.4, target: [0, 0.8, 0] },
  steps: [
    'Start from the agents, not from course titles: households, firms, workers, banks, financial markets, the government, the central bank and the rest of the world. Each agent opens the course that explains its decisions.',
    'Markets lie between the agents: goods, labor, money, capital and foreign exchange. Each market is where two kinds of agent meet, and each opens the course that studies it.',
    'Above them, the classical layers in the order they are needed: choice and optimization, equilibrium and welfare, then aggregates, time and money. This is the staircase of Part 1.',
    'Then the layers the classical sequence leaves out: strategy and networks (who is connected to whom), measurement and causality (what the data can identify), and computation with many interacting agents (QuantEcon, agent-based models).',
    'There are three ways through the archive. Follow a question (why are some countries rich?), an agent (the household, from choice to finance), or a market (labor, from micro to measurement). Each path is a sequence of the cards built in Part 1.',
    'Every name is a door. Select an agent, a market or a layer to open its textbook page, with the weeks, the cards it uses, and outside textbooks to read next.',
  ],
});
ANATOMY.find((a) => a.id === 'world').cam = { az: -0.45, el: 0.5, dist: 3.9, target: [0.25, 0.35, 0] };

// Field courses: built from earlier cards (stage.js has the same list).
const FIELDS = {
  trade: ['ppf', 'edgeworth', 'sd', 'Two frontiers and a box: comparative advantage is the frontier’s slope compared across countries, and the gains are general equilibrium with two countries.'],
  intlfin: ['mf', 'eq-trilemma', 'intertemporal', 'The open-economy IS–LM, plus the time card: a current account deficit is borrowing from the future.'],
  banking: ['money', 'lm', 'eq-euler', 'The money market behind LM, now with banks that create deposits, and the information problems that make runs possible.'],
  public: ['surplus', 'externality', 'eq-welfare', 'The tax wedge, the external cost and the welfare theorems: when the state should step in, and what its taxes cost.'],
  labor: ['labor', 'supply', 'intertemporal', 'The labor market of macro, with people as the commodity: human capital is the time card applied to schooling.'],
  io: ['monopoly', 'cournot', 'nfirms', 'The line from monopoly to competition, walked in detail: pricing, collusion, entry.'],
  development: ['solow', 'loanable', 'envelope', 'The capital tank, scale economies and missing credit markets: why some economies stay poor.'],
  environmental: ['externality', 'eq-euler', 'surplus', 'The missing price for a side effect, and the discount rate from the time card: how much the far future counts.'],
  finance: ['intertemporal', 'eq-euler', 'loanable', 'The Euler equation prices every asset: p = E[m x], with m the ratio of marginal utilities.'],
  behavioral: ['intertemporal', 'consumer', 'eq-euler', 'The consumer cards, with the discount factor and the reference point rewritten from evidence.'],
  history: ['solow', 'labor', 'adas', 'The growth and business-cycle cards run on centuries of data.'],
};
for (const [id, [a, b, c, text]] of Object.entries(FIELDS)) {
  ANATOMY.push({
    id: `field-${id}`, after: `#field-${id} > .field-from`, title: 'Assembled from',
    parts: [a, b, c], steps: [text],
  });
}

const meta = (id) => PARTS[id] ?? EQS[id];

export function renderAnatomy(root, ctx) {
  for (const A of ANATOMY) {
    const anchor = root.querySelector(A.after);
    // a concept already dissected in place keeps that block
    if (!anchor || root.querySelector(`#anat-${A.id}`)) continue;
    const inList = anchor.tagName === 'LI';
    const el = document.createElement(inList ? 'li' : 'section');
    el.className = 'anatomy';
    el.id = `anat-${A.id}`;
    el.innerHTML = `<p class="an-title"><span>Anatomy</span>${A.title}</p>` +
      `<ol class="an-steps">${A.steps.map((s) => `<li>${s}</li>`).join('')}</ol>` +
      '<div class="an-parts"></div>';
    const strip = el.querySelector('.an-parts');
    for (const id of A.parts) {
      const m = meta(id);
      if (!m) continue;
      const fig = document.createElement('div');
      fig.className = `an-part${EQS[id] ? ' is-eq' : ''}`;
      drawCard(fig, id, undefined, ctx);
      strip.appendChild(fig);
    }
    anchor.after(el);
  }
}
