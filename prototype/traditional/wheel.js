// The world (docs/engine.md): the economy as one engine, drawn as Frank
// Knight's "wheel of wealth" (1933), the first circular-flow diagram. The
// archive's four layers are its rings, from methods at the hub to agents at the
// rim, and each layer's six rooms are its sectors: 24 cells. Agents live on the
// rim. What they send one another runs inward to a market (or an institution)
// and out again: goods and work one way, money the other.
//
// Wheel coordinates: x and z on the wheel's floor, y up; an angle a runs from
// +x toward +z. fold.js turns the wheel about its hub and moves the hub, so that
// the place being read lies under the reading point.

import { LAYERS } from './p3-figs.js';

export const HUB = 0.6;
export const RING = 1.1;
export const RIM = HUB + 4 * RING;
export const SECTOR = (2 * Math.PI) / 6;

export const CELLS = LAYERS.flatMap((layer, ring) => layer.rooms.map(([name, href, asset], sector) => ({ name, href, asset, ring, sector, layer: layer.name, c: layer.c })));
const BY = Object.fromEntries(CELLS.map((c) => [c.name, c]));

// Part 1: the cell each figure is read in, or [cell, cell] for a figure that
// spans two (keys are strings: 8.10 is not 8.1). A pair must share a radial
// wall (same ring, next sectors) or an arc (same sector, next rings).
export const PLACE_P1 = {
  '1.1': 'Goods', '1.2': ['Goods', 'Taxes'], '1.3': 'Goods',
  '2.1': 'Households', '2.2': ['Households', 'Goods'], '2.3': 'Households',
  '3.1': 'Firms', '3.2': 'Firms',
  '4.1': 'Strategy', '4.2': 'Strategy',
  '5.1': 'Equilibrium', '5.2': ['Equilibrium', 'Taxes'], '5.3': 'Contracts',
  '6.1': 'Capital', '6.2': ['Goods', 'Money'], '6.3': 'Labor', '6.4': 'Central banks',
  '7.1': 'Measurement', '7.2': 'Measurement',
  '8.1': 'Other countries', '8.2': 'Foreign exchange', '8.3': 'Banks', '8.4': 'Capital', '8.5': 'Governments',
  '8.6': 'Land and air', '8.7': ['Labor', 'Regulation'], '8.8': 'Regulation', '8.9': 'Households', '8.10': 'Property', '8.11': 'History',
};

// Part 2: each section opens in the cell of the Part 1 figure it starts from;
// the chains of 2.5, which start from 2.4, are read in Networks.
export const PLACE_P2 = { '2.1': 'Firms', '2.2': 'Households', '2.3': 'Strategy', '2.4': 'Goods', '2.5': 'Networks', '2.6': 'Firms', '2.7': 'Banks' };

const inner = (ring) => HUB + ring * RING;
const mid = (c) => inner(c.ring) + RING / 2;
const angle = (c) => (c.sector + 0.5) * SECTOR;
export const polar = (r, a, y = 0) => [r * Math.cos(a), y, r * Math.sin(a)];
export const cellCentre = (c, y = 0) => polar(mid(c), angle(c), y);
export const cellByName = (name) => BY[name];

// Where a place lies, in polar wheel coordinates (r, a). A cell: its centre. A
// radial wall: its middle. An arc between two rings: its middle.
export function placeOf(place) {
  const names = Array.isArray(place) ? place : [place];
  const cells = names.map((n) => BY[n]);
  if (cells.some((c) => !c)) throw new Error(`unknown cell in ${names.join(', ')}`);
  const [a, b] = cells;
  if (!b) return { cells, kind: 'cell', r: mid(a), a: angle(a) };
  const ds = (b.sector - a.sector + 6) % 6;
  if (a.ring === b.ring && (ds === 1 || ds === 5)) return { cells, kind: 'wall', r: mid(a), a: (ds === 1 ? a.sector + 1 : a.sector) * SECTOR };
  if (a.sector === b.sector && Math.abs(a.ring - b.ring) === 1) return { cells, kind: 'arc', r: inner(Math.max(a.ring, b.ring)), a: angle(a) };
  throw new Error(`${names.join(' and ')} share no wall or arc`);
}

