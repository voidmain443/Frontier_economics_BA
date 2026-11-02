// Part 3: a new archive. The plan and the ontology's figures are in
// p3-figs.js, the ontology in ontology.js. Folded, the wheel the plan unrolls
// lies beside the page, seen whole: each figure puts it in a model's state,
// and the routes through it are drawn as their stories are told (wheel.js,
// docs/engine.md, docs/part3-ontology.md).

import { FIGS } from './p3-figs.js';
import { SPACE_FIGS, SPACE_CONSTRUCTS } from './p3-space.js';
import { COURSES } from './curriculum.js';
import { setupPage } from './page.js';
import { PLACE_P1, BUILD_P3, placeOfLink, stopIndex } from './wheel.js';
import { MODELS, MODELS_P2, RELATIONS, STAGES, stateOf, stageState, MEASURED } from './ontology.js';
import { t, localHref } from './i18n.js';

// the textbooks, with the question each answers
const host = document.querySelector('#course-index');
for (const [side, name] of [['core', 'The core'], ['field', 'The field courses']]) {
  const h = document.createElement('h3');
  h.textContent = t(name);
  const ul = document.createElement('ul');
  ul.className = 'course-grid';
  for (const c of COURSES.filter((x) => x.side === side)) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${localHref('course.html')}?c=${c.id}"><b>${t(c.short)}</b><span>${t(c.name)}</span><i>${t(c.question ?? `${c.weeks.length} weeks`)}</i></a>`;
    ul.appendChild(li);
  }
  host.append(h, ul);
}

// every unit of Parts 1 and 2, in four of its nine fields
const rel = Object.fromEntries(RELATIONS.map((r) => [r.id, r.name]));
const table = document.createElement('table');
table.innerHTML = `<caption>${t('The units of Parts 1 and 2')}</caption><thead><tr><th>${t('Unit')}</th><th>${t('Moves')}</th><th>${t('Holds')}</th><th>${t('Its one change')}</th><th>${t('Method')}</th></tr></thead>`;
const body = document.createElement('tbody');
for (const m of [...MODELS, ...MODELS_P2]) {
  const tr = document.createElement('tr');
  const held = m.held.map(([, v]) => t(v)).filter(Boolean).join('; ');
  tr.innerHTML = `<td><a href="${localHref(m.href)}">${m.part === 2 ? t('Part 2,') + ' ' : ''}${m.id}</a> ${t(m.title)}</td><td>${m.moving.map(t).join(', ')}</td><td>${held}</td><td>${m.rel === 'start' ? t('the start') : `${t(rel[m.rel])}: ${t(m.what)}`}</td><td>${t(m.method)}</td>`;
  body.appendChild(tr);
}
table.appendChild(body);
document.querySelector('#unit-table')?.appendChild(table);

// The routes drawn through the wheel. The classical sequence of Part 1 is
// drawn on stage by stage in Figure 3.3's story; in Figure 3.6's, it stands
// first, and the five paths of section 6 are drawn one a beat.
const byNumber = (a, b) => { const [x1, y1] = a.split('.').map(Number); const [x2, y2] = b.split('.').map(Number); return x1 - x2 || y1 - y2; };
const figs = Object.keys(PLACE_P1).sort(byNumber);
const classical = figs.map((k) => PLACE_P1[k]);
// the stop each figure is read at, and the last stop of each stage
const stopOf = stopIndex(classical);
const lastOfStage = (s) => stopOf[figs.findLastIndex((k) => Number(k.split('.')[0]) === s)];
const upto = [0, ...STAGES.map((S) => lastOfStage(S.no)), stopOf.at(-1)];
const paths = [...document.querySelectorAll('.paths section')];
const colours = ['ochre', 'cobalt', 'olive', 'madder', 'violet'];
const routes = [
  { name: 'Part 1, the classical sequence', places: classical, c: 'white', fid: '3.3', show: [1], upto },
  { name: 'Part 1', places: classical, c: 'chalk', fid: '3.9', dim: [1, 6] },
  ...paths.map((sec, i) => ({
    name: sec.querySelector('h3').textContent.split(':')[0],
    places: [...sec.querySelectorAll('a')].map((a) => placeOfLink(a.getAttribute('href'))).filter(Boolean),
    c: colours[i],
    fid: '3.9',
    show: [i + 1],
    draw: i + 1,
    dim: [i + 2, paths.length + 1],
  })),
];

const byId = Object.fromEntries(MODELS.map((m) => [m.id, m]));
const all = null;
const UNIT = byId['2.2'];
// a construct whose story moves the wheel through states, beat by beat
const told = (story, states, whole = false) => ({
  dom: { x: [0, 1], y: [0, 1] },
  callout: false,
  whole,
  build: () => ({ story, model: (b) => states[Math.min(b, states.length - 1)] }),
});
const cells = (moving, held = [], extra = {}) => ({ moving: new Set(moving), stopped: new Map(held), ...extra });

