// Part 1, folded: for each figure, the axis its caption names as held fixed,
// raised out of the paper. Coordinates are the figure's own data units (the same
// ranges as p1-figs.js) plus a height h in plot widths. Seen from straight above,
// every construct lands on the flat drawing: the figure is its shadow.

import { doubleAuction, efficiency, rng } from './market.js';

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const line = (pts, c = 'white', w = 2, o = {}) => ({ pts, c, w, ...o });
const fnLine = (f, a, b, c, w, o, n = 90) => line(range(a, b, n).map(f), c, w, o);
// a vertical post from the page up to h
const post = (x, y, h, c = 'chalk', o = {}) => line([[x, y, 0], [x, y, h]], c, 1.2, { o: 0.7, dash: true, ...o });
// a horizontal rectangle at height h, and a column standing on a footprint
const flat = (x0, y0, x1, y1, h, c, alpha = 0.22, o = {}) => ({ q: [[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], c, alpha, ...o });
function column(out, x0, x1, y, dy, h, c, alpha = 0.35, o = {}) {
  const y0 = y - dy;
  const y1 = y + dy;
  out.quads.push(flat(x0, y0, x1, y1, h, c, alpha, o));
  out.quads.push({ q: [[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]], c, alpha: alpha * 0.8, ...o });
  out.quads.push({ q: [[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]], c, alpha: alpha * 0.6, edge: false, ...o });
}
// keep a polyline inside a y range by dropping points outside it
const clipY = (pts, y0, y1) => pts.map((p) => (p[1] >= y0 - 1e-9 && p[1] <= y1 + 1e-9 ? p : [NaN, NaN, NaN]));
// dims: a dimension line along the raised axis, { from, to, text }
const blank = () => ({ surfaces: [], quads: [], lines: [], points: [], tags: [], eqs: [], agents: [], dims: [] });
// in a story, the hidden axis comes in and rises as beat 1 begins (fold.js)
const UP = { show: [1], rise: 1 };
const series = (data, file, key) => Object.fromEntries(data?.[file]?.series.find((s) => s.key === key)?.points ?? []);

// Figure 1.1 told as a story (docs/engine.md). 120 buyers stand at (rank,
// value) and 120 sellers at (rank, cost), so together they are the two curves.
// They trade in a double auction, quoting at random but never at a loss
// (market.js); each trade leaves its price at (trades so far, price). Then every
// income rises by a fifth: the same people move up the income axis and trade
// again. Beats: 0 the textbook, 1 buyers, 2 sellers, 3 trading, 4 E, 5 who
// traded with whom, 6 incomes rise, 7 trading again, 8 the surface.
const RHO = 12;
const TRADE = 0.07;
const e01 = (t) => t * t * (3 - 2 * t);
const cl01 = (t) => Math.min(1, Math.max(0, t));
// where a day's trading ended: its quantity, and the price of its last trades
function dayEnd(trades) {
  const tail = trades.slice(-6);
  return [trades.length / RHO, tail.reduce((a, t) => a + t.p, 0) / tail.length];
}
// a dot falling onto its place over its share of a beat, staggered by rank
const drop = (b, i, n) => {
  const d = cl01((b - (0.75 * i) / n) / 0.25);
  return d ? 0.12 * (1 - d * d) : null;
};
function marketStory(hI) {
  const q = Array.from({ length: 10 * RHO }, (_, i) => (i + 0.5) / RHO);
  const costs = q.map((x) => 1 + x);
  // two representative days (seeds chosen near the average efficiency)
  const days = [[1, 56, 2.5], [1.2, 6, 6.5]].map(([I, seed, from]) => {
    const values = q.map((x) => 10 * I - x);
    const trades = doubleAuction({ values, costs, top: 15, seed }).run();
    return { I, h: hI(I), values, trades, from, t: 0, end: dayEnd(trades), eff: efficiency(values, costs, trades) };
  });
  const engine = {
    dots: [
      { c: 'cobaltInk', size: 5, o: 0.45, max: 200 },
      { c: 'madderInk', size: 5, o: 0.45, max: 200 },
      { c: 'cobaltInk', size: 7, o: 1, max: 200 },
      { c: 'madderInk', size: 7, o: 1, max: 200 },
      { c: 'ochreInk', size: 5, o: 1, max: 200 },
      { c: 'white', size: 11, o: 1, max: 4 },
    ],
    segs: [{ c: 'ochreInk', w: 1.4, o: 0.9, max: 32 }, { c: 'cobaltInk', w: 1.1, o: 0.6, max: 900 }],
    step(dt, { grow, reduced, beat }) {
      if (grow < 0.02) {
        for (const d of days) d.t = 0;
        return null;
      }
      const b = beat ?? 8;
      const out = { dots: [[], [], [], [], [], []], segs: [[], []] };
      const I = 1 + 0.2 * e01(cl01(b - 5));
      const h = hI(I);
      // the day on show; its trading starts as beat 3 (or 7) begins and runs
      // in time, faster once the reader has moved on to the next beat
      const D = b < 5.5 ? days[0] : days[1];
      if (b > D.from) D.t += dt * (b > D.from + 1 ? 6 : 1);
      else D.t = 0;
      const n = b <= D.from ? 0 : reduced || b >= D.from + 2 ? D.trades.length : Math.min(D.trades.length, Math.floor(D.t / TRADE));
      // the lights go out while incomes rise
      const lit = b < 5.2 || b > 6.4;
      const fade = D === days[0] ? 1 - cl01((b - 5) * 2) : 1;
      const bought = new Set();
      const sold = new Set();
      for (let k = 0; k < n; k++) {
        const t = D.trades[k];
        if (lit) {
          bought.add(t.i);
          sold.add(t.j);
        }
        const m = [(k + 0.5) / RHO, t.p, D.h, fade];
        if (fade > 0.02) out.dots[4].push(m);
        // the last few trades: buyer and seller meet at the price
        if (!reduced && n < D.trades.length && k >= n - 6) {
          const a = 1 - (n - 1 - k) / 6;
          out.segs[0].push([[q[t.i], D.values[t.i], D.h, a], [m[0], m[1], D.h, a]], [[m[0], m[1], D.h, a], [q[t.j], costs[t.j], D.h, a]]);
        }
      }
      // who traded with whom: an arc from each buyer down to its seller,
      // drawn in the order they traded; its drop is the pair's gain
      const arcs = cl01(b - 4) * (1 - cl01((b - 5) * 2));
      if (arcs > 0.01) {
        const T = days[0].trades;
        const shown = Math.ceil(T.length * Math.min(1, arcs * 1.4));
        for (let k = 0; k < shown; k++) {
          const t = T[k];
          const A = [q[t.i], days[0].values[t.i]];
          const B = [q[t.j], costs[t.j]];
          const top = 0.03 + 0.1 * ((A[1] - B[1]) / 15);
          let prev = null;
          for (let s = 0; s <= 10; s++) {
            const u = s / 10;
            const pt = [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, 4 * top * u * (1 - u), arcs];
            if (prev) out.segs[1].push([prev, pt]);
            prev = pt;
          }
        }
      }
      // the people: buyers fall into place in beat 1, sellers in beat 2
      q.forEach((x, i) => {
        const v = 10 * I - x;
        const db = b >= 1 ? 0 : drop(b, i, q.length);
        if (db != null && v > 0 && v <= 15) out.dots[bought.has(i) ? 2 : 0].push([x, v, h + db, 1]);
        const ds = b >= 2 ? 0 : b < 1 ? null : drop(b - 1, i, q.length);
        if (ds != null) out.dots[sold.has(i) ? 3 : 1].push([x, costs[i], h + ds, 1]);
      });
      // where each day's trading ended: E, then E′
      const e1 = e01(cl01((b - 3.3) / 0.7));
      if (e1 > 0.02) out.dots[5].push([...days[0].end, days[0].h, e1]);
      if (b >= 7.6 || (b > D.from && n === D.trades.length && D === days[1])) out.dots[5].push([...days[1].end, days[1].h, 1]);
      return out;
    },
  };
  return { engine, eff: days[0].eff, end: days[0].end };
}

// Figure 1.3 told as a story: 108 buyers through today's point (5, 5). In the
// first month their values run steeply through it; given time they find
// substitutes, their values draw in toward 5 and the line they make turns flat.
// The box is revenue at the price on show: 25 at 5, then at 5.5 about 27 in the
// first month and 23.4 after five years. Beats: 0 the textbook, 1 the buyers,
// 2 the 10 percent rise, 3 five years pass, 4 the fan of curves.
const RHO3 = 12;
function horizonStory(eps, hs) {
  const q = Array.from({ length: 9 * RHO3 }, (_, i) => (i + 0.5) / RHO3);
  return {
    dots: [
      { c: 'cobaltInk', size: 5, o: 0.45, max: 120 },
      { c: 'cobaltInk', size: 7, o: 1, max: 120 },
    ],
    segs: [{ c: 'ochreInk', w: 2.2, o: 1, max: 4 }],
    step(dt, { grow, beat }) {
      if (grow < 0.02) return null;
      const b = beat ?? 4;
      const s = e01(cl01(b - 2));
      const e = eps(s);
      const h = hs(s);
      const price = b < 1.5 ? 5 : 5.5;
      const out = { dots: [[], []], segs: [[]] };
      q.forEach((x, i) => {
        const v = 5 - (x - 5) / e;
        const d = b >= 1 ? 0 : drop(b, i, q.length);
        if (d == null || v < 0 || v > 12) return;
        out.dots[v >= price ? 1 : 0].push([x, v, h + d, 1]);
      });
      if (b > 0.8) {
        const Q = 5 - e * (price - 5);
        out.segs[0].push([[0, price, h], [Q, price, h]], [[Q, price, h], [Q, 0, h]]);
      }
      return out;
    },
  };
}

// ---------- engines for stages 2 to 5 (docs/engine.md) ----------

// An engine that runs a process once its figure has risen, holds the end, and
// runs it again from a new start: draw(t, n) gives the process t seconds into
// its nth run. In a story it runs from beat from until beat to. With reduced
// motion it shows the end of the first run.
function replaying(span, hold, sets, draw, { from = 0, to = Infinity } = {}) {
  const st = { t: 0, n: 0 };
  const none = { dots: sets.dots.map(() => []), segs: (sets.segs ?? []).map(() => []) };
  return {
    ...sets,
    step(dt, { grow, reduced, beat }) {
      const b = beat ?? Infinity;
      if (grow < 0.02 || b < from - 0.5 || b >= to - 0.5) {
        st.t = 0;
        st.n = 0;
        return grow < 0.02 ? null : none;
      }
      if (grow > 0.7 && !reduced) st.t += dt;
      if (st.t > span + hold) {
        st.t = 0;
        st.n++;
      }
      return draw(reduced ? span : st.t, st.n);
    },
  };
}
const sm = (t) => e01(cl01(t));

// 2.1: twelve households on the same budget fence, each starting somewhere on
// it and moving the way its utility rises. Along x + y = 12 the slope of u² is
// 2(6 − x), so each closes the gap to x = 6 at a rate proportional to it, and
// every one ends on the top of the hill the fence allows.
function climbEngine(k, when) {
  const u = (x) => Math.sqrt(Math.max(0, x * (12 - x)));
  return replaying(4.5, 2.5, { dots: [{ c: 'cobaltInk', size: 7, o: 1, max: 12 }], segs: [{ c: 'cobaltInk', w: 1.4, o: 0.45, max: 200 }] }, (t, n) => {
    const rand = rng(31 + n);
    const dots = [];
    const segs = [];
    for (let i = 0; i < 12; i++) {
      const x0 = 0.4 + 11.2 * rand();
      const x = 6 + (x0 - 6) * Math.exp(-1.2 * t);
      for (let j = 0; j < 12; j++) {
        const a = x0 + ((x - x0) * j) / 12;
        const b = x0 + ((x - x0) * (j + 1)) / 12;
        segs.push([[a, 12 - a, k * u(a), j / 12], [b, 12 - b, k * u(b), (j + 1) / 12]]);
      }
      dots.push([x, 12 - x, k * u(x), 1]);
    }
    return { dots: [dots], segs: [segs] };
  }, when);
}

// 3.2: firms enter one at a time while price is above the minimum of cost; the
// market moves to the next supply curve, each a slice higher, and the price
// falls toward 2. Each new firm drops in beside the others.
function entryEngine(path, when) {
  const STEP = 1.3;
  return replaying(STEP * 4 + 0.6, 2.5, { dots: [{ c: 'white', size: 11, o: 1, max: 1 }, { c: 'olive', size: 9, o: 1, max: 8 }], segs: [{ c: 'white', w: 2.4, o: 0.9, max: 8 }] }, (t) => {
    const i = Math.min(3, Math.floor(t / STEP));
    const f = sm((t - i * STEP) / 0.6);
    const A = path[i];
    const B = path[Math.min(4, i + 1)];
    const at = t >= STEP * 4 ? path[4] : A.map((v, k) => v + (B[k] - v) * f);
    const N = 3 + i + (f > 0.5 && t < STEP * 4 + 0.6 ? 1 : 0);
    const firms = [];
    for (let j = 0; j < N; j++) {
      const late = j >= 3 + i && f < 1 ? 0.06 * (1 - f * f) : 0;
      firms.push([4 + 5 * j, 5.6, at[2] + late, 1]);
    }
    const trail = [];
    for (let j = 0; j < i; j++) trail.push([path[j], path[j + 1]]);
    if (t < STEP * 4) trail.push([A, at]);
    return { dots: [[[...at, 1]], firms], segs: [trail] };
  }, when);
}

// 4.1: the two firms take turns, each choosing the output that maximises its
// own profit with the other's held fixed. A turn climbs that firm's profit hill
// to its ridge (its best response); turn by turn they close in on the Nash point.
function cournotEngine(k, when) {
  const pi = [(a, b) => Math.max(0, (10 - a - b) * a), (a, b) => Math.max(0, (10 - a - b) * b)];
  const TURN = 0.8;
  const TURNS = 8;
  return replaying(TURN * TURNS, 2.5, {
    dots: [{ c: 'white', size: 10, o: 1, max: 1 }],
    segs: [{ c: 'cobalt', w: 2.2, o: 1, max: 120 }, { c: 'madder', w: 2.2, o: 1, max: 120 }],
  }, (t, n) => {
    const rand = rng(53 + n);
    let a = 0.4 + 2 * rand();
    let b = 6 + 3.5 * rand();
    if (n % 2) [a, b] = [b, a];
    const segs = [[], []];
    let h = k * pi[0](a, b);
    for (let m = 0; m < TURNS; m++) {
      const f = sm((t - m * TURN) / TURN);
      if (f <= 0) break;
      const w = m % 2;
      const from = w ? b : a;
      const best = ((10 - (w ? a : b)) / 2) * f + from * (1 - f);
      for (let j = 0; j < 10; j++) {
        const q0 = from + ((best - from) * j) / 10;
        const q1 = from + ((best - from) * (j + 1)) / 10;
        const P = w ? [a, q0] : [q0, b];
        const Q = w ? [a, q1] : [q1, b];
        segs[w].push([[...P, k * pi[w](...P)], [...Q, k * pi[w](...Q)]]);
      }
      if (w) b = best;
      else a = best;
      h = k * pi[w](a, b);
    }
    return { dots: [[[a, b, h, 1]]], segs };
  }, when);
}

// 5.1: barter in the box. From each endowment the two households swap in the
// direction that raises both utilities, the sum of their unit gradients; the
// swapping stops where the gradients point opposite ways, on the contract curve
// x = y. Every path ends on it, each at a different split.
function barterEngine(when) {
  const paths = (n) => {
    const rand = rng(71 + n);
    const starts = [[8, 2], ...Array.from({ length: 4 }, () => { const x = 1 + 8 * rand(); return [x, Math.max(0.5, Math.min(9.5, x + (rand() < 0.5 ? -1 : 1) * (2 + 4 * rand())))]; })];
    return starts.map(([x0, y0]) => {
      let x = x0;
      let y = y0;
      const pts = [[x, y]];
      for (let i = 0; i < 2000; i++) {
        const nA = Math.hypot(y, x) || 1;
        const nB = Math.hypot(10 - y, 10 - x) || 1;
        const dx = y / nA - (10 - y) / nB;
        const dy = x / nA - (10 - x) / nB;
        if (Math.hypot(dx, dy) < 0.0005) break;
        x += 0.03 * dx;
        y += 0.03 * dy;
        if (i % 6 === 5) pts.push([x, y]);
      }
      return pts;
    });
  };
  let cache = null;
  return replaying(3.6, 2.6, { dots: [{ c: 'white', size: 9, o: 1, max: 5 }, { c: 'ochreInk', size: 6, o: 1, max: 5 }], segs: [{ c: 'white', w: 1.8, o: 0.9, max: 1200 }] }, (t, n) => {
    if (cache?.n !== n) cache = { n, P: paths(n) };
    const dots = [];
    const starts = [];
    const segs = [];
    for (const pts of cache.P) {
      const m = Math.max(1, Math.round(pts.length * sm(t / 3.6)));
      for (let i = 1; i < m; i++) segs.push([[...pts[i - 1], 0.01], [...pts[i], 0.01]]);
      starts.push([...pts[0], 0.01, 1]);
      dots.push([...pts[m - 1], 0.01, 1]);
    }
    return { dots: [dots, starts], segs: [segs] };
  }, when);
}

// 5.3: Akerlof's market unravels. Buyers pay what the average car on offer is
// worth to them, p/2 + 3; owners of better cars than that take them off the
// market and they drop back to the ground; the price falls again, 10, 8, 7,
// 6.5 … toward 6.
function lemonsEngine(k, when) {
  const ROUND = 1.2;
  const ROUNDS = 6;
  const theta = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 10);
  return replaying(ROUND * ROUNDS, 2.5, {
    dots: [{ c: 'olive', size: 5.5, o: 1, max: 100 }, { c: 'madder', size: 5, o: 0.6, max: 100 }],
    segs: [{ c: 'ochre', w: 2, o: 1, max: 8 }],
  }, (t) => {
    const r = Math.min(ROUNDS, Math.floor(t / ROUND));
    const f = sm((t - r * ROUND) / 0.6);
    const price = (j) => 6 + 4 / 2 ** j;
    const p = r >= ROUNDS ? price(ROUNDS) : price(r) + (price(r + 1) - price(r)) * (r < ROUNDS ? f : 0);
    const on = [];
    const off = [];
    theta.forEach((th, i) => {
      // a car leaves in the round its quality first exceeds the price
      let left = -1;
      for (let j = 0; j <= r; j++) if (th >= price(j)) { left = j; break; }
      const pt = [i + 0.5, th, th * k, 1];
      if (left < 0 || (left === r && th < p)) on.push(pt);
      else {
        const d = left === r ? f : 1;
        off.push([pt[0], pt[1], pt[2] * (1 - d * d), 1]);
      }
    });
    const h = p * k;
    const box = [[0, 0, h], [100, 0, h], [100, 14, h], [0, 14, h]];
    return { dots: [on, off], segs: [box.map((q, i) => [q, box[(i + 1) % 4]])] };
  }, when);
}