// The place a link on the site points to: a Part 1 figure or field course
// (classical.html#f6-1, #c8-10), a Part 1 stage (#s5: its first figure), or a
// Part 2 section (beyond.html#b1).
export function placeOfLink(href) {
  const m = href.match(/(classical|beyond)\.html#([a-z])(\d+)-?(\d+)?/);
  if (!m) return null;
  const [, page, kind, a, b] = m;
  if (page === 'beyond') return PLACE_P2[`2.${a}`] ?? null;
  if (kind === 'f' || kind === 'c') return PLACE_P1[`${a}.${b}`] ?? null;
  if (kind === 's') return PLACE_P1[`${a}.1`] ?? null;
  return null;
}

const wrap = (d) => Math.atan2(Math.sin(d), Math.cos(d));
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Where the wheel stands along the route. stops: [{ c, p }] by page position c
// (px). The wheel holds still while a figure is near the reading line (HOLD px
// either side, at most a quarter of the gap) and turns, or slides between
// rings, through the rest of the gap. travel is the distance still being
// covered, largest halfway (fold.js steps the camera back by it).
const HOLD = 400;
export function wheelAt(stops, focus, ease) {
  if (!stops.length) return null;
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].c <= focus) i++;
  const A = stops[i];
  const B = stops[Math.min(i + 1, stops.length - 1)];
  if (focus <= A.c || A === B) return { r: A.p.r, a: A.p.a, weights: weightsOf(A.p, 1), s: 0, travel: 0 };
  const gap = B.c - A.c;
  const hold = Math.min(HOLD, 0.25 * gap);
  const s = clamp01((focus - A.c - hold) / (gap - 2 * hold));
  const u = ease(s);
  const da = wrap(B.p.a - A.p.a);
  const weights = weightsOf(A.p, 1 - u);
  for (const [n, w] of weightsOf(B.p, u)) weights.set(n, Math.max(weights.get(n) ?? 0, w));
  const d = Math.abs(B.p.r - A.p.r) + ((A.p.r + B.p.r) / 2) * Math.abs(da);
  return { r: A.p.r + (B.p.r - A.p.r) * u, a: A.p.a + da * u, weights, s, travel: d * Math.sin(Math.PI * s) };
}

function weightsOf(p, w) {
  return new Map(p.cells.map((c) => [c.name, w]));
}

// The wheel's pose: turned by phi about its hub, the hub at C, so that the
// polar point (r, a) lies at P. psi is the direction from the hub to P.
export function poseFor(r, a, P, psi) {
  return { phi: psi - a, C: [P[0] - r * Math.cos(psi), P[1], P[2] - r * Math.sin(psi)] };
}
// a wheel point in the world, for a pose (the shader does the same for geometry)
export function toWorldW(p, { phi, C }) {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [p[0] * c - p[2] * s + C[0], p[1] + C[1], p[0] * s + p[2] * c + C[2]];
}

// ---------- geometry ----------

// The rings and sectors as lines, a faint polar grid, and a floor plate for each
// cell, all in wheel coordinates.
export function wheelGeometry() {
  const ringLines = [];
  const grid = [];
  const arc = (r, a0, a1, n, out, y = 0) => {
    for (let k = 0; k < n; k++) out.push([polar(r, a0 + ((a1 - a0) * k) / n, y), polar(r, a0 + ((a1 - a0) * (k + 1)) / n, y)]);
  };
  for (let k = 0; k <= 4; k++) arc(inner(k), 0, 2 * Math.PI, 180, ringLines);
  for (let s = 0; s < 6; s++) ringLines.push([polar(HUB, s * SECTOR), polar(RIM, s * SECTOR)]);
  for (let r = HUB + RING / 4; r < RIM - 1e-6; r += RING / 4) if (Math.abs(((r - HUB) / RING) % 1) > 0.01) arc(r, 0, 2 * Math.PI, 160, grid, 0.001);
  for (let s = 0; s < 36; s++) if (s % 6) grid.push([polar(HUB, (s * SECTOR) / 6, 0.001), polar(RIM, (s * SECTOR) / 6, 0.001)]);
  const plates = CELLS.map((c) => {
    const quads = [];
    const r0 = inner(c.ring) + 0.02;
    const r1 = r0 + RING - 0.04;
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a0 = (c.sector + 0.004 + (0.992 * k) / n) * SECTOR;
      const a1 = (c.sector + 0.004 + (0.992 * (k + 1)) / n) * SECTOR;
      quads.push([polar(r0, a0, -0.004), polar(r1, a0, -0.004), polar(r1, a1, -0.004), polar(r0, a1, -0.004)]);
    }
    return { cell: c, quads };
  });
  return { ringLines, grid, plates };
}

