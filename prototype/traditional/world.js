// The world (docs/world.md): the archive building of Part 3, which the folded
// page passes through. Its rooms are the plan's LAYERS, floor by floor; PLACE
// says which room each figure rises in, or which two rooms it stands between.
//
// Building coordinates: room (col, floor) spans x in [col, col + 1]·RW,
// y in [floor, floor + 1]·FH and z in [−RD/2, RD/2]. The building moves; the
// page stays where the fold puts it, lying on the floor of the room it is in.

import { LAYERS } from './p3-figs.js';

export const RW = 2.0;
export const RD = 3.6;
export const FH = 1.4;
// the reading point stands this far in front of the room's centre
const ZR = 0.4;
const GRID = 0.25;

export const ROOMS = LAYERS.flatMap((layer, floor) => layer.rooms.map(([name, href, asset], col) => ({ name, href, asset, floor, col, layer: layer.name, c: layer.c })));
const BY = Object.fromEntries(ROOMS.map((r) => [r.name, r]));

// Part 1: a room, or [room, room] for a figure that spans two (keys are strings:
// 8.10 is not 8.1). A pair must share
// a wall (same floor, next to each other) or a floor (same column, one above
// the other).
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

// Where a place sits, in building coordinates: the point that is brought to the
// reading point. A room: its centre, on its floor. A wall: the middle of the
// shared wall. A floor between two rooms: the upper room's floor, so the page
// lies on the boundary with the lower room beneath it.
export function placeOf(place) {
  const names = Array.isArray(place) ? place : [place];
  const rooms = names.map((n) => BY[n]);
  if (rooms.some((r) => !r)) throw new Error(`unknown room in ${names.join(', ')}`);
  const [a, b] = rooms;
  if (!b) return { rooms, kind: 'room', at: [(a.col + 0.5) * RW, a.floor * FH, ZR] };
  if (a.floor === b.floor && Math.abs(a.col - b.col) === 1) return { rooms, kind: 'wall', at: [Math.max(a.col, b.col) * RW, a.floor * FH, ZR] };
  if (a.col === b.col && Math.abs(a.floor - b.floor) === 1) return { rooms, kind: 'floor', at: [(a.col + 0.5) * RW, Math.max(a.floor, b.floor) * FH, ZR] };
  throw new Error(`${names.join(' and ')} share no wall or floor`);
}

// Edges and the floor plate of one room, in building coordinates.
export function roomGeometry(r) {
  const x0 = r.col * RW;
  const x1 = x0 + RW;
  const y0 = r.floor * FH;
  const y1 = y0 + FH;
  const z0 = -RD / 2;
  const z1 = RD / 2;
  const rect = (y) => [[[x0, y, z0], [x1, y, z0]], [[x1, y, z0], [x1, y, z1]], [[x1, y, z1], [x0, y, z1]], [[x0, y, z1], [x0, y, z0]]];
  const posts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [[x, y0, z], [x, y1, z]]);
  const inset = 0.03;
  // a drafting grid on the floor, every GRID
  const grid = [];
  for (let x = x0 + GRID; x < x1 - 1e-6; x += GRID) grid.push([[x, y0 + 0.002, z0], [x, y0 + 0.002, z1]]);
  for (let z = z0 + GRID; z < z1 - 1e-6; z += GRID) grid.push([[x0, y0 + 0.002, z], [x1, y0 + 0.002, z]]);
  return {
    edges: [...rect(y0), ...rect(y1), ...posts],
    grid,
    plate: [[x0 + inset, y0 - 0.004, z1 - inset], [x1 - inset, y0 - 0.004, z1 - inset], [x1 - inset, y0 - 0.004, z0 + inset], [x0 + inset, y0 - 0.004, z0 + inset]],
    // the sign stands in the back right corner, clear of the page; a room
    // below the page hangs its sign from the ceiling, under the shared floor
    sign: [x1 - 0.06, y0 + 0.01, z0 + 0.25],
    hang: [x1 - 0.06, y1 - 0.01, z0 + 0.25],
    // the back left corner, for when the page covers the right one
    signL: [x0 + 0.06, y0 + 0.01, z0 + 0.25],
    hangL: [x0 + 0.06, y1 - 0.01, z0 + 0.25],
  };
}

// The building's position along the route. stops: [{ c, place }] by page
// position c (px). The building holds still while a figure is near the reading
// line (HOLD px either side, at most a quarter of the gap) and moves through
// the rest of the gap to the next figure's place. travel is the distance still
// being covered, largest halfway (fold.js steps the camera back by it).
const HOLD = 400;
export function routeAt(stops, focus, ease) {
  if (!stops.length) return null;
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].c <= focus) i++;
  const A = stops[i];
  const B = stops[Math.min(i + 1, stops.length - 1)];
  if (focus <= A.c || A === B) return { at: A.p.at, weights: weightsOf(A.p, 1), u: 0, s: 0, travel: 0 };
  const gap = B.c - A.c;
  const hold = Math.min(HOLD, 0.25 * gap);
  const s = clamp01((focus - A.c - hold) / (gap - 2 * hold));
  const u = ease(s);
  const at = A.p.at.map((v, k) => v + (B.p.at[k] - v) * u);
  const weights = weightsOf(A.p, 1 - u);
  for (const [n, w] of weightsOf(B.p, u)) weights.set(n, Math.max(weights.get(n) ?? 0, w));
  const d = Math.hypot(...A.p.at.map((v, k) => v - B.p.at[k]));
  return { at, weights, u, s, travel: d * Math.sin(Math.PI * s) };
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

function weightsOf(p, w) {
  return new Map(p.rooms.map((r) => [r.name, w]));
}