export const CONSTRUCTS = {
  // ===== Stage 1
  '1.1': {
    dom: { x: [0, 10], y: [0, 15] },
    build() {
      const X = blank();
      const hI = (I) => (I - 1) * 0.6;
      const M = marketStory(hI);
      X.surfaces.push({ param: (q, I) => [q, 10 * I - q, hI(I)], u: [0, 10], v: [1, 1.4], c: 'cobalt', alpha: 0.1, freq: 0, show: [6] });
      X.surfaces.push({ param: (q, I) => [q, 1 + q, hI(I)], u: [0, 10], v: [1, 1.4], c: 'madder', alpha: 0.06, freq: 0, n: 12, show: [6] });
      X.lines.push(fnLine((I) => [(10 * I - 1) / 2, (10 * I + 1) / 2, hI(I)], 1, 1.4, 'white', 2.4, { o: 0.8, draw: 8 }, 20));
      X.lines.push(post(10, 0, hI(1.4), 'chalk', { show: [6] }));
      for (const I of [1.1, 1.2, 1.3, 1.4]) X.lines.push(line([[10, 0, hI(I)], [10.3, 0, hI(I)]], 'chalk', 1.2, { show: [6] }));
      X.tags.push(
        { text: 'buyers, by what each would pay', at: [0.2, 10.6, 0], c: 'cobalt', show: [1, 3] },
        { text: 'sellers, by what each unit costs', at: [6.4, 9.2, 0], c: 'madder', show: [2, 3] },
        { text: 'trade prices, in order', at: [0.2, 9.2, 0], c: 'ochre', show: [3, 6] },
        { text: `this day: ${Math.round(M.eff * 100)} percent of the possible gain`, at: [M.end[0] + 0.3, M.end[1] - 0.6, 0], c: 'ochre', show: [4, 5] },
        { text: 'each arc a trade, its drop their gain', at: [0.4, 12.4, 0.06], show: [5, 6] },
        { text: 'income I', at: [10, 0, hI(1.4) + 0.02], show: [6] },
        { text: 'D′, I = 1.2', at: [0.4, 11.6, hI(1.2)], c: 'cobalt', show: [7] },
        { text: 'supply does not move', at: [9.6, 10.6, hI(1.4)], c: 'madder', show: [7] },
      );
      X.eqs.push({ html: 'bid &lt; value, ask &gt; cost', at: [0.5, 14, 0], show: [3, 5] });
      X.dims.push({ from: [10, 0, 0], to: [10, 0, hI(1.4)], text: 'I = 1 … 1.4', show: [6] });
      X.engine = M.engine;
      X.story = [
        { say: 'The textbook draws demand and supply as two lines and calls their crossing E. Where does E come from?' },
        { say: 'A demand curve is a list of people. Here are 120 buyers, each standing at the most it would pay.', cam: { zoom: 0.58, el: 0.5, at: [4.5, 7.5, 0] }, dur: 2.2 },
        { say: 'And 120 sellers, each at what its unit costs to make. The two lines were people all along.', dur: 2 },
        { say: 'Let them trade. Each quotes a price at random, under one rule: never trade at a loss.', cam: { zoom: 0.55, el: 0.5, at: [4, 6.5, 0] } },
        { say: 'Nobody aims at E, yet the prices close in on it. Markets like this realise about 97 percent of the possible gain on average.', cam: { zoom: 0.42, el: 0.45, at: [4.5, 5.8, 0] }, dur: 1.2 },
        { say: 'Each arc joins a buyer to the seller it traded with, and its drop is their gain. Who met whom is chance; the total depends only on who traded.', cam: { az: 0.55, el: 0.3, zoom: 0.6, at: [4, 6, 0.04] }, dur: 1.8 },
        { say: 'Now give every buyer a fifth more income. Each would pay more, and the whole crowd rises along an axis the page does not draw.', cam: { az: 0.3, el: 0.02, zoom: 0.7, at: [5.5, 6.5, 0.12] }, dur: 2 },
        { say: 'They trade again, and the prices find E′. The sellers have not changed: supply does not move.', cam: { az: 0.22, el: 0.04, zoom: 0.62, at: [5.5, 6.5, 0.12] } },
        { say: 'Stack every income and the buyers form a surface. A shift is a move along this hidden axis; <i>ceteris paribus</i> means one slice.', cam: { az: 0.4, el: 0.06, zoom: 0.8, at: [5.5, 7, 0.15] }, dur: 1.6 },
      ];
      return X;
    },
  },

  '1.2': {
    dom: { x: [0, 20], y: [0, 20] },
    build() {
      const X = blank();
      const k = 0.022;
      // without the tax: ten trades at 10, each trader's gain a column
      for (let i = 0; i < 10; i++) {
        column(X, i + 0.2, i + 0.8, 19.5 - i, 0.35, (9.5 - i) * k, 'cobalt', 0.35, { show: [1, 2] });
        column(X, i + 0.2, i + 0.8, 0.5 + i, 0.35, (9.5 - i) * k, 'olive', 0.35, { show: [1, 2] });
        X.agents.push({ asset: 'person', at: [i + 0.5, 19.5 - i, (9.5 - i) * k], scale: 0.022, show: [1, 2] });
        X.agents.push({ asset: 'firm', at: [i + 0.5, 0.5 + i, (9.5 - i) * k], scale: 0.022, show: [1, 2] });
      }
      // with a tax of 6: seven trades, buyers pay 13 and sellers keep 7
      for (let i = 0; i < 7; i++) {
        column(X, i + 0.2, i + 0.8, 19.5 - i, 0.35, (6.5 - i) * k, 'cobalt', 0.35, { show: [2] });
        column(X, i + 0.2, i + 0.8, 0.5 + i, 0.35, (6.5 - i) * k, 'olive', 0.35, { show: [2] });
        column(X, i + 0.2, i + 0.8, 10, 0.35, 6 * k, 'ochre', 0.3, { show: [2] });
        X.agents.push({ asset: 'person', at: [i + 0.5, 19.5 - i, (6.5 - i) * k], scale: 0.022, show: [2] });
        X.agents.push({ asset: 'firm', at: [i + 0.5, 0.5 + i, (6.5 - i) * k], scale: 0.022, show: [2] });
      }
      for (const [i, g] of [[7, 5], [8, 3], [9, 1]]) column(X, i + 0.2, i + 0.8, 10, 0.35, g * k, 'madder', 0.08, { o: 0.6, show: [3] });
      X.tags.push(
        { text: 'without the tax: 100 in gains', at: [2.5, 15, 8 * k], show: [1, 2] },
        { text: 'buyers keep 24.5', at: [1.5, 18, 5.5 * k], c: 'cobalt', show: [2] }, { text: 'sellers keep 24.5', at: [3.5, 3.5, 3.5 * k], c: 'olive', show: [2] },
        { text: 'the state takes 42', at: [6.5, 10, 6 * k], c: 'ochre', show: [2] }, { text: 'lost: 5 + 3 + 1', at: [9.5, 10, 1 * k], c: 'madder', show: [3] },
      );
      X.dims.push({ from: [0.2, 20, 0], to: [9.8, 20, 0], text: 'one column a trader', show: [1] });
      X.story = [
        { say: 'Twenty buyers will pay 19.5, 18.5, … 0.5, and twenty sellers have costs 0.5, 1.5, … 19.5. Each step of the two staircases is one person.' },
        { say: 'Without a tax, ten trades happen at a price of 10. Stand each trader’s gain up as a column: value minus price, or price minus cost. They total 100.', cam: { zoom: 0.6, el: 0.16, at: [5, 10, 0.06] }, dur: 1.6 },
        { say: 'A tax of 6 opens a wedge: buyers pay 13, sellers keep 7, and seven trades remain. Each hands 6 to the state.', cam: { az: 0.4, el: 0.24, zoom: 0.65, at: [4, 10, 0.08] }, dur: 1.4 },
        { say: 'The three marginal trades stop. Their gains, 5, 3 and 1, were real but smaller than the tax.', cam: { az: 0.6, el: 0.25, zoom: 0.58, at: [8, 10, 0.04] } },
        { say: 'Buyers and sellers keep 49, the state takes 42, and 9 is gone: the trades that no longer happen. A curve is a list of people.', cam: { az: 0.35, el: 0.2, zoom: 0.75, at: [5, 10, 0.08] } },
      ];
      return X;
    },
  },

  '1.3': {
    dom: { x: [0, 12], y: [0, 12] },
    build() {
      // a fan of demand curves through one point, kept near the point
      const X = blank();
      const eps = (s) => 0.2 + 1.3 * s;
      const hs = (s) => 0.24 * s;
      const span = (s) => [Math.max(1.5, 5 - 4.5 * eps(s)), Math.min(8.5, 5 + 4 * eps(s))];
      X.surfaces.push({ param: (q, s) => [q, 5 - (q - 5) / eps(s), hs(s)], u: span, v: [0, 1], c: 'cobalt', alpha: 0.12, freq: 0, show: [4] });
      X.lines.push(post(5, 5, hs(1), 'white', { dash: false, o: 0.9, show: [3] }));
      X.lines.push(fnLine((s) => [5 * (1 - 0.1 * eps(s)), 5.5, hs(s)], 0, 1, 'ochre', 2.2, { draw: 4 }, 30));
      X.points.push({ at: [4.9, 5.5, 0], c: 'ochre', show: [2] }, { at: [4.25, 5.5, hs(1)], c: 'ochre', show: [4] });
      X.tags.push(
        { text: 'R = 25', at: [4.9, 5, 0], c: 'ochre', show: [1, 2] },
        { text: 'first month: R = 27', at: [4.9, 5.5, 0], c: 'ochre', show: [2, 3] },
        { text: 'still buying at 5.5', at: [1.2, 9.5, 0], c: 'cobalt', show: [2] },
        { text: 'time to adjust', at: [8.5, 5 - 3.5 / eps(1), hs(1)], show: [3] },
        { text: 'five years: R = 23.4', at: [4.25, 5.5, hs(1)], c: 'ochre', show: [4] },
      );
      X.dims.push({ from: [12, 0, 0], to: [12, 0, hs(1)], text: 'first month … five years', show: [3] });
      X.engine = horizonStory(eps, hs);
      X.story = [
        { say: 'Elasticity is quoted as one number. Yet today’s point, <i>Q</i> = 5 at <i>P</i> = 5, lies on a different curve depending on how long buyers have had.' },
        { say: 'In the first month few buyers can switch. Their values run steeply through the point: |<i>ε</i>| = 0.2. Revenue is 5 × 5 = 25.', cam: { zoom: 0.55, el: 0.5, at: [5, 6, 0] }, dur: 2 },
        { say: 'Raise the price 10 percent. Almost everyone still buys, and revenue rises to about 27.', cam: { zoom: 0.45, el: 0.45, at: [4.7, 5.3, 0] } },
        { say: 'Give them time. Over five years they find substitutes, the same buyers’ values draw in toward 5, and the line they make turns flat.', cam: { az: -0.6, el: 0.2, zoom: 0.7, at: [5, 5.5, 0.12] }, dur: 3 },
        { say: 'Now the same rise loses revenue: 23.4. Elasticity is not one number; it depends on how long you wait.', cam: { az: -0.45, el: 0.18, zoom: 0.8, at: [5, 6, 0.12] }, dur: 1.4 },
      ];
      return X;
    },
  },

  '2.1': {
    dom: { x: [0, 14], y: [0, 14] },
    build() {
      const X = blank();
      const k = 0.025;
      X.surfaces.push({ param: (x, y) => [x, y, k * Math.sqrt(x * y)], u: [0, 14], v: [0, 14], c: 'cobalt', alpha: 0.2, freq: 0.5, contour: (x, y) => Math.sqrt(x * y), ...UP });
      X.surfaces.push({ param: (x, v) => [x, 12 - x, v * k * Math.sqrt(x * (12 - x))], u: [0, 12], v: [0, 1], c: 'madder', alpha: 0.18, freq: 0, n: 24, show: [2] });
      X.lines.push(fnLine((x) => [x, 12 - x, k * Math.sqrt(x * (12 - x))], 0, 12, 'madder', 2.4, { show: [2], draw: 2 }));
      X.lines.push(post(6, 6, 6 * k, 'white', { show: [4] }));
      X.points.push({ at: [6, 6, 6 * k], show: [4] });
      X.agents.push({ asset: 'household', at: [6, 6, 6 * k], scale: 0.06, show: [4] });
      X.tags.push({ text: 'utility', at: [14, 14, 14 * k], ...UP }, { text: 'the budget, a fence', at: [1, 11, 0.04], c: 'madder', show: [2] });
      X.eqs.push({ html: '∇u = λ∇g', at: [7.5, 7.5, 6 * k + 0.03], show: [4] });
      X.dims.push({ from: [14, 0, 0], to: [14, 0, 6 * k], text: 'u = 6 at the best bundle', ...UP });
      X.engine = climbEngine(k, { from: 3 });
      X.story = [
        { say: 'The household’s choice as the page draws it: contour lines of utility, and the budget line <i>x</i> + <i>y</i> = 12 touching one of them at (6, 6).' },
        { say: 'Raise utility, √(<i>xy</i>), as height. It is a hill, and each indifference curve is a contour line on it.', cam: { az: -0.5, el: 0.12, zoom: 0.85, at: [7, 7, 0.12] }, dur: 1.6 },
        { say: 'The budget is a fence standing on the hill. Walk along it and the hill’s profile is one arch.', cam: { az: 0.55, el: 0.1, zoom: 0.75, at: [6, 6, 0.1] }, dur: 1.4 },
        { say: 'Put twelve households anywhere on the fence. Each steps the way its utility rises, and every one ends at the top of the arch.', cam: { az: 0.25, el: 0.28, zoom: 0.72, at: [6, 6, 0.08] } },
        { say: 'There the fence runs along a contour: MRS equals the price ratio, ∇<i>u</i> = <i>λ</i>∇<i>g</i>. Here <i>λ</i> = 0.5, how much higher the household could climb if the fence moved out by one unit.', cam: { az: 0.45, el: 0.1, zoom: 0.6, at: [6, 6, 0.15] } },
      ];
      return X;
    },
  },

  '2.2': {
    dom: { x: [0, 14], y: [0, 14] },
    build() {
      const X = blank();
      const hp = (p) => 0.07 * p;
      X.quads.push({ q: [[0, 14, 0], [14, 14, 0], [14, 14, hp(3.2)], [0, 14, hp(3.2)]], c: 'chalk', alpha: 0.07, ...UP });
      X.lines.push(fnLine((p) => [6 / p, 14, hp(p)], 6 / 14, 3.2, 'white', 2.6, { show: [4], draw: 4, head: 'white' }));
      X.lines.push(fnLine((p) => [6 / Math.sqrt(p), 14, hp(p)], 36 / 196, 3.2, 'cobalt', 2, { dash: true, show: [5], draw: 5 }));
      for (const [x, y, p, c, b] of [[6, 6, 1, 'white', 2], [3, 6, 2, 'madder', 3], [4.24, 8.49, 2, 'cobalt', 5]]) {
        X.lines.push(line([[x, y, 0], [x, 14, 0], [x, 14, hp(p)]], 'chalk', 1.2, { dash: true, o: 0.7, show: [b], draw: b }));
        X.points.push({ at: [x, 14, hp(p)], c, show: [b] });
      }
      X.tags.push({ text: 'price of x', at: [0, 14, hp(3.2) + 0.02], ...UP }, { text: 'p = 1', at: [6, 14, hp(1)], show: [2] }, { text: 'p = 2', at: [3, 14, hp(2)], c: 'madder', show: [3] }, { text: 'compensated', at: [4.24, 14, hp(2) + 0.04], c: 'cobalt', show: [5] });
      X.dims.push({ from: [14, 14, 0], to: [14, 14, hp(3.2)], text: 'p = 0 … 3.2', ...UP });
      X.story = [
        { say: 'The price of <i>x</i> doubles, from 1 to 2, and the choice moves from A (6, 6) to B (3, 6). The page copies the choices into a second panel, against the price.' },
        { say: 'Stand the price up as a third axis along the top edge, so that the two panels are one figure.', cam: { az: 0.7, el: 0.04, zoom: 1, at: [6, 13, 0.18] }, dur: 1.4 },
        { say: 'At <i>p</i> = 1 the household chooses <i>x</i> = 6, at A. Carry that choice up to its price.', cam: { az: 0.6, el: 0.06, zoom: 0.85, at: [6, 13, 0.12] } },
        { say: 'At <i>p</i> = 2 it chooses <i>x</i> = 3, at B.' },
        { say: 'Do the same at every price, and the choices trace <i>x</i> = 6/<i>p</i>. The demand curve is a list of optima.', cam: { az: 0.75, el: 0.04, zoom: 1, at: [6, 14, 0.18] }, dur: 2.2 },
        { say: 'Give the household just enough income to reach its old curve at <i>p</i> = 2, and it chooses C, <i>x</i> = 4.24. A → C, −1.76, is the substitution effect; C → B, −1.24, the income effect. The dashed curve is demand without the income effect.', dur: 1.4 },
      ];
      return X;
    },
  },

  '2.3': {
    dom: { x: [0, 12], y: [0, 12] },
    build() {
      const X = blank();
      const hr = (r) => r * 0.5;
      for (const r of [0, 0.15, 0.3, 0.45, 0.6]) {
        const c2 = (c1) => 4.5 + (1 + r) * (6 - c1);
        const c1lo = Math.max(0, 6 - 7.5 / (1 + r));
        const at = r ? UP : {};
        X.lines.push(fnLine((c1) => [c1, c2(c1), hr(r)], c1lo, 6 + 4.5 / (1 + r), r === 0.3 ? 'white' : 'chalk', r === 0.3 ? 2 : 1.2, { o: 0.8, ...at }, 10));
        const W = 6 + 4.5 / (1 + r);
        X.points.push({ at: [W / 2, (1 + r) * (W / 2), hr(r)], c: 'cobalt', show: [2] });
      }
      X.lines.push(fnLine((r) => { const W = 6 + 4.5 / (1 + r); return [W / 2, (1 + r) * (W / 2), hr(r)]; }, 0, 0.6, 'cobalt', 2.8, { show: [2], draw: 2, head: 'cobalt' }, 30));
      X.lines.push(post(6, 4.5, hr(0.6), 'white', { dash: false, o: 0.9, ...UP }));
      X.tags.push({ text: 'r = 0', at: [5.25, 5.25, 0], show: [1] }, { text: 'r = 0.6', at: [4.41, 7.05, hr(0.6)], show: [2] }, { text: 'interest rate', at: [6, 4.5, hr(0.6) + 0.02], ...UP });
      X.eqs.push({ html: 'u′(c<sub>1</sub>) = β(1 + r)u′(c<sub>2</sub>)', at: [7, 11, hr(0.6)], show: [3] });
      X.dims.push({ from: [12, 0, 0], to: [12, 0, hr(0.6)], text: 'r = 0 … 0.6', ...UP });
      X.story = [
        { say: 'The household has 6 now and 4.5 later. At 25 percent interest it consumes 4.8 now and saves 1.2.' },
        { say: 'Stand the interest rate up as height, from 0 to 60 percent. Each rate is a budget line through the same endowment, (6, 4.5), steeper as <i>r</i> rises.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [6, 6, 0.15] }, dur: 1.4 },
        { say: 'On each line the household takes its best point. As <i>r</i> rises, <i>c</i><sub>1</sub> falls from 5.25 to 4.4: saving rises from 0.75 to 1.6.', cam: { az: -0.7, el: 0.1, zoom: 0.75, at: [5, 6.5, 0.15] }, dur: 2 },
        { say: 'Each of these points satisfies the Euler equation. Read up the rate axis, they are the household’s saving curve. Relabel the axes as two states of the world, and the same tangency chooses insurance.', cam: { az: -0.4, el: 0.16, zoom: 0.85, at: [6, 6.5, 0.15] } },
      ];
      return X;
    },
  },

  // ===== Stage 3
  '3.1': {
    dom: { x: [0, 12], y: [1.5, 5.5] },
    build() {
      const X = blank();
      const L = (q) => 2 + 0.06 * (q - 6) ** 2;
      const dL = (q) => 0.12 * (q - 6);
      const a = 0.22;
      const tan = [];
      [2, 4, 6, 8, 10].forEach((k, K) => {
        const h = K * 0.06;
        const s = (q) => L(k) + dL(k) * (q - k) + a * (q - k) ** 2;
        X.lines.push(line(clipY(range(Math.max(0.2, k - 3), Math.min(12, k + 3), 40).map((q) => [q, s(q), h]), 1.5, 5.5), 'cobalt', 1.8, UP));
        X.points.push({ at: [k, L(k), h], c: 'cobalt', ...UP });
        // each curve's own minimum, a ring in the flat figure
        const m = k - dL(k) / (2 * a);
        X.points.push({ at: [m, s(m), h], c: 'madder', size: 6, show: [4] });
        X.lines.push(post(k, L(k), h, 'chalk', { o: 0.5, ...UP }));
        tan.push([k, L(k), h]);
        X.agents.push({ asset: 'firm', at: [k, 5.2, h], scale: 0.03 + 0.008 * K, ...UP });
      });
      X.lines.push(line(tan, 'white', 2.4, { show: [2], draw: 2, head: 'white' }));
      X.tags.push({ text: 'plant size K', at: [10, 5.2, 0.27], ...UP }, { text: 'touches the envelope once', at: [2, L(2), 0.01], c: 'cobalt', show: [2] }, { text: 'its own minimum', at: [3.09, 2.7, 0.01], c: 'madder', show: [4] });
      X.dims.push({ from: [12, 1.5, 0], to: [12, 1.5, 0.24], text: 'five plant sizes', ...UP });
      X.story = [
        { say: 'Short-run average cost for five plant sizes, and the long-run curve that lies under all of them.' },
        { say: 'Give each plant size its own plane, ordered into the page: one plant and its short-run curve on each.', cam: { az: 0.6, el: 0.1, zoom: 0.85, at: [6, 3.5, 0.12] }, dur: 1.4 },
        { say: 'Each short-run curve touches the long-run curve at one point. Join those points across the planes.', dur: 1.6 },
        { say: 'Seen from above, the planes collapse into the page, and the lowest cost at each output traces the envelope.', cam: { az: 0, el: 0.75, zoom: 0.85, at: [6, 3.5, 0] } },
        { say: 'Take the smallest plant: its curve touches the envelope at <i>Q</i> = 2, left of its own minimum. The two coincide only at the bottom, <i>Q</i> = 6. In 1931 Jacob Viner asked his draftsman, Y. K. Wong, for a curve through every minimum; Wong said that no curve could do it.', cam: { az: 0.45, el: 0.2, zoom: 0.55, at: [3, 2.8, 0.03] } },
      ];
      return X;
    },
  },

  '3.2': {
    dom: { x: [0, 60], y: [0, 6] },
    build() {
      const X = blank();
      const qOf = (p) => 4 + Math.sqrt(4 + (p - 2) / 0.18);
      const hN = (N) => (N - 3) * 0.06;
      X.surfaces.push({ param: (Q, v) => [Q, (60 - Q) / 8, v * hN(7)], u: [12, 60], v: [0, 1], c: 'chalk', alpha: 0.08, freq: 0, n: 16, ...UP });
      X.quads.push({ q: [[0, 2, 0], [60, 2, 0], [60, 2, hN(7)], [0, 2, hN(7)]], c: 'madder', alpha: 0.07, o: 0.3, show: [4] });
      const path = [];
      for (const N of [3, 4, 5, 6, 7]) {
        X.lines.push(fnLine((p) => [N * qOf(p), p, hN(N)], 2, 6, 'olive', 1.8, N > 3 ? UP : {}, 30));
        let lo = 2;
        let hi = 6;
        for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (N * qOf(m) > 60 - 8 * m) hi = m; else lo = m; }
        path.push([N * qOf(lo), lo, hN(N)]);
        X.tags.push({ text: `N = ${N}`, at: [N * qOf(6), 6, hN(N)], c: 'olive', ...(N > 3 ? UP : {}) });
      }
      X.lines.push(line(path, 'white', 2.8, { show: [3], draw: 3, head: 'white' }));
      for (const p of path) X.points.push({ at: p, show: [3] });
      X.tags.push({ text: 'firms enter', at: path[4], show: [3] }, { text: 'P = 2, the minimum of average cost', at: [44, 2, hN(7)], c: 'madder', show: [4] });
      X.dims.push({ from: [60, 0, 0], to: [60, 0, hN(7)], text: 'N = 3 … 7 firms', ...UP });
      X.engine = entryEngine(path, { from: 2, to: 3 });
      X.story = [
        { say: 'Industry supply with 3 to 7 identical firms, each with the cost of Figure 3.1, against market demand <i>Q</i> = 60 − 8<i>P</i>.' },
        { say: 'Raise the number of firms as height. Each supply curve stands at its own level, one firm a step.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [35, 3.5, 0.12] }, dur: 1.4 },
        { say: 'With 3 firms the price is about 4.4, well above the minimum of average cost. The profits draw another firm in, and the market moves up to the next level.', cam: { az: -0.35, el: 0.2, zoom: 0.8, at: [32, 3.2, 0.12] } },
        { say: 'Firm by firm the price falls: 4.4, 3.7, 3.0, 2.5, 2.1.', dur: 1.8 },
        { say: 'An eighth firm would make a loss, so entry stops near <i>P</i> = 2, the minimum of average cost. Perfect competition is the end of an entry process: profits are zero because that is where entry stops.', cam: { az: -0.6, el: 0.1, zoom: 0.85, at: [40, 2.5, 0.12] } },
      ];
      return X;
    },
  },

  // ===== Stage 4
  '4.1': {
    dom: { x: [0, 10], y: [0, 10] },
    build() {
      const X = blank();
      const k = 0.012;
      const pi1 = (a, b) => Math.max(0, (10 - a - b) * a);
      const pi2 = (a, b) => Math.max(0, (10 - a - b) * b);
      X.surfaces.push({ param: (a, b) => [a, b, k * pi1(a, b)], u: (b) => [0, 10 - b], v: [0, 10], c: 'cobalt', alpha: 0.2, freq: 0.18, contour: pi1, ...UP });
      X.surfaces.push({ param: (a, b) => [a, b, k * pi2(a, b)], u: (b) => [0, 10 - b], v: [0, 10], c: 'madder', alpha: 0.14, freq: 0.18, contour: pi2, show: [2], rise: 2 });
      X.lines.push(fnLine((b) => [(10 - b) / 2, b, k * ((10 - b) / 2) ** 2], 0, 10, 'cobalt', 3, { ...UP, draw: 1 }));
      X.lines.push(fnLine((a) => [a, (10 - a) / 2, k * ((10 - a) / 2) ** 2], 0, 10, 'madder', 3, { show: [2], rise: 2, draw: 2 }));
      X.points.push({ at: [10 / 3, 10 / 3, k * (100 / 9)], size: 10, show: [4] });
      X.lines.push(post(10 / 3, 10 / 3, k * (100 / 9), 'white', { show: [4] }));
      X.agents.push({ asset: 'firm', at: [8.5, 0.6, 0], scale: 0.06 }, { asset: 'firm', at: [0.6, 8.5, 0], scale: 0.06, ry: Math.PI / 2 });
      X.tags.push({ text: 'firm 1’s ridge', at: [5, 0, k * 25], c: 'cobalt', ...UP }, { text: 'firm 2’s ridge', at: [0, 5, k * 25], c: 'madder', show: [2], rise: 2 }, { text: 'profit', at: [10 / 3, 10 / 3, k * (100 / 9) + 0.04], show: [4] });
      X.dims.push({ from: [10 / 3, 10 / 3, 0], to: [10 / 3, 10 / 3, k * (100 / 9)], text: 'π = 11.1 each at the Nash point', show: [4] });
      X.engine = cournotEngine(k, { from: 3 });
      X.story = [
        { say: 'Two firms choose outputs. The page draws each one’s best response as a line, and they cross at the Nash equilibrium, 3.33 each.' },
        { say: 'Raise firm 1’s profit over the plane of outputs: a hill. For each output of firm 2, firm 1’s best is the top in its own direction, and those tops form a ridge, its reaction curve.', cam: { az: -0.6, el: 0.12, zoom: 0.85, at: [4, 4, 0.1] }, dur: 1.8 },
        { say: 'Firm 2’s hill faces the other way, with its own ridge.', cam: { az: 0.6, el: 0.12, zoom: 0.85, at: [4, 4, 0.1] }, dur: 1.6 },
        { say: 'Let them take turns, each climbing its own hill with the other’s output held fixed. Turn by turn they close in on the crossing.', cam: { az: 0.15, el: 0.3, zoom: 0.8, at: [4, 4, 0.08] } },
        { say: 'Where the ridges cross, each earns 11.1. The two contours cross there rather than touch, so both firms could earn more by producing less: the cartel of Figure 8.8.', cam: { az: 0.3, el: 0.12, zoom: 0.62, at: [3.33, 3.33, 0.12] } },
      ];
      return X;
    },
  },

  '4.2': {
    dom: { x: [0, 100], y: [0, 60] },
    build() {
      const X = blank();
      const R = [30, 30, 0.34];
      const I = [30, 23, 0.18];
      const O = [30, 37, 0];
      const F = [22, 23, 0];
      const A = [38, 23, 0];
      X.lines.push(line([R, O], 'chalk', 2, UP), line([R, I], 'cobalt', 3.4, UP), line([I, F], 'madder', 2, { dash: true, show: [1, 3], rise: 1 }), line([I, A], 'cobalt', 3.4, UP));
      X.lines.push(line([R, I, A], 'white', 4, { show: [3], draw: 3, head: 'white' }));
      X.points.push({ at: R, size: 10, ...UP }, { at: I, size: 10, c: 'cobalt', ...UP }, { at: O, c: 'chalk', show: [1] }, { at: F, c: 'madder', show: [1, 3] }, { at: A, c: 'cobalt', show: [1] });
      X.lines.push(line([[8, 30, 0.34], [8, 30, 0]], 'chalk', 1.4, { o: 0.7, ...UP }));
      X.tags.push({ text: 'entrant moves first', at: R, ...UP }, { text: 'incumbent: fight pays 2, accommodate 5', at: I, c: 'cobalt', show: [2] }, { text: 'time', at: [8, 30, 0.34], ...UP }, { text: '(In, Accommodate)', at: A, show: [3] });
      X.dims.push({ from: [8, 30, 0], to: [8, 30, 0.34], text: 'two moves, entrant first', ...UP });
      X.story = [
        { say: 'The entry game as a table. (Out, Fight) is a Nash equilibrium: if the incumbent will fight, staying out is best, and if nobody enters, fighting costs the incumbent nothing.' },
        { say: 'Stand the table up into a tree along a time axis. The entrant moves first, at the top.', cam: { az: 0.6, el: 0.1, zoom: 0.8, at: [30, 28, 0.17] }, dur: 1.6 },
        { say: 'If the entrant comes in, the threat is tested at the moment it would have to be carried out. Fighting then pays the incumbent 2; accommodating pays 5.', cam: { az: 0.4, el: 0.14, zoom: 0.6, at: [30, 23, 0.12] } },
        { say: 'So the incumbent would accommodate, and the entrant, who can see this, enters. The threat drops out and only (In, Accommodate) survives: the subgame-perfect equilibrium.', cam: { az: 0.55, el: 0.1, zoom: 0.75, at: [32, 26, 0.14] }, dur: 1.6 },
      ];
      return X;
    },
  },

  // ===== Stage 5
  '5.1': {
    dom: { x: [0, 10], y: [0, 10] },
    build() {
      const X = blank();
      const k = 0.03;
      const uA = (x, y) => Math.sqrt(Math.max(0, x * y));
      const uB = (x, y) => Math.sqrt(Math.max(0, (10 - x) * (10 - y)));
      X.surfaces.push({ param: (x, y) => [x, y, k * uA(x, y)], u: [0, 10], v: [0, 10], c: 'cobalt', alpha: 0.16, freq: 1, contour: uA, ...UP });
      X.surfaces.push({ param: (x, y) => [x, y, k * uB(x, y)], u: [0, 10], v: [0, 10], c: 'madder', alpha: 0.13, freq: 1, contour: uB, show: [2], rise: 2 });
      X.surfaces.push({ param: (x, v) => [x, 10 - x, v * k * uA(x, 10 - x)], u: [0, 10], v: [0, 1], c: 'chalk', alpha: 0.12, freq: 0, n: 24, show: [4] });
      X.lines.push(fnLine((x) => [x, 10 - x, k * uA(x, 10 - x)], 0, 10, 'white', 2.6, { show: [4], draw: 4 }));
      X.lines.push(post(5, 5, 5 * k, 'white', { show: [4] }));
      X.points.push({ at: [5, 5, 5 * k], size: 10, show: [4] }, { at: [8, 2, 0], c: 'chalk' });
      X.agents.push({ asset: 'household', at: [0.6, 0.6, 0], scale: 0.07 }, { asset: 'household', at: [9.4, 9.4, 0], scale: 0.07, ry: Math.PI });
      X.tags.push({ text: 'both tops on one fence', at: [5, 5, 5 * k + 0.02], show: [4] }, { text: 'A’s hill', at: [10, 10, k * 10], c: 'cobalt', ...UP }, { text: 'B’s hill', at: [0, 0, k * 10], c: 'madder', show: [2], rise: 2 });
      X.dims.push({ from: [5, 5, 0], to: [5, 5, 5 * k], text: 'u = 5 for each at the equilibrium', show: [4] });
      X.tags.push({ text: 'barter stops on x = y', at: [8, 8, 0.01], show: [3] });
      X.engine = barterEngine({ from: 3 });
      X.story = [
        { say: 'Households A and B share 10 units of each good, starting from ω = (8, 2). A’s curves start at the lower left, B’s at the upper right.' },
        { say: 'A’s utility rises as a hill from A’s corner.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [5, 5, 0.1] }, dur: 1.4 },
        { say: 'B’s rises from the opposite corner, facing it. The contract curve is where their contour lines touch: the diagonal.', cam: { az: 0.55, el: 0.12, zoom: 0.85, at: [5, 5, 0.1] }, dur: 1.4 },
        { say: 'Let them barter, every swap raising both utilities. From each start the swapping stops on the diagonal, each time at a different split.', cam: { az: 0, el: 0.45, zoom: 0.8, at: [5, 5, 0] } },
        { say: 'A price line through ω is a fence. At slope −1 both households’ tops along it are the same point, E = (5, 5): both tops on one fence, Walras’ law made visible.', cam: { az: 0.5, el: 0.1, zoom: 0.75, at: [5, 5, 0.1] } },
      ];
      return X;
    },
  },

  '5.2': {
    dom: { x: [0, 10], y: [0, 32] },
    build() {
      const X = blank();
      const hn = (n) => (n - 1) * 0.05;
      const eff = [];
      for (let n = 1; n <= 6; n++) {
        const at = n > 1 ? UP : {};
        X.lines.push(fnLine((g) => [g, n * (10 - g), hn(n)], Math.max(0, 10 - 32 / n), 10, n === 1 ? 'white' : 'cobalt', 1.6, { o: 0.85, ...at }, 10));
        X.lines.push(line([[0, 6, hn(n)], [10, 6, hn(n)]], 'madder', 1, { o: 0.5, ...at }));
        eff.push([10 - 6 / n, 6, hn(n)]);
        X.points.push({ at: [10 - 6 / n, 6, hn(n)], c: 'cobalt', show: [2] });
      }
      X.lines.push(line(eff, 'cobalt', 2.8, { show: [2], draw: 2, head: 'cobalt' }));
      X.lines.push(line([[4, 6, 0], [4, 6, hn(6)]], 'white', 2.4, { show: [3] }));
      X.tags.push({ text: 'households, one plane each', at: [0, 30, hn(6)], ...UP }, { text: 'efficient: 4, 7, 8 … 9', at: eff[5], c: 'cobalt', show: [2] }, { text: 'voluntary: 4', at: [4, 6, hn(6)], show: [3] });
      X.dims.push({ from: [10, 0, 0], to: [10, 0, hn(6)], text: 'n = 1 … 6 households', ...UP });
      X.story = [
        { say: 'One household would pay 10 − <i>G</i> for one more unit of street lighting, and a unit costs 6. Alone, it buys 4.' },
        { say: 'Add households, one plane each. Every household uses the same lighting, so what they would pay together adds up vertically: <i>n</i>(10 − <i>G</i>).', cam: { az: 0.6, el: 0.12, zoom: 0.85, at: [6, 12, 0.12] }, dur: 1.6 },
        { say: 'The efficient amount is where that sum meets the cost: 4 with one household, 7 with two, 8 with three, 9 with six.', dur: 1.8 },
        { say: 'Voluntary giving stops at 4 however many share the good, because past 4 no single household values a unit at its cost. The gap grows with every household.', cam: { az: 0.75, el: 0.1, zoom: 0.75, at: [6, 6, 0.12] } },
      ];
      return X;
    },
  },

  '5.3': {
    dom: { x: [0, 100], y: [0, 14] },
    build() {
      const X = blank();
      const k = 0.025;
      for (let j = 0; j < 20; j++) {
        const th = (5 * j + 2.5) / 10;
        const traded = 5 * j + 5 <= 60;
        // first every car alike to the buyer; at the end, which traded
        column(X, 5 * j + 0.8, 5 * j + 4.2, th, 0.3, th * k, 'chalk', 0.16, { show: [1, 3], rise: 1 });
        column(X, 5 * j + 0.8, 5 * j + 4.2, th, 0.3, th * k, traded ? 'olive' : 'madder', traded ? 0.3 : 0.12, { show: [3] });
      }
      X.quads.push(flat(0, 0, 100, 14, 6 * k, 'ochre', 0.05, { show: [3] }));
      X.tags.push({ text: 'quality θ: the buyer cannot see this axis', at: [0, 13, 0.27], ...UP }, { text: 'p = 6: cars below trade', at: [30, 3, 6 * k], c: 'ochre', show: [3] }, { text: 'the best stay home', at: [90, 9, 10 * k], c: 'madder', show: [3] });
      X.dims.push({ from: [100, 0, 0], to: [100, 0, 10 * k], text: 'quality θ = 0 … 10', ...UP });
      X.engine = lemonsEngine(k, { from: 2, to: 3 });
      X.story = [
        { say: 'A market for 100 used cars of quality <i>θ</i> from 0 to 10. A car is worth <i>θ</i> to its owner and <i>θ</i> + 3 to any buyer, but the buyer cannot see <i>θ</i>.' },
        { say: 'Give each car a column as tall as its quality: the axis the buyer cannot see.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [50, 7, 0.12] }, dur: 1.4 },
        { say: 'Buyers pay what the average car on offer is worth to them, <i>p</i>/2 + 3. At 10 that is 8. Owners of better cars than 8 take them home, and the price falls again: 7, 6.5, … toward 6.', cam: { az: -0.35, el: 0.18, zoom: 0.8, at: [55, 7, 0.12] }, dur: 1.2 },
        { say: 'At <i>p</i> = 6 the 60 cars below 6 trade, and the 40 best stay home, though each is worth 3 more to a buyer than to its owner. Of 300 in possible gains, 120 are lost, from the top of the market.', cam: { az: -0.6, el: 0.12, zoom: 0.85, at: [55, 7, 0.12] } },
      ];
      return X;
    },
  },

  // ===== Stage 6
  '6.1': {
    dom: { x: [0, 16], y: [0, 2.8] },
    build() {
      const X = blank();
      const kt = 0.005;
      const ks = 3.75 ** (1 / 0.65);
      X.surfaces.push({ param: (k, v) => [k, 0.3 * k ** 0.35, v * 0.3], u: [0, 16], v: [0, 1], c: 'cobalt', alpha: 0.06, freq: 0, n: 20, ...UP });
      for (const k0 of [2, 5, 10, 13]) {
        const pts = [];
        let k = k0;
        for (let t = 0; t <= 60; t++) { pts.push([k, 0.3 * k ** 0.35, t * kt]); k += 0.3 * k ** 0.35 - 0.08 * k; }
        X.lines.push(line(pts, 'cobalt', 2.2, { show: [2], draw: 2, head: 'cobalt' }));
      }
      const jump = [];
      let k = ks;
      for (let t = 0; t <= 60; t++) { jump.push([k, 0.4 * k ** 0.35, t * kt]); k += 0.4 * k ** 0.35 - 0.08 * k; }
      X.lines.push(line(jump, 'ochre', 2, { dash: true, show: [3], draw: 3, head: 'ochre' }));
      X.lines.push(line([[ks, 0.08 * ks, 0], [ks, 0.08 * ks, 60 * kt]], 'white', 1.6, { dash: true, ...UP }));
      X.tags.push({ text: 'time', at: [16, 0.4, 0.3], ...UP }, { text: 'k* = 7.6 at every date', at: [ks, 0.08 * ks, 0.3], ...UP }, { text: 's = 0.4', at: jump[60], c: 'ochre', show: [3] });
      X.dims.push({ from: [16, 0, 0], to: [16, 0, 60 * kt], text: 'year 0 … 60', ...UP });
      X.story = [
        { say: 'The page is a phase diagram. At every <i>k</i> it says whether capital grows or shrinks, and saving meets break-even investment at <i>k</i>* ≈ 7.6. It does not say when.' },
        { say: 'Stand time up as a third axis, sixty years tall. The steady state is a line straight up.', cam: { az: 0.6, el: 0.1, zoom: 0.85, at: [8, 1.4, 0.15] }, dur: 1.4 },
        { say: 'Start four economies with different capital and follow them through time. Every path bends toward <i>k</i>*; half the gap closes in about 13 years.', dur: 3 },
        { say: 'Raise the saving rate to 0.4 at <i>k</i>*, and the path leans toward a higher steady state, about 11.9, then flattens again. Saving raises the level, not the long-run growth rate; only technology does that.', cam: { az: 0.75, el: 0.1, zoom: 0.8, at: [10, 1.4, 0.15] }, dur: 2.4 },
      ];
      return X;
    },
  },

  '6.2': {
    dom: { x: [5, 12], y: [0, 6] },
    build() {
      const X = blank();
      const hP = (P) => (P - 1) * 0.25;
      X.surfaces.push({ param: (Y, v) => [Y, 9 - 0.75 * Y, v * hP(2)], u: [5, 12], v: [0, 1], c: 'chalk', alpha: 0.1, freq: 0, n: 14, ...UP });
      for (const P of [1, 1.25, 1.5, 1.75, 2]) X.lines.push(line(clipY(range(5, 12, 30).map((Y) => [Y, 0.9 * Y - 6 / P, hP(P)]), 0, 6), 'cobalt', P === 1 || P === 2 ? 2 : 1.1, P > 1 ? UP : {}));
      const eq = (P) => (9 + 6 / P) / 1.65;
      X.lines.push(fnLine((P) => [eq(P), 9 - 0.75 * eq(P), hP(P)], 1, 2, 'white', 3, { show: [2], draw: 2, head: 'white' }, 30));
      for (const P of [1, 1.5, 2]) X.points.push({ at: [eq(P), 9 - 0.75 * eq(P), hP(P)], show: [2] });
      X.tags.push({ text: 'price level P', at: [12, 0, hP(2)], ...UP }, { text: 'AD', at: [eq(2), 9 - 0.75 * eq(2), hP(2) + 0.02], show: [2] }, { text: 'IS does not move', at: [11.6, 0.3, hP(2)], c: 'chalk', ...UP });
      X.dims.push({ from: [12, 0, 0], to: [12, 0, hP(2)], text: 'P = 1 … 2', ...UP });
      X.story = [
        { say: 'IS and LM cross at one output for each price level. The page draws LM at <i>P</i> = 1, 1.5 and 2.' },
        { say: 'Stand the price level up. IS does not depend on <i>P</i>, so it becomes a wall; each LM curve stands at its own height.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [8.5, 3, 0.12] }, dur: 1.4 },
        { say: 'A higher <i>P</i> shrinks real balances and lifts LM, so output falls: 9.09 at <i>P</i> = 1, 7.88 at 1.5, 7.27 at 2. The crossings trace aggregate demand.', dur: 2 },
        { say: 'AD is a list of equilibria of a list of equilibria: Keynesian crosses stacked by the interest rate make IS, and IS–LM pairs stacked by the price level make AD.', cam: { az: -0.95, el: 0.04, zoom: 0.8, at: [8.5, 2.5, 0.12] } },
      ];
      return X;
    },
  },

  '6.3': {
    dom: { x: [2, 11], y: [0, 16] },
    build(data) {
      const X = blank();
      const k = 0.018;
      const pc = (u, pe) => pe - 1.2 * (u - 5);
      X.surfaces.push({ param: (u, pe) => { const p = pc(u, pe); return p < 0 || p > 16 ? [NaN, NaN, NaN] : [u, p, k * pe]; }, u: [2, 11], v: [2, 14], c: 'cobalt', alpha: 0.14, freq: 1, contour: (u, pe) => (pe - 2) / 3, ...UP });
      X.quads.push({ q: [[5, 0, 0], [5, 16, 0], [5, 16, k * 14], [5, 0, k * 14]], c: 'chalk', alpha: 0.05, ...UP });
      const U = series(data, 'us-phillips', 'unrate');
      const I = series(data, 'us-phillips', 'cpi_infl');
      const path = [];
      for (let y = 1960; y <= 1986; y++) {
        if (U[y] == null || I[y] == null || I[y - 1] == null) continue;
        const h = k * Math.min(14, Math.max(2, I[y - 1]));
        path.push([U[y], Math.max(0, I[y]), h]);
        if ([1960, 1969, 1974, 1980, 1983].includes(y)) X.tags.push({ text: String(y), at: [U[y], Math.max(0, I[y]), h], c: 'madder', show: [2] });
      }
      if (path.length) {
        X.lines.push(line(path, 'madder', 2.6, { show: [2], draw: 2, head: 'madder' }));
        for (const p of path) X.points.push({ at: p, c: 'madder', size: 5, show: [3] });
      }
      X.tags.push({ text: 'expected inflation', at: [2, 16, k * 14], ...UP });
      X.dims.push({ from: [11, 0, k * 2], to: [11, 0, k * 14], text: 'π<sup>e</sup> = 2 … 14 percent', ...UP });
      X.story = [
        { say: 'Short-run Phillips curves for expected inflation from 2 to 14 percent, and the long-run curve at <i>u</i> = 5.' },
        { say: 'Stack the short-run curves by expected inflation, and they form a sloping surface.', cam: { az: 0.55, el: 0.12, zoom: 0.85, at: [6.5, 7, 0.12] }, dur: 1.4 },
        { say: 'Lift each year of the United States to last year’s inflation, taken as its expected inflation. In the 1960s it moves up and to the left along one slice, in the 1970s onto ever higher slices, and after 1980–82 back down.', cam: { az: 0.7, el: 0.1, zoom: 0.8, at: [6.5, 7, 0.14] }, dur: 4 },
        { say: 'The points sit near the slices rather than on them, because of the oil shocks and a natural rate above 5 in those years. The trade-off holds only along one slice; Friedman and Phelps added the axis, and the 1970s moved along it.' },
      ];
      return X;
    },
  },

  '6.4': {
    dom: { x: [2, 10], y: [0, 8] },
    build() {
      const X = blank();
      const k = 0.012;
      const Lf = (u, p) => (p - 2) ** 2 + (u - 5) ** 2;
      X.surfaces.push({ param: (r, th) => { const u = 5 + r * Math.cos(th); const p = 2 + r * Math.sin(th); return p < 0 || u < 2 || u > 10 ? [NaN, NaN, NaN] : [u, p, k * r * r]; }, u: [0, 4], v: [0, 2 * Math.PI], c: 'ochre', alpha: 0.16, freq: 1, contour: (r) => r, ...UP });
      X.surfaces.push({ param: (u, v) => [u, 5 - 1.2 * (u - 5), v * k * Math.min(16, Lf(u, 5 - 1.2 * (u - 5)))], u: [2.6, 9.17], v: [0, 1], c: 'cobalt', alpha: 0.16, freq: 0, n: 24, show: [2] });
      X.lines.push(fnLine((u) => [u, 5 - 1.2 * (u - 5), k * Math.min(16, Lf(u, 5 - 1.2 * (u - 5)))], 2.6, 9.17, 'cobalt', 2.4, { show: [2], draw: 2 }));
      const x = 7.2 / 4.88;
      const c = [5 + x, 5 - 1.2 * x, k * Lf(5 + x, 5 - 1.2 * x)];
      X.points.push({ at: c, size: 10, show: [3] });
      X.lines.push(post(c[0], c[1], c[2], 'white', { show: [3] }));
      X.agents.push({ asset: 'central_bank', at: [5, 2, 0], scale: 0.07 });
      X.tags.push({ text: 'loss: a bowl around the target', at: [8.5, 2, k * 12], c: 'ochre', ...UP }, { text: 'lowest point along the fence', at: c, show: [3] });
      X.dims.push({ from: [c[0], c[1], 0], to: c, text: 'loss 3.7 at the chosen point', show: [3] });
      X.story = [
        { say: 'The central bank wants 2 percent inflation at <i>u</i> = 5. The page draws its loss as circles around that target.' },
        { say: 'Raise the loss as height: a bowl, (<i>π</i> − 2)² + (<i>u</i> − 5)², whose lowest point is the target.', cam: { az: -0.55, el: 0.14, zoom: 0.85, at: [5.5, 3, 0.1] }, dur: 1.4 },
        { say: 'The Phillips curve at <i>π</i><sup>e</sup> = 5 is a fence across the bowl, and the bank can stand only on the fence.', cam: { az: 0.5, el: 0.12, zoom: 0.8, at: [6, 3.5, 0.1] }, dur: 1.4 },
        { say: 'It goes to the lowest point along the fence: <i>u</i> ≈ 6.5, <i>π</i> ≈ 3.2, a loss of 3.7. It is Figure 2.1’s household, with a bowl for a hill and the Phillips curve for a budget.', cam: { az: 0.4, el: 0.12, zoom: 0.65, at: [6.5, 3.2, 0.06] } },
      ];
      return X;
    },
  },

  // ===== Stage 7
  '7.1': {
    dom: { x: [0, 10], y: [0, 14] },
    build(data) {
      const X = blank();
      const k = 0.035;
      X.surfaces.push({ param: (x1, x2) => [x1, 1 + 0.5 * x1 + 0.8 * x2, k * x2], u: [0, 10], v: [0, 8], c: 'cobalt', alpha: 0.12, freq: 1, contour: (x1, x2) => (x2 - 1) / 2, show: [2] });
      for (const [x1, x2, y] of data.reg ?? []) {
        X.points.push({ at: [x1, y, k * x2], c: 'cobalt', size: 6, ...UP });
        X.lines.push(line([[x1, y, 0], [x1, y, k * x2]], 'chalk', 1, { o: 0.25, ...UP }));
      }
      X.tags.push({ text: 'x₂, lifted', at: [10, 12.4, k * 8], ...UP }, { text: 'slope 0.5 along the plane', at: [0.5, 4.6, k * 4.5], c: 'cobalt', show: [2] });
      X.dims.push({ from: [10, 0, 0], to: [10, 0, 8 * k], text: 'x₂ = 0 … 8', ...UP });
      X.story = [
        { say: 'The line fitted to this scatter has a slope of about 1.0. The true effect of <i>x</i><sub>1</sub> is 0.5.' },
        { say: 'Lift each point by its value of <i>x</i><sub>2</sub>, the variable the regression left out.', cam: { az: 0.6, el: 0.08, zoom: 0.85, at: [5, 7, 0.12] }, dur: 1.6 },
        { say: 'The points lie close to a tilted plane, <i>y</i> = 1 + 0.5<i>x</i><sub>1</sub> + 0.8<i>x</i><sub>2</sub>. Along the plane, the slope in <i>x</i><sub>1</sub> is 0.5.', cam: { az: 0.85, el: 0.06, zoom: 0.85, at: [5, 7, 0.14] } },
        { say: 'Look straight down the <i>x</i><sub>2</sub> axis and the cloud collapses into the page’s scatter. Because <i>x</i><sub>2</sub> rises with <i>x</i><sub>1</sub>, by about 0.62 a unit, the shadow’s line tilts by 0.8 × 0.62: a slope near 1.0.', cam: { az: 0, el: 0.75, zoom: 0.85, at: [5, 7, 0] }, dur: 1.4 },
      ];
      return X;
    },
  },

  '7.2': {
    dom: { x: [2, 8], y: [3, 9] },
    build() {
      const X = blank();
      const perm = [4, 3, 10, 0, 11, 9, 7, 1, 5, 6, 2, 8];
      perm.forEach((b, m) => {
        const I = 1 + (0.2 * m) / 11;
        const v = -1 + (2 * b) / 11;
        const h = m * 0.02;
        X.lines.push(line(clipY(range(2, 8, 12).map((q) => [q, 10 * I - q, h]), 3, 9), 'cobalt', 1, { o: 0.35, ...UP }));
        X.lines.push(line(clipY(range(2, 8, 12).map((q) => [q, 1 + q + v, h]), 3, 9), 'olive', 1, { o: 0.35, ...UP }));
        const q = (10 * I - 1 - v) / 2;
        X.points.push({ at: [q, (10 * I + 1 + v) / 2, h], ...UP });
        X.lines.push(line([[q, (10 * I + 1 + v) / 2, 0], [q, (10 * I + 1 + v) / 2, h]], 'chalk', 1, { o: 0.3, ...UP }));
      });
      // months that differ only in the weather: one demand curve, I = 1.1
      X.lines.push(line(clipY(range(2, 8, 12).map((q) => [q, 11 - q, 0]), 3, 9), 'white', 2.2, { show: [3], draw: 3 }));
      for (const v of [-1, -0.5, 0, 0.5, 1]) X.points.push({ at: [(10 - v) / 2, (12 + v) / 2, 0], c: 'olive', show: [3] });
      X.tags.push({ text: 'month 1', at: [7.5, 3.2, 0], show: [1] }, { text: 'month 12', at: [7.5, 3.2, 0.22], ...UP }, { text: 'the weather alone: slope −1', at: [5.6, 5.4, 0], show: [3] });
      X.dims.push({ from: [8, 3, 0], to: [8, 3, 0.22], text: 'months 1 … 12', ...UP });
      X.story = [
        { say: 'Twelve months of prices and quantities from the market of Figure 1.1. The least-squares line through them is flat.' },
        { say: 'Give each month its own plane, carrying that month’s demand and supply.', cam: { az: 0.6, el: 0.1, zoom: 0.85, at: [5, 6, 0.11] }, dur: 1.6 },
        { say: 'Each point is only where its month’s two curves cross. Income moved demand and the weather moved supply, by the same amount and unrelated, so the crossings make a cloud with no slope.', cam: { az: 0.8, el: 0.06, zoom: 0.8, at: [5, 6, 0.11] } },
        { say: 'Months that differed only in the weather would slide along one demand curve, with slope −1. Using the weather as an instrument recovers it (Working 1927; Wright 1928).', cam: { az: 0, el: 0.6, zoom: 0.8, at: [5, 6, 0] } },
      ];
      return X;
    },
  },

  // ===== Stage 8
  '8.1': {
    dom: { x: [0.7, 1.5], y: [0.7, 1.4] },
    build() {
      const X = blank();
      const hp = (p) => (p - 1) * 1.6;
      X.surfaces.push({ param: (w, v) => [w, w ** -0.25, v * hp(1.15)], u: [0.7, 1.5], v: [0, 1], c: 'olive', alpha: 0.12, freq: 0, n: 16, ...UP });
      for (const p of [1, 1.05, 1.1, 1.15]) X.lines.push(line(clipY(range(0.7, 1.5, 50).map((w) => [w, p ** 5 * w ** -4, hp(p)]), 0.7, 1.4), 'cobalt', p === 1 || p === 1.1 ? 2 : 1.1, p > 1 ? UP : {}));
      X.lines.push(fnLine((p) => { const w = p ** (1 / 0.75); return [w, w ** -0.25, hp(p)]; }, 1, 1.15, 'white', 3, { show: [2], draw: 2, head: 'white' }, 20));
      X.points.push({ at: [1, 1, 0] }, { at: [1.1 ** (1 / 0.75), 1.1 ** (-1 / 3), hp(1.1)], show: [2] });
      X.tags.push({ text: 'price of textiles', at: [1.5, 0.7, hp(1.15)], ...UP }, { text: 'wage up, return to capital down', at: [1.2, 0.95, hp(1.15)], show: [2] });
      X.dims.push({ from: [1.5, 0.7, 0], to: [1.5, 0.7, hp(1.15)], text: 'p = 1 … 1.15', ...UP });
      X.story = [
        { say: 'Each curve is the set of wages and rental rates at which a good just breaks even. Today’s factor prices are where the two cross.' },
        { say: 'Raise the price of textiles as height, from 1 to 1.15. The machines’ curve does not move; it becomes a wall.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [1.1, 1.0, 0.12] }, dur: 1.4 },
        { say: 'Textiles’ curve moves out with its price, and the crossing slides along the wall. A 10 percent rise lifts the wage 13.6 percent and lowers the return to capital 3.1 percent.', dur: 2 },
        { say: 'The wage outruns both prices and capital loses against both (Stolper–Samuelson). Trade raises the country’s income and moves it between the people inside.', cam: { az: -0.8, el: 0.08, zoom: 0.8, at: [1.1, 1.0, 0.12] } },
      ];
      return X;
    },
  },

  '8.2': {
    dom: { x: [-0.1, 0.2], y: [0.9, 1.2] },
    build() {
      // the dollar-return curve, stacked by the expected future rate into one surface
      const X = blank();
      const he = (e) => (e - 1) * 1.2;
      const ret = (E, Ee) => 0.03 + (Ee - E) / E;
      X.surfaces.push({ param: (E, Ee) => { const r = ret(E, Ee); return r < -0.1 || r > 0.2 ? [NaN, NaN, NaN] : [r, E, he(Ee)]; }, u: [0.9, 1.2], v: [1, 1.2], c: 'cobalt', alpha: 0.18, freq: 1, contour: (E, Ee) => (Ee - 1) * 20, ...UP });
      X.quads.push({ q: [[0.05, 0.9, 0], [0.05, 1.2, 0], [0.05, 1.2, he(1.2)], [0.05, 0.9, he(1.2)]], c: 'chalk', alpha: 0.07, o: 0.5, ...UP });
      X.lines.push(fnLine((Ee) => [0.05, Ee / 1.02, he(Ee)], 1, 1.2, 'white', 3, { show: [2], draw: 2, head: 'white' }, 20));
      X.points.push({ at: [0.05, 1.05 / 1.02, he(1.05)], show: [2] }, { at: [0.05, 1.1 / 1.02, he(1.1)], show: [2] });
      X.tags.push({ text: 'expected future rate', at: [0.2, 0.9, he(1.2)], ...UP }, { text: 'today’s rate follows', at: [0.05, 1.2 / 1.02, he(1.2)], show: [2] });
      X.dims.push({ from: [0.2, 0.9, 0], to: [0.2, 0.9, he(1.2)], text: 'E<sup>e</sup> = 1 … 1.2', ...UP });
      X.story = [
        { say: 'Won deposits pay 5 percent. Dollar deposits are expected to pay <i>i</i>* + (<i>E</i><sup>e</sup> − <i>E</i>)/<i>E</i> in won. Today’s rate is where the two returns meet.' },
        { say: 'Stack the dollar-return curve by the expected future rate, from 1 to 1.2. The won return, 5 percent, becomes a wall.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [0.05, 1.05, 0.12] }, dur: 1.4 },
        { say: 'Today’s rate follows the expectation: <i>E</i> = <i>E</i><sup>e</sup>/(1 + <i>i</i> − <i>i</i>*). A rise in <i>E</i><sup>e</sup> from 1.05 to 1.10 moves <i>E</i> from 1.03 to 1.08 at once, with no change in trade or output.', dur: 2 },
        { say: 'In 1997 the won fell from 889 per dollar in June to 1,707 in January, and expectations moved before the interest-rate defense began. An exchange rate is an asset price: it jumps when expectations move.', cam: { az: -0.75, el: 0.08, zoom: 0.8, at: [0.05, 1.05, 0.12] } },
      ];
      return X;
    },
  },

  '8.3': {
    dom: { x: [0, 1], y: [0, 1.6] },
    build() {
      // what waiting pays, as a surface over (share withdrawing, guarantee); what withdrawing pays, as a wall
      const X = blank();
      const hg = (g) => g * 0.2;
      const W = (f) => (f < 1 / 1.1 ? (1.5 * (1 - 1.1 * f)) / (1 - f) : 0);
      const wd = (f) => (f <= 1 / 1.1 ? 1.1 : 1 / f);
      X.surfaces.push({ param: (f, g) => [f, Math.max(W(f), g), hg(g)], u: [0, 0.995], v: [0, 1.1], c: 'cobalt', alpha: 0.18, freq: 0, n: 60, ...UP });
      X.surfaces.push({ param: (f, v) => [f, wd(f), v * hg(1.1)], u: [0, 1], v: [0, 1], c: 'madder', alpha: 0.08, freq: 0, n: 30, ...UP });
      X.lines.push(fnLine((f) => [f, Math.max(W(f), 1.1), hg(1.1)], 0, 0.995, 'white', 2.2, { show: [4], draw: 4 }, 80));
      X.lines.push(line([[1, 1, 0], [1, 1, hg(1)], ...range(1, 1.1, 10).map((g) => [1 / g, g, hg(g)])], 'madder', 3, { show: [3], draw: 3, head: 'madder' }));
      X.lines.push(line([[0.25, 1.45, 0], [0.25, 1.45, hg(1.1)]], 'white', 1.6, { dash: true, ...UP }));
      X.points.push({ at: [1, 1, 0], c: 'madder' }, { at: [1 / 1.1, 1.1, hg(1.1)], c: 'madder', size: 10, show: [4] });
      X.agents.push({ asset: 'bank', at: [0.94, 0.18, 0], scale: 0.07 });
      for (const x of [0.58, 0.66, 0.74, 0.82]) X.agents.push({ asset: 'person', at: [x, 0.18, 0], scale: 0.03 });
      X.tags.push({ text: 'deposit guarantee g', at: [0, 1.6, hg(1.1)], ...UP }, { text: 'the run: shrinks above g = 1, gone at 1.1', at: [1 / 1.1, 1.1, hg(1.1)], c: 'madder', show: [3] });
      X.dims.push({ from: [0, 1.6, 0], to: [0, 1.6, hg(1.1)], text: 'g = 0 … 1.1', ...UP });
      X.story = [
        { say: 'What a patient depositor gets by waiting, and by withdrawing, against the share <i>f</i> who withdraw early. If more than 73 percent withdraw, waiting pays less than 1.1, and everyone runs.' },
        { say: 'Stand the deposit guarantee <i>g</i> up as height. The page is <i>g</i> = 0: a good equilibrium and a run.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [0.5, 1.0, 0.1] }, dur: 1.4 },
        { say: 'The guarantee is a floor under what waiting pays. Below <i>g</i> = 1 it changes nothing, because in a full run each depositor still gets 1.', cam: { az: -0.7, el: 0.1, zoom: 0.8, at: [0.7, 1.0, 0.1] } },
        { say: 'Between 1 and 1.1 the full run disappears, but a partial run survives, at <i>f</i> = 1/<i>g</i>.', cam: { az: -0.5, el: 0.1, zoom: 0.65, at: [0.92, 1.05, 0.1] }, dur: 1.6 },
        { say: 'At <i>g</i> = 1.1, the amount promised, waiting never pays less than running. No run is left, and on the equilibrium path the guarantee is never paid.', cam: { az: -0.6, el: 0.12, zoom: 0.85, at: [0.6, 1.1, 0.12] } },
      ];
      return X;
    },
  },

  '8.4': {
    dom: { x: [0, 22], y: [0, 12] },
    build() {
      const X = blank();
      const sd = (w, r) => Math.sqrt(Math.max(0, (1 - w) ** 2 * 100 + w * w * 400 + 2 * w * (1 - w) * r * 200));
      const hr = (r) => (1 - r) * 0.14;
      X.surfaces.push({ param: (w, r) => [sd(w, r), 4 + 6 * w, hr(r)], u: [0, 1], v: [-1, 1], c: 'cobalt', alpha: 0.16, freq: 1, contour: (w, r) => (1 - r) * 2, ...UP });
      X.lines.push(fnLine((r) => { const w = Math.min(1, Math.max(0, (1 - 2 * r) / (5 - 4 * r))); return [sd(w, r), 4 + 6 * w, hr(r)]; }, 1, -1, 'white', 2.8, { show: [2], draw: 2, head: 'white' }, 40));
      X.lines.push(line([[10, 4, 0], [10, 4, hr(-1)]], 'chalk', 1.4, UP), line([[20, 10, 0], [20, 10, hr(-1)]], 'chalk', 1.4, UP));
      X.tags.push({ text: 'correlation ρ: 1 on the page, −1 at the top', at: [20, 10, hr(-1)], ...UP }, { text: 'least risky mix', at: [0, 6, hr(-1)], show: [2] });
      X.dims.push({ from: [22, 0, 0], to: [22, 0, hr(-1)], text: 'ρ = 1 … −1', ...UP });
      X.story = [
        { say: 'Every mix of asset A (return 4 percent, risk 10) and asset B (return 10, risk 20), drawn for five correlations.' },
        { say: 'Raise the correlation as height: <i>ρ</i> = 1 on the page, −1 at the top. The mixes form a surface.', cam: { az: 0.55, el: 0.12, zoom: 0.85, at: [12, 6, 0.1] }, dur: 1.4 },
        { say: 'Follow the least risky mix as <i>ρ</i> falls. At <i>ρ</i> = 0 it holds 20 percent in B and has a risk of 8.9, below either asset alone.', dur: 2.2 },
        { say: 'At <i>ρ</i> = −1 a third in B removes the risk entirely and earns 6 percent. Combining assets that do not move together removes risk without giving up return.', cam: { az: 0.75, el: 0.1, zoom: 0.75, at: [6, 6, 0.14] } },
      ];
      return X;
    },
  },

  '8.5': {
    dom: { x: [0, 10], y: [0, 12] },
    build() {
      const X = blank();
      const ht = (t) => t * 0.03;
      const when = { 2: UP, 4: { show: [2] }, 6: { show: [3] }, 8: { show: [3] } };
      for (const t of [2, 4, 6, 8]) {
        const Q = (9 - t) / 2;
        X.quads.push(flat(0, 1 + Q, Q, 10 - Q, ht(t), 'ochre', 0.14, { w: 1, ...when[t] }));
        X.quads.push({ q: [[Q, 10 - Q, ht(t)], [Q, 1 + Q, ht(t)], [4.5, 5.5, ht(t)], [4.5, 5.5, ht(t)]], c: 'madder', alpha: 0.3, w: 1, ...when[t] });
      }
      X.tags.push({ text: 'tax rate t', at: [10, 0, ht(8)], ...UP }, { text: 't = 2: revenue 7, loss 1', at: [3.5, 6.5, ht(2)], c: 'ochre', ...UP }, { text: 't = 4: revenue 10, loss 4', at: [2.5, 7.5, ht(4)], c: 'ochre', show: [2] }, { text: 't = 8: revenue 4, loss 16', at: [0.5, 9.5, ht(8)], c: 'madder', show: [3] });
      X.dims.push({ from: [10, 0, 0], to: [10, 0, ht(8)], text: 't = 2 … 8', ...UP });
      X.story = [
        { say: 'The market of Figure 1.1 with a tax of 2 a unit. Quantity falls from 4.5 to 3.5; the tax raises 7 and costs 1 in trades that no longer happen.' },
        { say: 'Raise the tax rate as height. At <i>t</i> = 2 the revenue is the ochre rectangle and the loss the red triangle.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [4, 6, 0.1] }, dur: 1.4 },
        { say: 'At <i>t</i> = 4 revenue is 10 and the loss 4. The extra loss for one more unit of revenue has gone from 0.4 to 4.' },
        { say: 'Revenue, <i>t</i>(9 − <i>t</i>)/2, peaks at 4.5; the loss, <i>t</i>²/4, keeps growing. At <i>t</i> = 8 revenue is 4 and the loss 16. That is why broad bases with low rates win.', cam: { az: -0.65, el: 0.12, zoom: 0.85, at: [4, 6, 0.14] } },
      ];
      return X;
    },
  },

  '8.6': {
    dom: { x: [0, 10], y: [0, 12] },
    build() {
      const X = blank();
      const H = 0.3;
      const v = (h, r) => 10 / (1 + r) ** (100 * (1 - h / H));
      // drawn from the damage at the top back down to today
      X.lines.push(line(clipY(range(H, 0, 60).map((h) => [1.5, 2.5 + v(h, 0.014), h]), 0, 12), 'madder', 2.6, { show: [2], draw: 2, head: 'madder' }));
      X.lines.push(line(clipY(range(H, 0, 60).map((h) => [1.5, 2.5 + v(h, 0.045), h]), 0, 12), 'madder', 1.6, { dash: true, show: [3], draw: 3, head: 'madder' }));
      X.lines.push(line([[1.5, 2.5, 0], [1.5, 2.5, H]], 'chalk', 1.4, UP));
      X.points.push({ at: [1.5, 12, H], c: 'madder', size: 10, ...UP }, { at: [1.5, 4.99, 0], c: 'madder', show: [2] }, { at: [1.5, 2.62, 0], c: 'madder', show: [3] });
      X.tags.push({ text: 'damage of 10, a century ahead', at: [1.5, 12, H], c: 'madder', ...UP }, { text: 'today: 2.49 at 1.4%', at: [1.5, 4.99, 0.01], c: 'madder', show: [2] }, { text: '0.12 at 4.5%', at: [1.5, 2.62, 0.01], c: 'madder', show: [3] }, { text: 'years ahead', at: [1.5, 2.5, H * 0.6], ...UP });
      X.dims.push({ from: [1.5, 2.5, 0], to: [1.5, 2.5, H], text: 'year 0 … 100', ...UP });
      X.story = [
        { say: 'Demand and private cost meet at 4.5. Each unit also does 10 of damage, 100 years later, and its present value is a layer on top of private cost.' },
        { say: 'Stand time up. The damage of 10 arrives at the top, a century ahead.', cam: { az: 0.55, el: 0.1, zoom: 0.85, at: [2, 7, 0.15] }, dur: 1.4 },
        { say: 'Discount it back to today at 1.4 percent, the Stern Review’s rate, and 2.49 remains. The efficient output falls from 4.5 to 3.25, and the corrective tax is 2.49.', dur: 2.4 },
        { say: 'At 4.5 percent only 0.12 remains, and the market looks almost efficient as it is. The discount rate decides how much of the future’s cost we see.', dur: 2.4 },
      ];
      return X;
    },
  },

  '8.7': {
    dom: { x: [0, 14], y: [0, 16] },
    build() {
      const X = blank();
      const k = 0.03;
      const Lm = (m) => (m <= 6 ? 4 : m <= 8 ? m - 2 : 14 - m);
      const tops = [];
      for (const m of [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
        const L = Lm(m);
        const y = Math.max(m, 6);
        column(X, L - 0.18, L + 0.18, y, 0.18, L * k, 'cobalt', 0.35, UP);
        tops.push([L, y, L * k]);
      }
      X.lines.push(line(tops, 'white', 2.4, { show: [2], draw: 2, head: 'white' }));
      X.agents.push({ asset: 'firm', at: [12, 2, 0], scale: 0.07 });
      X.tags.push({ text: 'employment as height: most jobs at m = 8', at: [6, 8, 6 * k], c: 'cobalt', show: [2] });
      X.dims.push({ from: [0, 16, 0], to: [0, 16, 6 * k], text: 'employment up to 6, at m = 8', ...UP });
      X.story = [
        { say: 'A single employer facing labor supply <i>w</i> = 2 + <i>L</i> hires 4 at a wage of 6. A price-taking market would employ 6 at 8.' },
        { say: 'Raise employment as height, for every minimum wage from 4 to 13.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [6, 8, 0.1] }, dur: 1.4 },
        { say: 'Up to a minimum of 6 nothing changes. Then employment rises, to 6 at a minimum of 8, and falls to zero at 14: a tent.', dur: 2.2 },
        { say: 'In a price-taking market there is no rising side; employment only falls past 8. Theory alone cannot say whether a minimum wage costs jobs, so the question moved to natural experiments (Card and Krueger 1994).', cam: { az: -0.7, el: 0.1, zoom: 0.8, at: [5, 9, 0.1] } },
      ];
      return X;
    },
  },

  '8.8': {
    dom: { x: [0, 8], y: [0, 16] },
    build() {
      const X = blank();
      for (const d of [0.25, 0.53, 0.8]) {
        const h = d * 0.3;
        const at = d === 0.53 ? { show: [3], rise: 3 } : UP;
        for (let t = 0; t < 7; t++) {
          const w = d ** t;
          X.quads.push(flat(t + 0.12, 0, t + 0.47, 12.5 * w, h, 'cobalt', d === 0.53 ? 0.25 : 0.08, { w: 1, ...at }));
          X.quads.push(flat(t + 0.53, 0, t + 0.88, (t === 0 ? 14.06 : 11.11) * w, h, 'madder', d === 0.53 ? 0.25 : 0.08, { w: 1, ...at }));
        }
        X.tags.push({ text: `δ = ${d}`, at: [7.2, 0, h], ...at });
      }
      X.tags.push({ text: 'at δ = 0.53 the two streams are worth the same', at: [0.5, 14.06, 0.53 * 0.3], show: [3], rise: 3 });
      X.dims.push({ from: [8, 0, 0], to: [8, 0, 0.8 * 0.3], text: 'δ = 0.25 … 0.8', ...UP });
      X.story = [
        { say: 'If both keep the cartel, each earns 12.5 a period. A cheat earns 14.1 once, then the Cournot 11.1 for ever after.' },
        { say: 'Raise how much the firms care about tomorrow as height. Each later period counts <i>δ</i> times the one before, so each stream shrinks into the future.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [4, 8, 0.12] }, dur: 1.6 },
        { say: 'At <i>δ</i> = 0.25 the cheat’s stream is worth more, 17.8 against 16.7. At 0.8 the cartel’s is, 62.5 against 58.5.' },
        { say: 'They are worth the same at <i>δ</i> = 9/17, about 0.53; above it, collusion pays. A cartel is held together by the future, and Figure 4.1 is the <i>δ</i> = 0 slice.', cam: { az: -0.4, el: 0.12, zoom: 0.75, at: [3, 8, 0.16] }, dur: 1.4 },
      ];
      return X;
    },
  },

  '8.9': {
    dom: { x: [0, 10], y: [0, 120] },
    build() {
      const X = blank();
      for (const d of [0, 9, 10]) {
        const h = d * 0.024;
        const now = d === 10;
        const at = d ? { show: [2], rise: 2 } : {};
        X.quads.push(flat(0.7, 0, 1.8, now ? 100 : 70, h, 'cobalt', now ? 0.35 : 0.08, { w: 1, ...at }));
        X.quads.push(flat(2.5, 0, 3.6, 77, h, 'madder', now ? 0.35 : 0.08, { w: 1, ...at }));
        if (d !== 9) X.tags.push({ text: now ? 'day 10: take 100' : `day ${d}`, at: [3.8, 0, h], c: now ? 'cobalt' : '', ...at });
      }
      X.tags.push({ text: 'the day you decide', at: [0, 112, 0.24], show: [2], rise: 2 });
      X.dims.push({ from: [10, 0, 0], to: [10, 0, 10 * 0.024], text: 'day 0 … 10', show: [2], rise: 2 });
      X.story = [
        { say: 'A choice between 100 on day 10 and 110 on day 11. Every future payment is multiplied by <i>β</i> = 0.7; only the present escapes.' },
        { say: 'Seen from day 0 both payments are in the future: 70 against 77. You plan to wait for 110.', cam: { az: -0.35, el: 0.2, zoom: 0.8, at: [2.2, 50, 0] } },
        { say: 'Raise the day on which you decide. Through day 9 the comparison is the same, and the plan stands.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [2.2, 60, 0.12] }, dur: 1.6 },
        { say: 'On day 10 the first payment is now: 100 against 77, and you take 100. An exponential discounter would rank the two the same way on every day.', cam: { az: -0.45, el: 0.1, zoom: 0.7, at: [2.2, 70, 0.22] } },
      ];
      return X;
    },
  },

  '8.10': {
    dom: { x: [0, 30], y: [0, 0.6] },
    build() {
      const X = blank();
      for (const w of [1, 4, 9, 16, 25]) {
        const m = 1 / (2 * Math.sqrt(w));
        column(X, w - 0.35, w + 0.35, m, 0.012, w * 0.008, 'olive', 0.35, UP);
        X.agents.push({ asset: 'firm', at: [w, m, w * 0.008], scale: 0.02 + 0.008 * Math.sqrt(w), rise: 1 });
        if (w < 25) X.lines.push(line([[w, m, 0], [25, 0.1, 0]], 'chalk', 1, { dash: true, o: 0.45, show: [2], draw: 2 }));
      }
      X.tags.push({ text: 'owner’s wealth, as height', at: [25, 0.1, 0.22], ...UP }, { text: 'with credit, all would be here', at: [25, 0.1, 0.01], c: 'chalk', show: [2] });
      X.dims.push({ from: [30, 0, 0], to: [30, 0, 25 * 0.008], text: 'wealth 1 … 25', ...UP });
      X.story = [
        { say: 'A small firm with output √<i>k</i> earns 1/(2√<i>k</i>) on its capital. Without credit, each invests only its owner’s wealth: 1, 4, 9, 16 or 25.' },
        { say: 'Raise each owner’s wealth as height. The poorest firms earn the most at the margin: 50 percent at a wealth of 1, 25 percent at 4, and 10 percent only at 25.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [14, 0.3, 0.1] }, dur: 1.6 },
        { say: 'With credit at 10 percent every firm would invest up to <i>k</i> = 25 and earn the same at the margin. Without it, capital stays where wealth already is.', dur: 1.4 },
        { say: 'Randomized cash grants to small firms in Sri Lanka earned about 5 percent a month (de Mel, McKenzie and Woodruff 2008). High returns at small scale are the fingerprint of a missing market.' },
      ];
      return X;
    },
  },

  '8.11': {
    dom: { x: [0, 16], y: [0.5, 1.8] },
    panel: 1,
    build() {
      const X = blank();
      const As = [3, 3.3, 3.63, 3.99];
      const hs = 0.06;
      const path = [];
      As.forEach((A, i) => {
        X.lines.push(line(clipY(range(3, 16, 40).map((L) => [L, A / Math.sqrt(L), i * hs]), 0.5, 1.8), 'cobalt', 1.4, { o: 0.8, ...(i ? UP : {}) }));
        const Ls = A * A;
        path.push([Ls, 1, i * hs]);
        if (i < As.length - 1) path.push([Ls, As[i + 1] / A, i * hs + 0.02]);
      });
      X.lines.push(line(path, 'white', 2.6, { show: [2], draw: 2, head: 'white' }));
      X.lines.push(line([path[path.length - 1], [15.9, 1.25, 0.24], [16, 1.75, 0.3]], 'white', 2.6, { show: [3], draw: 3, head: 'white' }));
      X.quads.push({ q: [[0, 1, 0], [16, 1, 0], [16, 1, 0.3], [0, 1, 0.3]], c: 'chalk', alpha: 0.06, ...UP });
      X.tags.push({ text: 'centuries', at: [0, 1.8, 0.3], ...UP }, { text: 'back to y* each time', at: [13.2, 1, 2 * hs], c: 'cobalt', show: [2] }, { text: 'after 1800: the escape', at: [16, 1.75, 0.3], show: [3] });
      X.dims.push({ from: [16, 0.5, 0], to: [16, 0.5, 0.3], text: 'centuries, to 1800 and after', ...UP });
      X.story = [
        { say: 'Births and deaths cross at subsistence income <i>y</i>*. For a given technology, income per person falls as population grows.' },
        { say: 'Stack the curves by technology over the centuries, each better technology lifting the whole curve.', cam: { az: -0.55, el: 0.12, zoom: 0.85, at: [10, 1.1, 0.12] }, dur: 1.4 },
        { say: 'Each step in technology lifts income above <i>y</i>*. Births exceed deaths, population grows, and income falls back to <i>y</i>*: a flat ridge, with population climbing beside it.', dur: 2.6 },
        { say: 'Around 1800 technology began to grow faster than population could respond: the escape. Before it, progress made more people, not richer ones.', cam: { az: -0.7, el: 0.12, zoom: 0.8, at: [12, 1.3, 0.16] }, dur: 1.4 },
      ];
      return X;
    },
  },
};