// Where a cell's sign may stand: the middle of its outer arc, of its inner arc,
// and near each of its radial walls. fold.js takes the first the page leaves clear.
export function signSpots(c) {
  const r0 = inner(c.ring);
  const a = angle(c);
  const s = c.sector * SECTOR;
  return [polar(r0 + RING - 0.14, a), polar(r0 + 0.14, a), polar(r0 + RING / 2, s + 0.1 * SECTOR), polar(r0 + RING / 2, s + 0.9 * SECTOR),
    polar(r0 + RING - 0.14, s + 0.15 * SECTOR), polar(r0 + RING - 0.14, s + 0.85 * SECTOR), polar(r0 + 0.14, s + 0.15 * SECTOR), polar(r0 + 0.14, s + 0.85 * SECTOR)];
}

// A route through the wheel, in wheel coordinates: from cell to cell it first
// moves along the radius of the cell it leaves to the next ring, then along that
// ring's arc, so that it reads as stairs and corridors. lift keeps routes apart.
// pts is the line; stops are the places it visits, and at the index in pts at
// which it reaches each.
export function routeOf(places, lift = 0.1) {
  const pts = [];
  const stops = [];
  const at = [];
  let last = null;
  for (const place of places) {
    const p = placeOf(place);
    if (last && Math.abs(p.r - last.r) < 1e-6 && Math.abs(wrap(p.a - last.a)) < 1e-6) continue;
    if (last) {
      if (Math.abs(p.r - last.r) > 1e-6) pts.push(polar(p.r, last.a, lift));
      const da = wrap(p.a - last.a);
      const n = Math.ceil(Math.abs(da) / 0.05);
      for (let k = 1; k <= n; k++) pts.push(polar(p.r, last.a + (da * k) / n, lift));
    } else pts.push(polar(p.r, p.a, lift));
    stops.push(polar(p.r, p.a, lift));
    at.push(pts.length - 1);
    last = p;
  }
  return { pts, stops, at };
}

// The stop each place of a route is read at: a place in the same spot as the
// one before it shares its stop, as routeOf joins them.
export function stopIndex(places) {
  const out = [];
  places.forEach((pl, i) => {
    const p = placeOf(pl);
    const q = i ? placeOf(places[i - 1]) : null;
    out.push(i === 0 ? 0 : out[i - 1] + (Math.abs(p.r - q.r) < 1e-6 && Math.abs(wrap(p.a - q.a)) < 1e-6 ? 0 : 1));
  });
  return out;
}

// A cell's hatching, for a model that holds it still (ontology.js): strokes
// across its floor at 45 degrees, as a drawing hatches a section
export function hatchOf(c, step = 0.12) {
  const r0 = inner(c.ring) + 0.05;
  const r1 = inner(c.ring) + RING - 0.05;
  const a0 = c.sector * SECTOR + 0.02;
  const rm = (r0 + r1) / 2;
  // in (radius, arc length at the middle radius); a stroke climbs one for one
  const L = (SECTOR - 0.04) * rm;
  const d = r1 - r0;
  const segs = [];
  for (let s = -d + step / 2; s < L; s += step) {
    const u0 = Math.max(0, -s / d);
    const u1 = Math.min(1, (L - s) / d);
    let prev = null;
    for (let k = 0; k <= 6; k++) {
      const u = u0 + ((u1 - u0) * k) / 6;
      const q = polar(r0 + d * u, a0 + (s + d * u) / rm, 0.004);
      if (prev) segs.push([prev, q]);
      prev = q;
    }
  }
  return segs;
}

// ---------- population ----------

