// Part 3, section 5: what holding still requires (docs/part3-space.md). A
// model's space has what it holds for its floor and what it moves for its
// height; what it leaves out has no axis. Flat, each figure draws the slices
// at a few held values; folded, the held value rises as an axis and the slices
// become a surface whose crossing of zero is the equilibrium.

import { plot } from './figures.js';
import { MODELS, stateOf } from './ontology.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.appendChild(n);
  return n;
};
const P = (host, o) => { const p = plot(host, o); p.o = o; return p; };
function ticks(p, { x = [], y = [], fx = String, fy = String }) {
  const [x0] = p.o.x;
  const [y0] = p.o.y;
  for (const v of x) {
    sv('line', { x1: p.X(v), y1: p.Y(y0), x2: p.X(v), y2: p.Y(y0) + 5, class: 'ln thin' }, p.svg);
    sv('text', { x: p.X(v), y: p.Y(y0) + 19, class: 'lb tick', 'text-anchor': 'middle' }, p.svg).textContent = fx(v);
  }
  for (const v of y) {
    sv('line', { x1: p.X(x0) - 5, y1: p.Y(v), x2: p.X(x0), y2: p.Y(v), class: 'ln thin' }, p.svg);
    sv('text', { x: p.X(x0) - 9, y: p.Y(v) + 4, class: 'lb tick', 'text-anchor': 'end' }, p.svg).textContent = fy(v);
  }
}
const series = (data, file, key) => data[file]?.series?.find((s) => s.key === key)?.points ?? [];

// 3.5: Figure 1.1's market (demand q = 10I − p, supply q = p − 1) as excess
// demand, with income I held: one crossing at every income
const z1 = (p, I) => 10 * I + 1 - 2 * p;
const p1 = (I) => (10 * I + 1) / 2;
const hI = (I) => (I - 1) * 1.0;

// 3.6: an excess demand of the shape unlike households can add up to: with
// x = (p − 5)/1.5 and b = 6ω − 3, z = b − (x³ − 3x). Between ω = 1/6 and 5/6
// it crosses zero three times; the middle crossing is unstable
const xp = (p) => (p - 5) / 1.5;
const px = (x) => 5 + 1.5 * x;
const bw = (w) => 6 * w - 3;
const z2 = (p, w) => { const x = xp(p); return bw(w) - (x * x * x - 3 * x); };
const hW = (w) => w * 0.4;
// the root of x³ − 3x = b on [lo, hi], where the cubic is monotone
function root(b, lo, hi) {
  const f = (x) => x * x * x - 3 * x - b;
  let a = lo;
  let c = hi;
  for (let i = 0; i < 60; i++) {
    const m = (a + c) / 2;
    if (Math.sign(f(m)) === Math.sign(f(a))) a = m; else c = m;
  }
  return (a + c) / 2;
}
const lowBranch = (w) => px(root(bw(w), -3, -1));
const highBranch = (w) => px(root(bw(w), 1, 3));

// 3.7: the United States, unemployment, CPI inflation and expected inflation
function phillips(data) {
  const U = Object.fromEntries(series(data, 'us-phillips', 'unrate'));
  const I = Object.fromEntries(series(data, 'us-phillips', 'cpi_infl'));
  const E = Object.fromEntries(series(data, 'us-phillips', 'mich'));
  const rows = Object.keys(E).filter((y) => U[y] != null && I[y] != null).sort().map((y) => ({ y: Number(y), u: U[y], pi: I[y], pe: E[y] }));
  return rows;
}
// least squares by the normal equations
function ols(X, Y) {
  const k = X[0].length;
  const M = Array.from({ length: k }, (_, i) => [...Array.from({ length: k }, (_, j) => X.reduce((s, x) => s + x[i] * x[j], 0)), X.reduce((s, x, n) => s + x[i] * Y[n], 0)]);
  for (let i = 0; i < k; i++) {
    let p = i;
    for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < k; r++) if (r !== i) { const f = M[r][i] / M[i][i]; M[r] = M[r].map((v, c) => v - f * M[i][c]); }
  }
  const beta = M.map((row, i) => row[k] / row[i]);
  const mean = Y.reduce((s, v) => s + v, 0) / Y.length;
  const fit = X.map((x) => x.reduce((s, v, i) => s + v * beta[i], 0));
  const r2 = 1 - Y.reduce((s, v, n) => s + (v - fit[n]) ** 2, 0) / Y.reduce((s, v) => s + (v - mean) ** 2, 0);
  return { beta, r2 };
}
export function phillipsFits(data) {
  const rows = phillips(data);
  if (rows.length < 5) return null;
  const Y = rows.map((r) => r.pi);
  return {
    rows,
    flat: ols(rows.map((r) => [1, r.u]), Y),
    plane: ols(rows.map((r) => [1, r.u, r.pe]), Y),
  };
}
const kE = 0.034;
const fmt = (v, d = 2) => (v < 0 ? `−${Math.abs(v).toFixed(d)}` : v.toFixed(d));