const constructs = {
  // the wheel, built ring by ring from the rim in (BUILD_P3)
  '3.1': {
    dom: { x: [0, 1], y: [0, 1] },
    callout: false,
    build: () => ({
      story: [
        { say: 'The plan of the archive: four layers of what economics studies, six cells each, and every name a door to the course that teaches it.' },
        { say: 'Roll the plan up and each layer is a ring of one wheel, Frank Knight’s wheel of wealth (1933). Build it from the rim in. First the agents, where everything that circulates starts and ends.', cam: { az: 0.12, el: 0.06, zoom: 0.92 }, dur: 1.4 },
        { say: 'Then the markets, where agents meet: goods, labor, money, capital, foreign exchange, and the land and air that have no market until one is made. What the agents send one another starts to circulate through them; each route first carries one parcel alone.', dur: 1.4 },
        { say: 'Then the institutions, the rules the agents meet under. Taxes start to flow through theirs.', dur: 1.4 },
        { say: 'At the hub, the methods. They are not in the economy: they are the tools every other ring is read with, and Part 1 added one at five of its stages.', cam: { az: 0, el: 0.1, zoom: 1 }, dur: 1.4 },
      ],
    }),
  },

  // a model is a state of the wheel: Figure 1.1, opened, then Figure 6.2
  '3.2': told([
    { say: 'The wheel as section 1 built it: every cell moving, every route running. No textbook figure draws all of this.' },
    { say: 'Figure 1.1 moves one market: goods, and its price. Its buyers and sellers are there, but what they want and what they can make are given, so their cells are held, hatched. Everything else is left out and empties to its outline.', dur: 1.4 },
    { say: 'What Figure 1.1 holds fixed is income, I = 1. Income reaches households as wages, through the labor market, and that route has stopped where it was. Folded in Part 1, this value was the figure’s hidden axis.', cam: { el: 0.08, zoom: 0.9 } },
    { say: 'Open the held cells and the wages move again: households earn what they spend, and firms hire the work they sell. Every market moves at once, as in Stage 5.', cam: { el: 0, zoom: 1 }, dur: 1.4 },
    { say: 'Figure 6.2, IS–LM, moves goods and money together, with the households that consume and the firms that invest. It holds the price level, government spending and the money supply.', dur: 1.4 },
    { say: 'It leaves out banks, other countries, and the land and air. A model is a choice of what moves, what is held and what is left out.' },
  ], [
    all,
    cells(['Goods', 'Equilibrium'], [['Households', ''], ['Firms', ''], ['Labor', '']]),
    stateOf(byId['1.1']),
    cells(['Goods', 'Labor', 'Households', 'Firms', 'Optimization', 'Equilibrium']),
    stateOf(byId['6.2']),
    stateOf(byId['6.2']),
  ]),

  // the classical sequence as states, stage by stage, with its route
  '3.3': told([
    { say: 'The classical sequence of Part 1, as states of the wheel. It starts with almost all of it held or left out.' },
    ...STAGES.map((S) => ({
      say: {
        1: 'Stage 1 starts with one market. The households and firms behind its curves are held, and so is income.',
        2: 'Stage 2 opens demand into households who choose. Optimization arrives at the hub.',
        3: 'Stage 3 opens supply into firms that choose. Income and the wage are still held.',
        4: 'Stage 4 relaxes price-taking. No agent or market opens: two firms stop taking the price as given, and strategy arrives at the hub.',
        5: 'Stage 5 opens income and wages, the last held cell. Every market now moves at once.',
        6: 'Stage 6 adds the capital and money markets, the government, and the central bank with its rules.',
        7: 'Stage 7 measures what the wheel produces. Nothing new moves; beside the hub stand Korea’s output and employment.',
        8: 'Stage 8 adds one thing per field course: other countries, banks, the land and air, property, history. Two cells never move: networks and computation.',
      }[S.no],
      dur: S.rel === 'relax' || S.rel === 'measure' ? 1 : 1.4,
    })),
    { say: 'The fifth relation adds no cell. The same structure returns in another: the household’s tangency of Figure 2.1 prices assets in the capital market of Figure 8.4.' },
  ], [
    all,
    ...STAGES.map((S) => stageState(S, S.no >= 7 ? { measured: MEASURED } : {})),
    stageState(STAGES[7], { measured: MEASURED, lit: ['Households', 'Capital'] }),
  ]),

  // the assumptions, as properties of the agents
  '3.4': told([
    { say: 'Every model makes assumptions about the agents in its moving cells. Eight run through Part 1.' },
    { say: 'Six of them Part 1 relaxes itself: price-taking at strategy, full information at contracts, complete markets in the land and air, equilibrium at once in the labor market, consistent choice among households, and data that speak for themselves at measurement.', dur: 1.2 },
    { say: 'Two it never relaxes head-on. The first is the representative agent: one firm stands for all firms, one household for all households. Drawn that way, every firm on the wheel is the same size.', dur: 1.4 },
    { say: 'Relaxed, the firms are as unequal as Zipf’s law says, a few giants and a long tail, and households differ in income too.', dur: 1.4 },
    { say: 'The second is no connections: any household buys from any firm, through the market.' },
    { say: 'Relaxed, each household is tied to a few firms, firms to their suppliers, banks to one another, and what moves travels along the ties.', dur: 1.6 },
    { say: 'Unlike and connected: the two assumptions Part 1 keeps to the end are what Part 2 relaxes, in the two cells it builds.' },
  ], [
    all,
    cells(STAGES[7].moving, [], { lit: ['Strategy', 'Contracts', 'Land and air', 'Labor', 'Households', 'Measurement'] }),
    cells(STAGES[7].moving, [], { alike: true, lit: ['Firms', 'Households'] }),
    cells(STAGES[7].moving, [], { unlike: true, lit: ['Firms', 'Households'] }),
    cells(STAGES[7].moving, [], { lit: ['Goods'] }),
    cells(STAGES[7].moving, [], { tied: true, unlike: true, lit: ['Households', 'Firms', 'Banks'] }),
    { ...all, moving: new Set([...STAGES[7].moving, 'Networks', 'Computation']), stopped: new Map(), tied: true, unlike: true, lit: ['Networks', 'Computation'] },
  ]),

  // a unit, one field at a time
  '3.8': told([
    { say: 'A unit of the textbook is one model, in nine fields. This is Figure 2.2’s.' },
    { say: 'Its question: where does a demand curve come from? Demand lives in the goods market.', cam: { el: 0.06 } },
    { say: 'It moves one cell: the households, each choosing the best bundle it can afford. Everything else is left out.', dur: 1.4 },
    { say: 'It holds two values: the price of x, one per budget line, which is its hidden axis, and income.' },
    { say: 'Its one change opens a cell that Figure 1.1 held. There, demand was given; here, it is a list of choices.' },
    { say: 'It assumes one household stands for all. Drawn as it assumes, every household is the same size.', dur: 1.4 },
    { say: 'Its method is optimization, at the hub: the best affordable bundle, a tangency.' },
    { say: 'Its evidence: in Hunan, poor households given cheaper rice bought less of it, a demand curve that slopes up (Jensen and Miller 2008).' },
    { say: 'It builds on Figure 2.1 and returns in Figure 1.1’s demand surface and in labor supply.', cam: { el: 0, zoom: 1 } },
  ], [
    all,
    cells(STAGES[7].moving, [], { lit: ['Goods'] }),
    cells(['Households', 'Optimization']),
    stateOf(UNIT),
    stateOf(UNIT, { lit: ['Households'] }),
    stateOf(UNIT, { alike: true, lit: ['Households'] }),
    stateOf(UNIT, { alike: true, lit: ['Optimization'] }),
    stateOf(UNIT, { alike: true, lit: ['Goods'] }),
    cells(['Households', 'Goods', 'Labor', 'Optimization'], [], { lit: ['Households', 'Goods', 'Labor'] }),
  ], true),

  // five ways through, one a beat
  '3.9': told([
    { say: 'The route of Part 1 is one way through the wheel.' },
    { say: 'By a question, why are some countries rich: from all markets at once to capital, institutions, history and the largest firms.', dur: 1.6 },
    { say: 'By an agent, the household: its choice, its saving, its consumption in macroeconomics, its portfolio, and its departures from the model.', dur: 1.6 },
    { say: 'By a market, labor: the firm’s demand for it, unemployment, who sets the wage, how to measure it, and jobs found through ties.', dur: 1.6 },
    { say: 'By an assumption, no connections: from Figure 1.1, where anyone trades with anyone, through networks to the banks a loss travels between.', dur: 1.6 },
    { say: 'By a method, optimization: one tool at the hub, used by the household, the firm, the central bank and the investor.', dur: 1.6 },
    { say: 'Five ways through, and the route of Part 1 among them. The archive keeps the classical sequence as one way in, not the only one.' },
  ], [all], true),

  // section 5: what holding still requires (p3-space.js)
  ...SPACE_CONSTRUCTS,
};

await setupPage({ figs: { ...FIGS, ...SPACE_FIGS }, constructs, files: ['us-phillips'], world: {}, archive: { figure: '3.1', end: '#a7', near: '#a5', routes }, build: BUILD_P3, stages: 8, unit: 'Section', part: 'Part 3', name: 'A new archive' });