// Each dot stands for a fixed number of agents, as an Isotype symbol does.
// People: Korea in 2025, 51.685 million, of whom 28.769 million employed (ECOS,
// data/korea-growth.json), one dot for every 10,000. Firms: sizes follow Zipf's
// law, as US firm sizes do (Axtell 2001). The other counts are illustrative.
export const PER_DOT = 10000;
// disposable income per household a month, by fifth, thousand won (KOSIS,
// Household Income and Expenditure Survey, 2025: data/korea-households.json)
export const QUINTILE_INCOME = [1031.4, 2427.9, 3612.8, 5184.1, 8967.1];
const PEOPLE = Math.round(51.685e6 / PER_DOT);
const WORKERS = Math.round(28.769e6 / PER_DOT);
const FIRMS = 600;
export const BANKS = 10;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a point spread evenly over a cell's floor, kept off its edges
function inCell(c, rand, pad = 0.06) {
  const r0 = inner(c.ring) + pad;
  const r1 = inner(c.ring) + RING - pad;
  const r = Math.sqrt(r0 * r0 + (r1 * r1 - r0 * r0) * rand());
  const m = pad / r / SECTOR;
  return polar(r, (c.sector + m + (1 - 2 * m) * rand()) * SECTOR, 0.002);
}

// Groups of dots, each in its cell: { name, cell, c, size, pts: [[x, y, z, s]] }.
export function population() {
  const rand = rng(7);
  const g = (name, cell, c, size, n, scale = () => 1) => ({ name, cell: BY[cell], c, size, pts: Array.from({ length: n }, (_, i) => [...inCell(BY[cell], rand), scale(i)]) });
  const people = g('people', 'Households', 'cobalt', 2.2, PEOPLE);
  // the employed are the first WORKERS of them; they send work to firms
  people.workers = WORKERS;
  // firms by rank, the largest first: their sizes, and so their shares of what
  // flows to and from firms, follow Zipf's law, a share proportional to 1/rank
  const firms = g('firms', 'Firms', 'madder', 2.4, FIRMS, (i) => 0.8 + 3.2 / Math.sqrt(i + 1));
  firms.weights = firms.pts.map((_, i) => 1 / (i + 1));
  // the largest stands where it is in sight beside the page when the Firms
  // cell is read (figures 3.1 and Part 2's 2.3, which stops it)
  const [A, B] = [firms.pts[0], firms.pts[66]];
  for (let k = 0; k < 3; k++) [A[k], B[k]] = [B[k], A[k]];
  // the sizes a model may draw them at (ontology.js): alike, each at its
  // group's mean, as a representative agent stands for all; or unlike,
  // households too, each in a fifth by income, its area in proportion to
  // that fifth's disposable income (Korea 2025, data/korea-households.json)
  for (const x of [people, firms]) {
    x.base = x.pts.map((p) => p[3]);
    const mean = x.base.reduce((a, v) => a + v, 0) / x.base.length;
    x.alike = x.base.map(() => mean);
    x.unlike = x.base;
  }
  const spread = rng(19);
  const avg = QUINTILE_INCOME.reduce((a, v) => a + v, 0) / 5;
  people.unlike = people.pts.map((_, i) => Math.sqrt(QUINTILE_INCOME[i % 5] / avg) * (0.9 + 0.2 * spread()));
  return [
    people,
    firms,
    g('banks', 'Banks', 'ochre', 7, BANKS),
    g('central bank', 'Central banks', 'white', 12, 1),
    g('other countries', 'Other countries', 'chalk', 6, 9),
    g('governments', 'Governments', 'olive', 12, 1),
  ];
}

// Ties between particular agents, for a model that drops the assumption that
// anyone trades with anyone (ontology.js, A2). Illustrative: 160 households
// each buy from and work for two firms, picked by size; each of the 80
// largest firms buys from two larger ones; each bank owes the next and lends
// to three firms. adj['people>firms'] lists, for each tied agent, those it is
// tied to; segs draws the ties of each kind: households to firms, firms to
// firms, and banks.
export function ties(groups, seed = 5) {
  const rand = rng(seed);
  const G = Object.fromEntries(groups.map((x) => [x.name, x]));
  const cumF = [];
  G.firms.weights.reduce((a, w, i) => (cumF[i] = a + w), 0);
  const firm = () => {
    const u = rand() * cumF[cumF.length - 1];
    let lo = 0;
    let hi = cumF.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cumF[m] < u) lo = m + 1; else hi = m; }
    return lo;
  };
  const adj = {};
  const segs = { households: [], firms: [], banks: [] };
  const tie = (a, i, b, j) => {
    for (const [x, k, y, l] of [[a, i, b, j], [b, j, a, i]]) {
      const m = (adj[`${x}>${y}`] ??= new Map());
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(l);
    }
    const kind = a === 'people' ? 'households' : a === 'banks' ? 'banks' : 'firms';
    segs[kind].push([G[a].pts[i].slice(0, 3), G[b].pts[j].slice(0, 3)]);
  };
  for (let i = 0; i < 160; i++) for (let k = 0; k < 2; k++) tie('people', i, 'firms', firm());
  for (let j = 1; j < 80; j++) for (let k = 0; k < 2; k++) tie('firms', j, 'firms', Math.floor(rand() * j));
  for (let b = 0; b < BANKS; b++) {
    tie('banks', b, 'banks', (b + 1) % BANKS);
    for (let k = 0; k < 3; k++) tie('banks', b, 'firms', firm());
  }
  return { adj, segs };
}