export const SPACE_FIGS = {
  '3.5'(art) {
    const p = P(art, { x: [2, 9], y: [-8, 10], xl: 'p', yl: 'excess demand z', zero: false, alt: 'Excess demand in the market of Figure 1.1 at three incomes; each line crosses zero once.' });
    p.line(2, 0, 9, 0, 'thin');
    for (const I of [1.4, 1.2, 1]) {
      p.fn((x) => z1(x, I), 2, 9, I === 1 ? 'cb' : 'thin cb faint');
      p.dot(p1(I), 0, 'cb', I === 1 ? 4 : 3);
      p.note(8.0, z1(8.0, I), `I = ${I}`, { dx: 8, dy: -6, cls: 'cb' });
    }
    p.note(p1(1), 0, 'p* = 5.5', { dx: 6, dy: 18, cls: 'cb' });
    ticks(p, { x: [2, 4, 6, 8], y: [-8, -4, 0, 4, 8] });
  },

  '3.6'(art) {
    const p = P(art, { x: [1.5, 8.5], y: [-6, 6], xl: 'p', yl: 'excess demand z', zero: false, alt: 'Excess demand of unlike households at three splits of the endowment; at the middle one it crosses zero three times.' });
    p.line(1.5, 0, 8.5, 0, 'thin');
    for (const w of [0.1, 0.9, 0.5]) {
      p.fn((x) => z2(x, w), 1.5, 8.5, w === 0.5 ? 'md' : 'thin md faint');
      const label = w === 0.1 ? [2.0, z2(2.0, w)] : w === 0.9 ? [7.5, z2(7.5, w)] : [3.4, z2(3.4, w)];
      p.note(label[0], label[1], `ω = ${w}`, { dx: 6, dy: w === 0.5 ? 16 : -6, cls: 'md' });
    }
    const b = bw(0.5);
    for (const x of [root(b, -3, -1), root(b, -1, 1), root(b, 1, 3)]) p.dot(px(x), 0, 'md', x > -1 && x < 1 ? 3 : 4);
    p.dot(lowBranch(0.1), 0, 'md', 3);
    p.dot(highBranch(0.9), 0, 'md', 3);
    ticks(p, { x: [2, 4, 6, 8], y: [-6, -3, 0, 3, 6] });
  },

  '3.7'(art, data) {
    const F = phillipsFits(data);
    const p = P(art, { x: [3, 10.5], y: [-1, 14], xl: 'u (%)', yl: 'π (%)', zero: false, alt: 'US unemployment and CPI inflation, every year from 1978 to 2025; a fitted line is flat.' });
    if (!F) return;
    const [a, b] = F.flat.beta;
    p.line(3, a + b * 3, 10.5, a + b * 10.5, 'k dash');
    p.note(8.4, a + b * 8.4, `π = ${fmt(a, 1)} + ${fmt(b)}u, R² = ${F.flat.r2.toFixed(2)}`, { dx: 0, dy: -10 });
    for (const r of F.rows) {
      p.dot(r.u, r.pi, 'md', 2.8);
      if ([1980, 1982, 1990, 2009, 2020, 2022].includes(r.y)) p.note(r.u, r.pi, String(r.y), { dx: 6, dy: -5, cls: 'md' });
    }
    ticks(p, { x: [4, 6, 8, 10], y: [0, 4, 8, 12] });
  },
};

const blank = () => ({ surfaces: [], quads: [], meshes: [], segs: [], lines: [], points: [], tags: [], eqs: [], agents: [], dims: [] });
const byId = Object.fromEntries(MODELS.map((m) => [m.id, m]));

