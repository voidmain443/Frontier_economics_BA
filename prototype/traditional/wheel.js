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
// the chains of 2.2, which start from 2.1, are read in Networks.
export const PLACE_P2 = { '2.1': 'Goods', '2.2': 'Networks', '2.3': 'Firms', '2.4': 'Strategy', '2.5': 'Banks' };

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
// Part 2 section (beyond.html#b3).
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
// pts is the line; stops are the places it visits.
export function routeOf(places, lift = 0.1) {
  const pts = [];
  const stops = [];
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
    last = p;
  }
  return { pts, stops };
}

// ---------- population ----------

// Each dot stands for a fixed number of agents, as an Isotype symbol does.
// People: Korea in 2025, 51.685 million, of whom 28.769 million employed (ECOS,
// data/korea-growth.json), one dot for every 10,000. Firms: sizes follow Zipf's
// law, as US firm sizes do (Axtell 2001). The other counts are illustrative.
export const PER_DOT = 10000;
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
  return [
    people,
    g('firms', 'Firms', 'madder', 2.4, FIRMS, (i) => 0.8 + 3.2 / Math.sqrt(i + 1)),
    g('banks', 'Banks', 'ochre', 7, BANKS),
    g('central bank', 'Central banks', 'white', 12, 1),
    g('other countries', 'Other countries', 'chalk', 6, 9),
    g('governments', 'Governments', 'olive', 12, 1),
  ];
}

// What the agents send one another, by route: from a group, through a cell, to
// a group (or to rest in the cell). money: whether it is money (the other way
// round from goods and work). rate: parcels a second, illustrative.
export const FLOWS = [
  { from: 'people', via: 'Goods', to: 'firms', money: true, rate: 9 },
  { from: 'firms', via: 'Goods', to: 'people', money: false, rate: 9 },
  { from: 'people', via: 'Labor', to: 'firms', money: false, rate: 7, workers: true },
  { from: 'firms', via: 'Labor', to: 'people', money: true, rate: 7, workers: true },
  { from: 'people', via: 'Money', to: 'banks', money: true, rate: 2.5 },
  { from: 'banks', via: 'Capital', to: 'firms', money: true, rate: 3 },
  { from: 'people', via: 'Taxes', to: 'governments', money: true, rate: 2.5 },
  { from: 'firms', via: 'Taxes', to: 'governments', money: true, rate: 1.5 },
  { from: 'governments', via: 'Goods', to: 'firms', money: true, rate: 3.5 },
  { from: 'central bank', via: 'Money', to: 'banks', money: true, rate: 1 },
  { from: 'firms', via: 'Foreign exchange', to: 'other countries', money: false, rate: 2.5 },
  { from: 'other countries', via: 'Foreign exchange', to: 'firms', money: true, rate: 2.5 },
  { from: 'firms', via: 'Land and air', to: null, money: false, rate: 1.5 },
];
export const TRIP = 3.4;

// Parcels in flight. step(dt) moves them and starts new ones; points() gives
// the money and the goods as two lists of wheel points.
export function circulation(groups, seed = 11) {
  const rand = rng(seed);
  const G = Object.fromEntries(groups.map((x) => [x.name, x]));
  const live = [];
  const due = FLOWS.map(() => rand());
  const pick = (grp, f) => {
    if (!grp) return null;
    const n = f.workers && grp.workers ? grp.workers : grp.pts.length;
    return grp.pts[Math.floor(rand() * n)];
  };
  function start(f) {
    const a = pick(G[f.from], f);
    const v = inCell(BY[f.via], rand, 0.15);
    const b = f.to ? pick(G[f.to], f) : inCell(BY[f.via], rand, 0.1);
    if (!a || !b) return;
    live.push({ a, v, b, t: 0, money: f.money, lift: f.money ? 0.09 + 0.05 * rand() : 0.04 + 0.03 * rand() });
  }
  return {
    step(dt, k = 1) {
      FLOWS.forEach((f, i) => {
        due[i] += f.rate * k * dt;
        while (due[i] >= 1) {
          due[i] -= 1;
          start(f);
        }
      });
      for (const p of live) p.t += dt / TRIP;
      for (let i = live.length - 1; i >= 0; i--) if (live[i].t >= 1) live.splice(i, 1);
    },
    // where each parcel is, and a short trail behind it that shows which way
    // it is going: money and goods as two lists of points and of segments
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
        const head = pos(p, p.t, 1);
        to.pts.push(head);
        to.trail.push([pos(p, Math.max(0, p.t - 0.07), 0), head]);
      }
      return { money, goods };
    },
    // with reduced motion: each route once, as a still line through its cells
    lines() {
      const money = [];
      const goods = [];
      for (const f of FLOWS) {
        const a = G[f.from] ? cellCentre(G[f.from].cell) : null;
        const v = cellCentre(BY[f.via]);
        const b = f.to ? cellCentre(G[f.to].cell) : v;
        if (!a) continue;
        (f.money ? money : goods).push([a, v], [v, b]);
      }
      return { money, goods };
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