// What the agents send one another, by route: from a group, through a cell, to
// a group (or to rest in the cell). money: whether it is money (the other way
// round from goods and work). rate: parcels a second, illustrative.
export const FLOWS = [
  { name: 'spending', from: 'people', via: 'Goods', to: 'firms', money: true, rate: 4.5 },
  { name: 'goods', from: 'firms', via: 'Goods', to: 'people', money: false, rate: 4.5 },
  { name: 'work', from: 'people', via: 'Labor', to: 'firms', money: false, rate: 3.5, workers: true },
  { name: 'wages', from: 'firms', via: 'Labor', to: 'people', money: true, rate: 3.5, workers: true },
  { name: 'saving', from: 'people', via: 'Money', to: 'banks', money: true, rate: 1.2 },
  { name: 'lending', from: 'banks', via: 'Capital', to: 'firms', money: true, rate: 1.5 },
  { name: 'household taxes', from: 'people', via: 'Taxes', to: 'governments', money: true, rate: 1.2 },
  { name: 'firm taxes', from: 'firms', via: 'Taxes', to: 'governments', money: true, rate: 0.8 },
  { name: 'government purchases', from: 'governments', via: 'Goods', to: 'firms', money: true, rate: 1.8 },
  { name: 'reserves', from: 'central bank', via: 'Money', to: 'banks', money: true, rate: 0.5 },
  { name: 'exports', from: 'firms', via: 'Foreign exchange', to: 'other countries', money: false, rate: 1.2 },
  { name: 'export payments', from: 'other countries', via: 'Foreign exchange', to: 'firms', money: true, rate: 1.2 },
  { name: 'emissions', from: 'firms', via: 'Land and air', to: null, money: false, rate: 0.8 },
];
export const TRIP = 3.4;

// The wheel is built as the reader goes (docs/engine.md): a cell, a group of
// agents or a route appears in a beat of a story, and until then the cell is an
// outline and the route carries nothing. A build is { base, stories, events }:
// base is built from the start; stories are told at a heading of the page
// (at: a selector), each beat adding { cells, groups, flows }; events add to a
// beat of a figure's own story (fid, beat).
const ALL = { cells: CELLS.map((c) => c.name), groups: ['people', 'firms', 'banks', 'central bank', 'other countries', 'governments'], flows: FLOWS.map((f) => f.name) };