export const SPACE_CONSTRUCTS = {
  '3.5': {
    dom: { x: [2, 9], y: [-8, 10] },
    build() {
      const X = blank();
      for (const I of [1, 1.2, 1.4]) X.lines.push({ pts: [[2, z1(2, I), hI(I)], [9, z1(9, I), hI(I)]], c: 'cobalt', w: I === 1 ? 2 : 1.4, o: 0.9, show: [1], rise: 1 });
      X.surfaces.push({ param: (p, I) => [p, z1(p, I), hI(I)], u: [2, 9], v: [1, 1.4], c: 'cobalt', alpha: 0.16, freq: 0, n: 24, show: [2] });
      X.lines.push({ pts: [[p1(1), 0, hI(1)], [p1(1.4), 0, hI(1.4)]], c: 'white', w: 2.6, show: [2], draw: 2, head: 'white' });
      X.segs.push({ segs: [[[2, 0, 0], [9, 0, 0]], [[2, 0, 0.4], [9, 0, 0.4]]], c: 'chalk', w: 1, o: 0.5, dash: true, show: [2] });
      X.tags.push(
        { text: 'the sheet crosses zero along one line', at: [p1(1.2), 0, hI(1.2) + 0.03], show: [2] },
        { text: 'slope: dp*/dI = 5', at: [p1(1.4), 0, hI(1.4) + 0.04], c: 'cobalt', show: [3] },
      );
      // off the line the sheet pushes the price back: up where z > 0, down where z < 0
      X.lines.push({ pts: [[3.6, 0, hI(1.2)], [5.6, 0, hI(1.2)]], c: 'ochre', w: 2, show: [4], draw: 4, head: 'ochre' });
      X.lines.push({ pts: [[8.6, 0, hI(1.2)], [7.0, 0, hI(1.2)]], c: 'ochre', w: 2, show: [4], draw: 4, head: 'ochre' });
      X.dims.push({ from: [9.2, -8, 0], to: [9.2, -8, 0.4], text: 'income I, 1 … 1.4', show: [1], rise: 1 });
      X.model = (b) => (b >= 1 ? stateOf(byId['1.1'], b >= 5 ? { lit: ['Labor'] } : {}) : null);
      X.story = [
        { say: 'Figure 1.1’s market, drawn as excess demand: what buyers want minus what sellers offer, at each price. The equilibrium is where it crosses zero. Income is held at I = 1; the faint lines hold it at 1.2 and 1.4.' },
        { say: 'Fold the held value up. Income becomes an axis, and each line lies at its own income.', cam: { az: -0.5, el: 0.2, zoom: 0.9, at: [0.5, 0.45, 0.2] }, dur: 1.6 },
        { say: 'Between the lines the sheet fills in. It crosses the floor of zero along one line: at every income an equilibrium exists, only one, and it moves without a break.', cam: { az: -0.7, el: 0.3 }, dur: 2 },
        { say: 'The slope of that line is what “other things equal” means here: as income rises from 1 to 1.4, the price rises from 5.5 to 7.5, five for every unit of income.', dur: 1.6 },
        { say: 'Off the line, the sheet pushes the price back: excess demand is positive below the equilibrium price and negative above it. The equilibrium is stable.', cam: { az: -0.3, el: 0.45 }, dur: 1.6 },
        { say: 'On the wheel, income is the hatched cell, held. Existence, uniqueness, continuity and stability are each a theorem about this sheet, and each can fail.', cam: { az: 0, el: 0.15, zoom: 1, at: null }, beside: true },
      ];
      return X;
    },
  },

  '3.6': {
    dom: { x: [1.5, 8.5], y: [-6, 6] },
    build() {
      const X = blank();
      for (const w of [0.1, 0.5, 0.9]) {
        const pts = [];
        for (let i = 0; i <= 60; i++) { const p = 1.5 + (7 * i) / 60; pts.push([p, Math.max(-6, Math.min(6, z2(p, w))), hW(w)]); }
        X.lines.push({ pts, c: 'madder', w: w === 0.5 ? 2 : 1.4, o: 0.9, show: [1], rise: 1 });
      }
      X.surfaces.push({ param: (p, w) => [p, Math.max(-6, Math.min(6, z2(p, w))), hW(w)], u: [1.5, 8.5], v: [0, 1], c: 'madder', alpha: 0.14, freq: 0, n: 40, show: [2] });
      // every equilibrium, along x: an S standing on the line z = 0
      const S = [];
      for (let i = 0; i <= 80; i++) {
        const x = -2.1038 + (4.2076 * i) / 80;
        const w = (x * x * x - 3 * x + 3) / 6;
        S.push([px(x), 0, hW(w)]);
      }
      X.lines.push({ pts: S, c: 'white', w: 2.4, show: [2], draw: 2 });
      X.tags.push({ text: 'three equilibria for ω between 1/6 and 5/6; the middle one is unstable', at: [5, 0, hW(0.5) + 0.03], show: [2] });
      // up: the low branch to its end at ω = 5/6, then a jump to the high one
      const up = [];
      for (let i = 0; i <= 40; i++) { const w = (5 / 6) * (i / 40); up.push([lowBranch(Math.min(w, 5 / 6 - 1e-6)), 0, hW(w)]); }
      up.push([highBranch(5 / 6), 0, hW(5 / 6)]);
      for (let i = 1; i <= 8; i++) { const w = 5 / 6 + (1 / 6) * (i / 8); up.push([highBranch(w), 0, hW(w)]); }
      X.lines.push({ pts: up, c: 'ochre', w: 3, show: [3], draw: 3, head: 'ochre' });
      X.tags.push({ text: 'ω = 5/6: the price leaps from 3.5 to 8', at: [5.6, 0, hW(5 / 6) + 0.03], c: 'ochre', show: [3] });
      const down = [];
      for (let i = 0; i <= 40; i++) { const w = 1 - (5 / 6) * (i / 40); down.push([highBranch(Math.max(w, 1 / 6 + 1e-6)), 0, hW(w)]); }
      down.push([lowBranch(1 / 6), 0, hW(1 / 6)]);
      for (let i = 1; i <= 8; i++) { const w = 1 / 6 - (1 / 6) * (i / 8); down.push([lowBranch(w), 0, hW(w)]); }
      X.lines.push({ pts: down, c: 'cobalt', w: 3, show: [4], draw: 4, head: 'cobalt' });
      X.tags.push({ text: 'back down, the jump comes at ω = 1/6, from 6.5 to 2', at: [4.2, 0, hW(1 / 6) - 0.02], c: 'cobalt', show: [4] });
      X.dims.push({ from: [8.8, -6, 0], to: [8.8, -6, 0.4], text: 'endowment split ω, 0 … 1', show: [1], rise: 1 });
      X.model = (b) => (b >= 5 ? { ...stateOf(byId['5.1']), unlike: true, lit: ['Households'] } : b >= 1 ? stateOf(byId['5.1']) : null);
      X.story = [
        { say: 'Households who are each rational, but unlike one another. Sonnenschein, Mantel and Debreu showed that their excess demands can add up to almost any shape. This one crosses zero once, three times, or once, as ω, the split of the endowment between two kinds of household, changes.' },
        { say: 'Fold ω up. Each split lies at its own height.', cam: { az: -0.5, el: 0.2, zoom: 0.9, at: [0.5, 0.5, 0.2] }, dur: 1.6 },
        { say: 'The sheet folds. Its crossing of zero is now an S: between ω = 1/6 and 5/6 there are three equilibria, and in the middle one the sheet slopes the wrong way, so the price runs away from it.', cam: { az: -0.9, el: 0.15 }, dur: 2.2 },
        { say: 'Raise ω slowly. The price follows the low branch until the branch ends at ω = 5/6, then leaps to the high one: a small change in what is held moves the economy a long way.', dur: 2 },
        { say: 'Lower ω again and the price does not leap back at 5/6. It stays high until ω = 1/6. Where the economy is depends on where it came from.', dur: 2 },
        { say: 'Nothing here is irrational. The households are unlike, and it was the representative agent that bought Figure 3.5 its single crossing.', cam: { az: 0, el: 0.15, zoom: 1, at: null }, beside: true },
      ];
      return X;
    },
  },

  '3.7': {
    dom: { x: [3, 10.5], y: [-1, 14] },
    build(data) {
      const X = blank();
      const F = phillipsFits(data);
      if (!F) return X;
      const [a, b, c] = F.plane.beta;
      for (const r of F.rows) X.points.push({ at: [r.u, r.pi, r.pe * kE], c: 'madder', size: 7, show: [1], rise: 1 });
      X.segs.push({ segs: F.rows.map((r) => [[r.u, r.pi, 0], [r.u, r.pi, r.pe * kE]]), c: 'madder', w: 0.8, o: 0.35, show: [1], rise: 1 });
      for (const r of F.rows) if ([1980, 2009, 2022].includes(r.y)) X.tags.push({ text: `${r.y}: expected ${r.pe.toFixed(1)}%`, at: [r.u, r.pi, r.pe * kE + 0.02], c: 'madder', show: [1, 2] });
      // the plane: π = a + bu + cπᵉ, with πᵉ as height
      X.surfaces.push({ param: (u, e) => [u, a + b * u + c * e, e * kE], u: [3.5, 10], v: [1.5, 9], c: 'cobalt', alpha: 0.18, freq: 0, n: 16, show: [2] });
      X.tags.push({ text: `π = ${fmt(a, 1)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(2)}u + ${c.toFixed(2)}πᵉ, R² = ${F.plane.r2.toFixed(2)}`, at: [9.6, a + b * 9.6 + c * 8, 8 * kE + 0.02], c: 'cobalt', show: [2] });
      X.dims.push({ from: [10.4, -1, 0], to: [10.4, -1, 10 * kE], text: 'expected inflation πᵉ, 0 … 10%', show: [1], rise: 1 });
      // seen along the plane: each year less what its expectations account
      // for, on the page, closes into a band around a nearly flat line
      const mE = F.rows.reduce((t, r) => t + r.pe, 0) / F.rows.length;
      for (const r of F.rows) X.points.push({ at: [r.u, r.pi - c * (r.pe - mE), 0.004], c: 'cobalt', size: 7, show: [3] });
      X.lines.push({ pts: [[3.5, a + c * mE + b * 3.5, 0.004], [10, a + c * mE + b * 10, 0.004]], c: 'cobalt', w: 2, show: [3], draw: 3 });
      X.tags.push({ text: `inflation less what expectations account for: π − ${c.toFixed(2)}(πᵉ − ${mE.toFixed(1)})`, at: [9.4, a + c * mE + b * 9.4 + 1.2, 0.01], c: 'cobalt', show: [3, 4] });
      X.model = (b2) => (b2 >= 1 ? { ...stateOf(byId['6.3']), measured: `Expected inflation <b>measured</b><br><i>Michigan survey, ${F.rows[0].y}–${F.rows.at(-1).y}</i>`, lit: b2 >= 5 ? ['Measurement', 'Households'] : ['Households'] } : null);
      X.story = [
        { say: `Unemployment and inflation in the United States, every year from ${F.rows[0].y} to ${F.rows.at(-1).y}. The line fitted through the cloud is flat and explains none of it. Has the Phillips curve been refuted?` },
        { say: 'Figure 6.3 held one value, expected inflation. Here it is measured, by the University of Michigan’s survey of households, and each year rises to it.', cam: { az: -0.55, el: 0.22, zoom: 0.8, at: [0.5, 0.45, 0.15] }, dur: 1.8 },
        { say: `The years lie close to one plane. With the third axis, the same ${F.rows.length} years account for ${Math.round(F.plane.r2 * 100)} percent of the variation in inflation.`, cam: { az: -1.0, el: 0.25 }, dur: 1.8 },
        { say: 'Seen along the plane, the cloud closes up: take from each year what its expectations account for, and the years fall into a narrow band. The flat drawing was the shadow of the plane.', cam: { az: -0.25, el: 0.6, zoom: 0.8, at: [0.5, 0.45, 0.02] }, dur: 2.2 },
        { say: `The plane is steep in expectations and nearly flat in unemployment: ${c.toFixed(2)} against ${fmt(b)}. Once the axis stands, the data do reject something: since ${F.rows[0].y} the short-run trade-off has been small.`, cam: { az: -0.7, el: 0.3, zoom: 0.8, at: [0.5, 0.45, 0.15] }, dur: 1.8 },
        { say: 'The rescue is fair because the axis was named before the test and measured apart from it. An axis found after the test can rescue any cloud. And survey expectations move with recent inflation, so part of the fit is inflation explaining itself: a design is still needed.', cam: { az: 0, el: 0.15, zoom: 1, at: null }, beside: true },
      ];
      return X;
    },
  },
};