// Part 1: each stage adds to the wheel what it adds to the economy, the list
// under its heading (buyers, sellers, one market; the household; …)
export const BUILD_P1 = {
  stories: [
    { at: '#s1 h2', beats: [
      { say: 'Under the page lies the economy this part builds, one stage at a time: Frank Knight’s wheel of wealth (1933). For now it is an outline of 24 empty cells.' },
      { say: 'Stage 1 needs one cell, the goods market, where buyers and sellers meet at a price. Nobody in it has a name yet.', add: { cells: ['Goods'] } },
      { say: 'And one rule beside it: a tax, for Figure 1.2.', add: { cells: ['Taxes'] } },
    ] },
    { at: '#s2 h2', beats: [
      { say: 'Stage 2 opens up the household. The wheel so far: one market and one tax.' },
      { say: 'Households arrive on the rim. Each dot is 10,000 Koreans: 5,169 dots for the 51.7 million people of 2025.', add: { cells: ['Households'], groups: ['people'] } },
      { say: 'Each chooses by one rule, the best it can afford: optimization, at the hub.', add: { cells: ['Optimization'] } },
      { say: 'They spend in the goods market. Follow one parcel of money: it leaves a household and stops in the market, because nobody sells there yet.', add: { flows: ['spending'] }, dur: 1.4 },
    ] },
    { at: '#s3 h2', beats: [
      { say: 'Stage 3 opens up the firm.' },
      { say: 'Firms arrive: 600 of them, sized by Zipf’s law, a few large and many small.', add: { cells: ['Firms'], groups: ['firms'] } },
      { say: 'Now the money reaches the firms, and goods travel the other way, from a firm through the market to a household.', add: { flows: ['goods'] }, dur: 1.4 },
    ] },
    { at: '#s4 h2', beats: [
      { say: 'Stage 4 lets a few firms watch one another.' },
      { say: 'Nothing new flows. What changes is how firms choose: strategy, at the hub.', add: { cells: ['Strategy'] } },
    ] },
    { at: '#s5 h2', beats: [
      { say: 'Stage 5 joins every market at once.' },
      { say: 'The labor market joins. The 2,877 dots that stand for the employed send their work to firms.', add: { cells: ['Labor'], flows: ['work'] }, dur: 1.4 },
      { say: 'Wages come back the other way. The wheel is closed: money runs one way round, goods and work the other.', add: { flows: ['wages'] }, dur: 1.4 },
      { say: 'Equilibrium, at the hub, is the claim that all of it clears together. Contracts, among the rules, is where hidden information enters.', add: { cells: ['Equilibrium', 'Contracts'] } },
    ] },
    { at: '#s6 h2', beats: [
      { say: 'Stage 6 adds time, money and government. This is the wheel built so far.' },
      { say: 'Time and money: the capital market, where saving becomes investment, and money itself.', add: { cells: ['Capital', 'Money'] } },
      { say: 'The government arrives. It takes taxes from households and firms, and buys from firms.', add: { cells: ['Governments'], groups: ['governments'], flows: ['household taxes', 'firm taxes', 'government purchases'] }, dur: 1.4 },
      { say: 'And the central bank, with the rules it sets for money.', add: { cells: ['Central banks', 'Policy rules'], groups: ['central bank'] } },
    ] },
    { at: '#s7 h2', beats: [
      { say: 'Stage 7 learns to measure.' },
      { say: 'Measurement, at the hub: the data come from this wheel, and the question is what they can identify.', add: { cells: ['Measurement'] } },
    ] },
    { at: '#s8 h2', beats: [
      { say: 'Each field course adds one thing to the wheel.' },
      { say: 'A second economy: other countries, and the foreign-exchange market through which exports and their payments pass.', add: { cells: ['Other countries', 'Foreign exchange'], groups: ['other countries'], flows: ['exports', 'export payments'] }, dur: 1.4 },
      { say: 'Money and risk: banks take households’ saving and lend it to firms through the capital market, with reserves from the central bank.', add: { cells: ['Banks'], groups: ['banks'], flows: ['saving', 'lending', 'reserves'] }, dur: 1.4 },
      { say: 'Missing markets and the state: land and air, where emissions go with no price, and the rules of regulation and property.', add: { cells: ['Land and air', 'Regulation', 'Property'], flows: ['emissions'] }, dur: 1.4 },
      { say: 'And the long run: history, at the hub. Two cells stay empty; Part 2 builds them.', add: { cells: ['History'] } },
    ] },
  ],
};

// The whole wheel, built from the start (a course page)
export const BUILD_ALL = { base: ALL };

// Part 2 starts from the wheel Part 1 built; it adds the two cells left empty.
// Its two halves each open with a story: the agents unlike one another
// (section 1) and connected to particular others (section 4).
export const BUILD_P2 = {
  base: { ...ALL, cells: ALL.cells.filter((n) => n !== 'Networks' && n !== 'Computation') },
  stories: [
    { at: '#b1 h2', beats: [
      { say: 'This is the wheel Part 1 built. In it every household of a kind is alike, one firm stands for all, and nobody is tied to anybody in particular.' },
      { say: 'The first half of this part undoes the first of these. One firm does not stand for all firms, one household for all households, or one way of reasoning for every player.', cam: { el: 0.12 } },
    ] },
    { at: '#b4 h2', beats: [
      { say: 'The second half undoes the other: who can reach whom.' },
      { say: 'Part 1 had no cell for it. Networks joins the rules.', add: { cells: ['Networks'] } },
    ] },
    { at: '#b8 h2', beats: [
      { say: 'The projects that rebuild the textbook.' },
      { say: 'Several make the models run as code: computation, the last cell, at the hub.', add: { cells: ['Computation'] } },
    ] },
  ],
};

// Part 3: the plan's story builds the wheel ring by ring, from the rim in to
// the methods at the hub
const ringCells = (...rings) => CELLS.filter((c) => rings.includes(c.ring)).map((c) => c.name);
const viaRings = (...rings) => FLOWS.filter((f) => rings.includes(BY[f.via].ring)).map((f) => f.name);
export const BUILD_P3 = {
  events: [
    { fid: '3.1', beat: 1, add: { cells: ringCells(3), groups: ALL.groups } },
    { fid: '3.1', beat: 2, add: { cells: ringCells(2), flows: viaRings(2) } },
    { fid: '3.1', beat: 3, add: { cells: ringCells(1), flows: viaRings(1) } },
    { fid: '3.1', beat: 4, add: { cells: ringCells(0) } },
  ],
};

// Parcels in flight. step(dt) moves them and starts new ones; points() gives
// the money and the goods as two lists of wheel points.
export function circulation(groups, seed = 11) {
  const rand = rng(seed);
  const G = Object.fromEntries(groups.map((x) => [x.name, x]));
  const live = [];
  const due = FLOWS.map(() => rand());
  // a route that is built carries one parcel alone first, for a trip, then
  // its flow
  const on = FLOWS.map(() => false);
  const hold = FLOWS.map(() => 0);
  const still = FLOWS.map(() => false);
  // an agent is picked in proportion to its weight (a firm, to its size), and
  // never while it is out
  let out = {};
  const cum = Object.fromEntries(groups.map((x) => {
    const c = [];
    x.pts.reduce((s, _, i) => (c[i] = s + (x.weights?.[i] ?? 1)), 0);
    return [x.name, c];
  }));
  const pick = (grp, f) => {
    if (!grp) return null;
    const c = cum[grp.name];
    const n = f.workers && grp.workers ? grp.workers : grp.pts.length;
    for (let tries = 0; tries < 8; tries++) {
      const u = rand() * c[n - 1];
      let lo = 0;
      let hi = n - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < u) lo = m + 1; else hi = m; }
      if (!out[grp.name]?.has(lo)) return grp.pts[lo];
    }
    return null;
  };
  // a route whose receiving group is not built yet ends in its cell. With
  // ties, a parcel goes from a tied agent straight to one it is tied to.
  let tied = null;
  function start(f, has, lead = false, i = FLOWS.indexOf(f)) {
    const T = tied?.[`${f.from}>${f.to}`];
    if (T && has(f.to)) {
      const keys = [...T.keys()];
      const k = keys[Math.floor(rand() * keys.length)];
      const nb = T.get(k);
      const l = nb[Math.floor(rand() * nb.length)];
      if (out[f.from]?.has(k) || out[f.to]?.has(l)) return;
      const a = G[f.from].pts[k];
      const b = G[f.to].pts[l];
      const v = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
      live.push({ a, v, b, t: 0, fi: i, lead, money: f.money, lift: lead ? 0.16 : 0.05 + 0.03 * rand() });
      return;
    }
    const a = pick(G[f.from], f);
    const v = inCell(BY[f.via], rand, 0.15);
    const b = f.to && has(f.to) ? pick(G[f.to], f) : inCell(BY[f.via], rand, 0.1);
    if (!a || !b) return;
    live.push({ a, v, b, t: 0, fi: i, lead, money: f.money, lift: lead ? 0.16 : f.money ? 0.09 + 0.05 * rand() : 0.04 + 0.03 * rand() });
  }
  // the share of a group's weight still working
  const share = (name) => {
    const x = G[name];
    if (!x || !out[name]?.size) return 1;
    const c = cum[name];
    let lost = 0;
    for (const i of out[name]) lost += x.weights?.[i] ?? 1;
    return 1 - lost / c[c.length - 1];
  };
  return {
    share,
    // gone: { group: Set of agents that are out }, whose share of each route
    // stops with them; built(f): whether a route is built; has(group):
    // whether a group is; given(f): a route built from the start, which needs
    // no parcel to introduce it. A model (ontology.js) may hold a route still,
    // frozen(f): its parcels stop where they are, and none set out; and it may
    // tie agents to particular others (ties, above).
    step(dt, { gone = {}, built = () => true, has = () => true, given = () => false, frozen = () => false, links = null } = {}) {
      out = gone;
      tied = links;
      FLOWS.forEach((f, i) => {
        if (!built(f)) {
          if (on[i]) for (let k = live.length - 1; k >= 0; k--) if (live[k].fi === i) live.splice(k, 1);
          on[i] = false;
          still[i] = false;
          return;
        }
        if (!on[i]) {
          on[i] = true;
          if (!given(f)) {
            hold[i] = TRIP;
            start(f, has, true);
          }
        }
        // a route held still shows parcels stopped on it, a few at least
        const fz = frozen(f);
        if (fz && !still[i]) {
          const n = live.filter((p) => p.fi === i).length;
          for (let k = n; k < 5; k++) {
            start(f, has);
            if (live[live.length - 1]?.fi === i) live[live.length - 1].t = 0.1 + 0.8 * rand();
          }
        }
        still[i] = fz;
        if (fz) return;
        if (hold[i] > 0) {
          hold[i] -= dt;
          return;
        }
        const open = share(f.from) * (f.to ? share(f.to) : 1);
        due[i] += f.rate * open * dt;
        while (due[i] >= 1) {
          due[i] -= 1;
          start(f, has);
        }
      });
      for (const p of live) if (!still[p.fi]) p.t += dt / TRIP;
      for (let i = live.length - 1; i >= 0; i--) if (live[i].t >= 1) live.splice(i, 1);
    },
    // where each parcel is, and a short trail behind it that shows which way
    // it is going: money and goods as two lists of points and of segments. A
    // lead parcel is larger, with a longer trail.
    points() {
      const money = { pts: [], trail: [] };
      const goods = { pts: [], trail: [] };
      const pos = (p, t, a) => {
        // in to the market over the first half, out over the second, each leg an arc
        const h = t < 0.5 ? t * 2 : t * 2 - 1;
        const [P, Q] = t < 0.5 ? [p.a, p.v] : [p.v, p.b];
        return [P[0] + (Q[0] - P[0]) * h, 4 * p.lift * h * (1 - h), P[2] + (Q[2] - P[2]) * h, a];
      };
      for (const p of live) {
        const to = p.money ? money : goods;
        const head = pos(p, p.t, p.lead ? 2.6 : 1);
        to.pts.push(head);
        if (!p.lead) {
          to.trail.push([pos(p, Math.max(0, p.t - 0.07), 0), head]);
          continue;
        }
        let prev = pos(p, Math.max(0, p.t - 0.3), 0);
        for (let k = 1; k <= 8; k++) {
          const q = pos(p, Math.max(0, p.t - 0.3 * (1 - k / 8)), k / 8);
          to.trail.push([prev, q]);
          prev = q;
        }
      }
      return { money, goods };
    },
    // with reduced motion: each route as a still line through its cells
    lines() {
      return FLOWS.map((f) => {
        const a = G[f.from] ? cellCentre(G[f.from].cell) : null;
        const v = cellCentre(BY[f.via]);
        const b = f.to ? cellCentre(G[f.to].cell) : v;
        return { f, segs: a ? [[a, v], [v, b]] : [] };
      });
    },
  };
}

// Spots for a crowd beside the page, relative to the reading point (x across,
// z toward the reader): two strips clear of the page, filled in rows from just
// in front of the reading point to the back. An item with side 'left' or
// 'right' keeps to that strip; others alternate.
export function crowdSpots(items) {
  const x0 = 0.72;
  const x1 = 0.94;
  const z0 = -2.1;
  const z1 = 0.5;
  const sides = items.map((it, i) => it.side ?? (i % 2 ? 'right' : 'left'));
  const count = { left: 0, right: 0 };
  for (const s of sides) count[s]++;
  // a small crowd stands in two files, a large one in four
  const per = Math.max(count.left, count.right, 1);
  const cols = per <= 12 ? 2 : 4;
  const dx = (x1 - x0) / cols;
  const dz = Math.min(0.12, (z1 - z0) / Math.ceil(per / cols));
  const next = { left: 0, right: 0 };
  return sides.map((s, i) => {
    const j = next[s]++;
    const jit = (k) => (Math.abs(Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453) % 1) - 0.5;
    const x = x0 + ((j % cols) + 0.5 + 0.35 * jit(1)) * dx;
    const z = z1 - (Math.floor(j / cols) + 0.5 + 0.35 * jit(2)) * dz;
    return [s === 'left' ? -x : x, z];
  });
}
