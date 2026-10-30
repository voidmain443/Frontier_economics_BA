// Part 1, flat: the thirty figures of docs/part1-manuscript.md, drawn as SVG.
// Every number here is the manuscript's; each figure is the model solved at the
// value its caption names as held fixed, with faint neighbouring slices where
// the flat page can show them.

import { plot, regressionData } from './figures.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent?.appendChild(e);
  return e;
};

// plot() with its options kept, so ticks and charts can read the ranges
function P(host, o) {
  const p = plot(host, o);
  p.o = o;
  return p;
}

// panels: two drawings side by side ('two') or one above the other ('stack')
function panels(art, mode) {
  art.classList.add('panels', mode);
  if (mode === 'two') art.closest('figure')?.classList.add('wide');
  const a = document.createElement('div');
  const b = document.createElement('div');
  art.append(a, b);
  return [a, b];
}

function ticks(p, { x = [], y = [], fx = String, fy = String, log = false }) {
  const [x0] = p.o.x;
  const [y0] = p.o.y;
  for (const v of x) {
    sv('line', { x1: p.X(v), y1: p.Y(y0), x2: p.X(v), y2: p.Y(y0) + 5, class: 'ln thin' }, p.svg);
    sv('text', { x: p.X(v), y: p.Y(y0) + 19, class: 'lb tick', 'text-anchor': 'middle' }, p.svg).textContent = fx(v);
  }
  for (const v of y) {
    const yy = log ? Math.log10(v) : v;
    sv('line', { x1: p.X(x0) - 5, y1: p.Y(yy), x2: p.X(x0), y2: p.Y(yy), class: 'ln thin' }, p.svg);
    sv('text', { x: p.X(x0) - 9, y: p.Y(yy) + 4, class: 'lb tick', 'text-anchor': 'end' }, p.svg).textContent = fy(v);
  }
}

// drawings that sit side by side are drawn on a smaller sheet, so their type keeps its size
const H2 = { w: 440, h: 360 };

// a closed outline (not filled)
const box = (p, x0, y0, x1, y1, cls = 'k thin dash') => p.pathPts([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], cls);
const rect = (p, x0, y0, x1, y1, cls) => p.area([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cls);
// a circle in data units, broken where it leaves the plot
function circle(p, cx, cy, r, cls) {
  const [x0, x1] = p.o.x;
  const [y0, y1] = p.o.y;
  let run = [];
  for (let i = 0; i <= 240; i++) {
    const a = (2 * Math.PI * i) / 240;
    const q = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    if (q[0] >= x0 && q[0] <= x1 && q[1] >= y0 && q[1] <= y1) run.push(q);
    else { if (run.length > 1) p.pathPts(run, cls); run = []; }
  }
  if (run.length > 1) p.pathPts(run, cls);
}

// ---------- data ----------

const pts = (data, file, key) => data?.[file]?.series.find((s) => s.key === key)?.points ?? [];
const yearOf = (t) => {
  const [y, m = '7', d = '1'] = String(t).split('-');
  if (String(t).length <= 4) return +y;
  return +y + (+m - 1) / 12 + (+d - 1) / 365;
};

// A small time chart on its own axes.
function chart(host, o) {
  const log = !!o.log;
  const yr = log ? o.y.map(Math.log10) : o.y;
  const p = P(host, { w: o.w ?? 640, h: o.h ?? 250, x: o.x, y: yr, zero: false, pad: { l: 62, r: 22, t: 34, b: 38 }, alt: o.alt });
  p.svg.classList.add('chart');
  if (o.band) rect(p, o.band[0], yr[0], o.band[1], yr[1], 'f-ochre');
  for (const s of o.series) {
    const run = s.pts.map(([t, v]) => [yearOf(t), log ? Math.log10(v) : v]).filter(([t, v]) => t >= o.x[0] && t <= o.x[1] && Number.isFinite(v));
    if (run.length > 1) p.pathPts(run, s.cls ?? 'k');
    if (s.label && run.length) {
      const [lx, ly] = s.at ? run.reduce((m, q) => (Math.abs(q[0] - s.at) < Math.abs(m[0] - s.at) ? q : m)) : run[run.length - 1];
      p.note(lx, ly, s.label, { dx: s.at ? 0 : 6, dy: s.dy ?? 4, anchor: s.at ? 'middle' : 'start', cls: s.lcls ?? '' });
    }
  }
  ticks(p, { x: o.xt ?? [], y: o.yt ?? [], fx: o.fx ?? String, fy: o.fy ?? String, log });
  sv('text', { x: p.X(o.x[0]), y: 18, class: 'lb ptitle' }, p.svg).textContent = o.title ?? '';
  return p;
}

// ---------- the figures ----------

export const FIGS = {
  // ===== Stage 1
  '1.1'(art) {
    const p = P(art, { x: [0, 10], y: [0, 15], xl: 'Q', yl: 'P', alt: 'Supply and demand, with demand drawn at several incomes.' });
    for (const I of [1.1, 1.3, 1.4]) p.fn((q) => 10 * I - q, 0, 10, 'thin cb faint');
    for (const I of [1, 1.1, 1.2, 1.3, 1.4]) p.note(0.12, 10 * I - 0.12, `I = ${I}`, { dx: 4, dy: -5, cls: I === 1 ? '' : 'cb' });
    p.fn((q) => 10 - q, 0, 10, 'k');
    p.fn((q) => 12 - q, 0, 10, 'cb');
    p.fn((q) => 1 + q, 0, 10, 'md');
    p.guide(4.5, 0, 4.5, 5.5); p.guide(0, 5.5, 4.5, 5.5);
    p.guide(5.5, 0, 5.5, 6.5); p.guide(0, 6.5, 5.5, 6.5);
    p.dot(4.5, 5.5); p.dot(5.5, 6.5, 'cb');
    p.label(4.5, 5.5, 'E', { dx: 10, dy: 18 });
    p.label(5.5, 6.5, 'E′', { dx: 10, dy: 18, cls: 'cb' });
    p.label(9.2, 0.8, 'D', { dx: 6, dy: -6 });
    p.label(9.6, 2.4, 'D′', { dx: 6, dy: -4, cls: 'cb' });
    p.label(9.5, 10.5, 'S', { dx: 8, dy: 6, cls: 'md' });
  },

  '1.2'(art) {
    const p = P(art, { x: [0, 20], y: [0, 20], xl: 'trades', yl: 'P', alt: 'Twenty buyers and twenty sellers as staircases, with the gains, the tax and the lost trades shaded.' });
    for (let i = 0; i < 7; i++) {
      rect(p, i, 13, i + 1, 19.5 - i, 'f-cobalt');
      rect(p, i, 0.5 + i, i + 1, 7, 'f-olive');
    }
    rect(p, 0, 7, 7, 13, 'f-ochre');
    for (let i = 7; i < 10; i++) rect(p, i, 0.5 + i, i + 1, 19.5 - i, 'f-madder');
    const dem = [];
    const sup = [];
    for (let i = 0; i < 20; i++) {
      dem.push([i, 19.5 - i], [i + 1, 19.5 - i]);
      sup.push([i, 0.5 + i], [i + 1, 0.5 + i]);
    }
    p.pathPts(dem, 'cb');
    p.pathPts(sup, 'ol');
    p.guide(0, 10, 10, 10);
    p.line(0, 13, 7, 13, 'k thin dash');
    p.line(0, 7, 7, 7, 'k thin dash');
    p.note(0, 13, 'buyers pay 13', { dx: -6, dy: 4, anchor: 'end' });
    p.note(0, 10, 'no tax: 10', { dx: -6, dy: 4, anchor: 'end' });
    p.note(0, 7, 'sellers keep 7', { dx: -6, dy: 4, anchor: 'end' });
    p.note(3.5, 10, 'tax 6 × 7 = 42', { anchor: 'middle', dy: 4, cls: 'oc' });
    p.note(10.4, 12.4, 'lost: 5 + 3 + 1', { dy: 4, cls: 'md' });
    p.label(14.6, 5.6, 'willingness to pay', { cls: 'cb note' });
    p.label(13.5, 16.5, 'cost', { cls: 'ol note' });
  },

  '1.3'(art) {
    const p = P(art, { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Demand curves through one point at different horizons, steeper in the short run.' });
    rect(p, 0, 0, 5, 5, 'f-hatch');
    const through = (e, cls) => p.fn((q) => 5 - (q - 5) / e, 0, 12, cls);
    through(0.6, 'thin faint cb');
    through(1.0, 'thin faint cb');
    through(0.2, 'k');
    through(1.5, 'cb');
    box(p, 0, 0, 4.9, 5.5, 'k thin dash');
    box(p, 0, 0, 4.25, 5.5, 'cb thin dash');
    p.dot(5, 5);
    p.dot(4.9, 5.5); p.dot(4.25, 5.5, 'cb');
    p.label(5, 5, 'A', { dx: 10, dy: 16 });
    p.note(5.3, 11.4, 'first month, |ε| = 0.2', {});
    p.note(11.2, 0.95, 'five years, |ε| = 1.5', { anchor: 'end', dy: -10, cls: 'cb' });
    p.note(2.5, 2.9, 'R = 25', { anchor: 'middle' });
    p.note(2.5, 1.9, 'after P + 10%:', { anchor: 'middle' });
    p.note(2.5, 1.2, '27, later 23.4', { anchor: 'middle' });
  },

  // ===== Stage 2
  '2.1'(art) {
    const p = P(art, { x: [0, 14], y: [0, 14], xl: 'x', yl: 'y', alt: 'Indifference curves and a budget line touching at six and six.' });
    for (const u of [4, 6, 8]) p.fn((x) => (u * u) / x, (u * u) / 14, 14, u === 6 ? 'cb' : 'thin cb faint');
    p.line(0, 12, 12, 0, 'k');
    p.guide(6, 0, 6, 6); p.guide(0, 6, 6, 6);
    p.dot(6, 6, 'cb');
    p.label(6, 6, '(6, 6)', { dx: 10, dy: -8 });
    p.note(13.8, 36 / 13.8, 'u = 6', { anchor: 'end', dy: -8, cls: 'cb' });
    p.note(13.8, 64 / 13.8, 'u = 8', { anchor: 'end', dy: -8, cls: 'cb' });
    p.note(12, 0, 'x + y = 12', { dx: -4, dy: -10, anchor: 'end' });
  },

  '2.2'(art) {
    const [top, bot] = panels(art, 'stack');
    const p = P(top, { x: [0, 14], y: [0, 14], xl: 'x', yl: 'y', alt: 'A price rise split into substitution and income effects.' });
    p.fn((x) => 36 / x, 36 / 14, 14, 'cb');
    p.fn((x) => 18 / x, 18 / 14, 14, 'thin cb');
    p.line(0, 12, 12, 0, 'k');
    p.line(0, 12, 6, 0, 'md');
    p.fn((x) => 16.97 - 2 * x, 0, 8.49, 'thin md dash');
    p.dot(6, 6); p.dot(3, 6, 'md'); p.dot(4.24, 8.49, 'cb');
    p.label(6, 6, 'A', { dx: 8, dy: -8 });
    p.label(3, 6, 'B', { dx: -16, dy: -8 });
    p.label(4.24, 8.49, 'C', { dx: 8, dy: -6, cls: 'cb' });
    p.guide(6, 0, 6, 6); p.guide(3, 0, 3, 6); p.guide(4.24, 0, 4.24, 8.49);
    p.arrow(6, 0.6, 4.3, 0.6, 'cb'); p.arrow(4.24, 1.3, 3.05, 1.3, 'md');
    p.note(5.2, 0.6, 'substitution −1.76', { dx: 26, dy: 4, cls: 'cb' });
    p.note(3.6, 1.3, 'income −1.24', { dx: 30, dy: 4, cls: 'md' });
    const q = P(bot, { x: [0, 14], y: [0, 3.2], xl: 'x', yl: 'p_x', h: 250, alt: 'The same choices plotted against the price: the demand curve.' });
    q.param((t) => [6 / t, t], 0.45, 3.2, 'k');
    q.param((t) => [6 / Math.sqrt(t), t], 0.2, 3.2, 'cb dash');
    q.dot(6, 1); q.dot(3, 2, 'md'); q.dot(4.24, 2, 'cb');
    q.guide(0, 1, 6, 1); q.guide(0, 2, 4.24, 2);
    q.note(1.9, 3.1, 'x = 6/p', { anchor: 'end', dx: -6, dy: 4 });
    q.note(3.4, 3.1, 'compensated', { dx: 8, dy: 4, cls: 'cb' });
  },

  '2.3'(art) {
    const p = P(art, { x: [0, 12], y: [0, 12], xl: 'c_1', yl: 'c_2', alt: 'Choice between consumption now and later.' });
    p.fn((c) => 10.5 - c, 0, 10.5, 'thin faint k');
    p.fn((c) => 4.5 + 1.6 * (6 - c), 0, 8.81, 'thin faint k');
    p.fn((c) => 4.5 + 1.25 * (6 - c), 0, 9.6, 'k');
    p.fn((c) => 28.8 / c, 28.8 / 12, 12, 'cb');
    p.dot(6, 4.5); p.dot(4.8, 6, 'cb');
    p.label(6, 4.5, 'endowment', { dx: 10, dy: 18, cls: 'note' });
    p.label(4.8, 6, '(4.8, 6.0)', { dx: 10, dy: -10, cls: 'cb' });
    p.guide(4.8, 0, 4.8, 6); p.guide(6, 0, 6, 4.5);
    p.note(8.9, 0.6, 'r = 0.6', { anchor: 'end', dy: -6 });
    p.note(10.4, 0.1, 'r = 0', { anchor: 'end', dy: -6 });
    p.arrow(5.9, 0.9, 4.95, 0.9, 'cb');
    p.note(5.4, 0.9, 'saves 1.2', { anchor: 'middle', dy: -8, cls: 'cb' });
  },

  // ===== Stage 3
  '3.1'(art) {
    const p = P(art, { x: [0, 12], y: [1.5, 5.5], xl: 'Q', yl: 'cost', zero: false, alt: 'Five short-run average cost curves and their lower envelope.' });
    ticks(p, { x: [2, 4, 6, 8, 10], y: [2, 3, 4, 5] });
    const L = (q) => 2 + 0.06 * (q - 6) ** 2;
    const dL = (q) => 0.12 * (q - 6);
    const a = 0.22;
    for (const k of [2, 4, 6, 8, 10]) {
      const s = (q) => L(k) + dL(k) * (q - k) + a * (q - k) ** 2;
      p.fn(s, Math.max(0.2, k - 3.0), Math.min(12, k + 3.0), 'thin cb');
      p.dot(k, L(k), 'cb');
      const m = k - dL(k) / (2 * a);
      if (k !== 6) p.ring(m, s(m), 'cb', 3.5);
    }
    p.fn(L, 0.4, 11.6, 'thick');
    p.note(11.4, L(11.4), 'LRAC', { dx: 6, dy: 4 });
    p.note(6, 2, 'K = 3', { anchor: 'middle', dy: 22, cls: 'cb' });
    p.note(2, L(2), 'K = 1', { anchor: 'middle', dy: 24, cls: 'cb' });
    p.note(10, L(10), 'K = 5', { anchor: 'middle', dy: 24, cls: 'cb' });
  },

  '3.2'(art) {
    const p = P(art, { x: [0, 60], y: [0, 6], xl: 'Q', yl: 'P', alt: 'Industry supply moving out as firms enter, the price falling toward 2.' });
    const qOf = (P0) => 4 + Math.sqrt(4 + (P0 - 2) / 0.18);
    p.fn((Q) => (60 - Q) / 8, 12, 60, 'k');
    p.line(0, 2, 60, 2, 'md dash');
    for (const N of [3, 4, 5, 6, 7]) {
      p.param((t) => [N * qOf(t), t], 2, 6, N === 3 ? 'ol' : 'thin ol');
      let lo = 2;
      let hi = 6;
      for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        if (N * qOf(m) > 60 - 8 * m) hi = m; else lo = m;
      }
      p.dot(N * qOf(lo), lo, 'ol');
      p.note(N * qOf(6), 6, `N = ${N}`, { anchor: 'middle', dy: -6, cls: 'ol' });
      p.note(N * qOf(lo), lo, lo.toFixed(1), { dx: 8, dy: -6 });
    }
    p.note(58, 2, 'long-run supply', { anchor: 'end', dy: 18, cls: 'md' });
    p.note(14, 5.75, 'demand', { dy: -4 });
  },

  // ===== Stage 4
  '4.1'(art) {
    const p = P(art, { x: [0, 10], y: [0, 10], xl: 'q_1', yl: 'q_2', alt: 'Two reaction curves crossing, with the two firms’ profit contours through the crossing.' });
    const c = 100 / 9;
    const lens = [];
    for (let i = 0; i <= 40; i++) { const q = 5 / 3 + ((10 / 3 - 5 / 3) * i) / 40; lens.push([q, 10 - q - c / q]); }
    for (let i = 0; i <= 40; i++) { const q = 10 / 3 - ((10 / 3 - 5 / 3) * i) / 40; lens.push([10 - q - c / q, q]); }
    p.area(lens, 'f-ochre');
    p.fn((q) => 10 - q - c / q, 1.4, 8.6, 'thin cb');
    p.param((t) => [10 - t - c / t, t], 1.4, 8.6, 'thin md');
    p.line(5, 0, 0, 10, 'cb');
    p.line(0, 5, 10, 0, 'md');
    p.dot(10 / 3, 10 / 3);
    p.ring(2.5, 2.5, 'k');
    p.label(10 / 3, 10 / 3, 'Nash', { dx: 10, dy: -8 });
    p.note(2.5, 2.5, 'cartel', { dx: -8, dy: 16, anchor: 'end' });
    p.note(0.2, 9.6, 'firm 1’s reaction', { dx: 8, cls: 'cb' });
    p.note(0.2, 4.9, 'firm 2’s reaction', { dx: 8, dy: -8, cls: 'md' });
    p.note(7.2, 10 - 7.2 - c / 7.2, 'firm 1’s profit 11.1', { dx: 6, dy: -4, cls: 'cb' });
    p.note(10 - 7.6 - c / 7.6, 7.6, 'firm 2’s profit 11.1', { dx: 8, cls: 'md' });
  },

  '4.2'(art) {
    const p = P(art, { w: 760, h: 340, x: [0, 100], y: [0, 60], axes: false, pad: { l: 10, r: 10, t: 10, b: 10 }, alt: 'The entry game as a table with two equilibria, and as a tree in which only one survives.' });
    const X0 = 14; const X1 = 30; const X2 = 46; const Yh = 52; const Y0 = 44; const Y1 = 30; const Y2 = 16;
    for (const y of [Y0, Y1, Y2]) p.line(X0, y, X2, y, 'k thin');
    for (const x of [X0, X1, X2]) p.line(x, Y0, x, Y2, 'k thin');
    p.note((X0 + X1) / 2, Yh, 'Fight', { anchor: 'middle' });
    p.note((X1 + X2) / 2, Yh, 'Accommodate', { anchor: 'middle' });
    p.note(X0, (Y0 + Y1) / 2, 'Out', { anchor: 'end', dx: -8, dy: 4 });
    p.note(X0, (Y1 + Y2) / 2, 'In', { anchor: 'end', dx: -8, dy: 4 });
    const cell = (cx, cy, s, cls = '') => p.label(cx, cy, s, { anchor: 'middle', dy: 6, roman: true, cls });
    cell((X0 + X1) / 2, (Y0 + Y1) / 2, '0, 10'); cell((X1 + X2) / 2, (Y0 + Y1) / 2, '0, 10');
    cell((X0 + X1) / 2, (Y1 + Y2) / 2, '−1, 2'); cell((X1 + X2) / 2, (Y1 + Y2) / 2, '3, 5');
    box(p, X0 + 1.2, Y1 + 1.6, X1 - 1.2, Y0 - 1.6, 'cb');
    box(p, X1 + 1.2, Y2 + 1.6, X2 - 1.2, Y1 - 1.6, 'cb');
    p.note(30, 8, 'two Nash equilibria (ringed)', { anchor: 'middle', cls: 'cb' });
    // the tree
    const root = [70, 52]; const out = [58, 32]; const inc = [84, 32]; const fight = [76, 12]; const acc = [93, 12];
    p.line(...root, ...out, 'k');
    p.line(...root, ...inc, 'cb thick');
    p.line(...inc, ...fight, 'md dash');
    p.line(...inc, ...acc, 'cb thick');
    for (const n of [root, inc]) p.dot(...n);
    p.note(...root, 'entrant', { dy: -10, anchor: 'middle' });
    p.note(...inc, 'incumbent', { dx: 10, dy: -4 });
    p.note(63, 43, 'Out', { anchor: 'end' }); p.note(78, 43, 'In', { cls: 'cb' });
    p.note(79, 22, 'Fight', { anchor: 'end', cls: 'md' }); p.note(89, 22, 'Accommodate', { cls: 'cb' });
    p.label(...out, '0, 10', { anchor: 'middle', dy: 22, roman: true });
    p.label(...fight, '−1, 2', { anchor: 'middle', dy: 22, roman: true, cls: 'md' });
    p.label(...acc, '3, 5', { anchor: 'middle', dy: 22, roman: true, cls: 'cb' });
  },

  // ===== Stage 5
  '5.1'(art) {
    const p = P(art, { x: [0, 10], y: [0, 10], axes: false, pad: { l: 50, r: 50, t: 40, b: 46 }, alt: 'An Edgeworth box with the endowment, the lens of mutually better trades and the equilibrium on the diagonal.' });
    const lens = [];
    for (let i = 0; i <= 60; i++) { const x = 2 + (6 * i) / 60; lens.push([x, 16 / x]); }
    for (let i = 0; i <= 60; i++) { const x = 8 - (6 * i) / 60; lens.push([x, 10 - 16 / (10 - x)]); }
    p.area(lens, 'f-ochre');
    box(p, 0, 0, 10, 10, 'k');
    p.line(0, 0, 10, 10, 'k thin dash');
    for (const u of [16, 25]) {
      p.fn((x) => u / x, u / 10, 10, u === 25 ? 'cb' : 'thin cb');
      p.fn((x) => 10 - u / (10 - x), 0, 10 - u / 10, u === 25 ? 'md' : 'thin md');
    }
    p.line(0, 10, 10, 0, 'k');
    p.dot(8, 2); p.dot(5, 5, 'cb');
    p.label(8, 2, 'ω', { dx: 8, dy: 16 });
    p.label(5, 5, 'E', { dx: 10, dy: -6 });
    p.label(0, 0, 'A', { dx: -18, dy: 18 });
    p.label(10, 10, 'B', { dx: 8, dy: -6 });
    p.note(10, 0, 'x_A →', { anchor: 'end', dy: 22 });
    p.note(0, 10, 'y_B ←', { dy: -8 });
    p.note(7.6, 7.6, 'contract curve', { dx: 8, dy: 14 });
  },

  '5.2'(art) {
    const p = P(art, { x: [0, 10], y: [0, 32], xl: 'G', yl: 'value', alt: 'Willingness to pay for a public good added vertically for one, two and three households.' });
    const cls = { 1: 'k', 2: 'cb', 3: 'cb thick' };
    for (const n of [1, 2, 3]) {
      p.fn((g) => n * (10 - g), 0, 10, cls[n]);
      const g = 10 - 6 / n;
      p.dot(g, 6, n === 1 ? 'k' : 'cb');
      p.guide(g, 0, g, 6);
      p.note(g, 0, `G* = ${g}`, { anchor: 'middle', dy: 34 });
      p.note(0, 10 * n, `n = ${n}`, { dx: 8, dy: -6, cls: n > 1 ? 'cb' : '' });
    }
    p.line(0, 6, 10, 6, 'md');
    p.note(10, 6, 'cost 6', { anchor: 'end', dy: -8, cls: 'md' });
    p.note(4, 6, 'voluntary giving stops', { dx: -6, dy: 20, anchor: 'end' });
  },

  '5.3'(art) {
    const p = P(art, { x: [0, 100], y: [0, 14], xl: 'cars, ranked by quality', yl: 'value', alt: 'A used-car market in which the best forty cars are not traded.' });
    p.area([[60, 6], [100, 10], [100, 13], [60, 9]], 'f-madder');
    p.area([[0, 0], [60, 6], [60, 9], [0, 3]], 'f-olive');
    p.fn((q) => q / 10, 0, 100, 'ol');
    p.fn((q) => q / 10 + 3, 0, 100, 'cb dash');
    p.fn((q) => q / 20 + 3, 0, 100, 'cb');
    p.dot(60, 6);
    p.guide(60, 0, 60, 6); p.guide(0, 6, 60, 6);
    p.label(60, 6, 'p = 6', { dx: 10, dy: 18 });
    p.note(99, 9.9, 'seller’s value θ', { anchor: 'end', dy: 30, cls: 'ol' });
    p.note(99, 13, 'buyer’s value θ + 3', { anchor: 'end', dy: -8, cls: 'cb' });
    p.note(26, 26 / 20 + 3, 'what buyers pay: p/2 + 3', { dy: 18, cls: 'cb' });
    p.note(78, 10.2, '40 best cars stay home', { anchor: 'middle', dy: 4, cls: 'md' });
  },

  // ===== Stage 6
  '6.1'(art, data) {
    const [top, bot] = panels(art, 'stack');
    const p = P(top, { x: [0, 16], y: [0, 2.8], xl: 'k', yl: '', alt: 'The Solow diagram with two saving rates.' });
    p.fn((k) => k ** 0.35, 0, 16, 'thin');
    p.fn((k) => 0.3 * k ** 0.35, 0, 16, 'cb');
    p.fn((k) => 0.4 * k ** 0.35, 0, 16, 'cb dash');
    p.fn((k) => 0.08 * k, 0, 16, 'md');
    const k1 = 3.75 ** (1 / 0.65);
    const k2 = 5 ** (1 / 0.65);
    p.dot(k1, 0.08 * k1, 'cb'); p.dot(k2, 0.08 * k2, 'cb');
    p.guide(k1, 0, k1, 0.08 * k1); p.guide(k2, 0, k2, 0.08 * k2);
    p.note(k1, 0, 'k* = 7.6', { anchor: 'middle', dy: 34 });
    p.note(k2, 0, '11.9', { anchor: 'middle', dy: 34 });
    p.note(15.8, 15.8 ** 0.35, 'f(k)', { anchor: 'end', dy: -8 });
    p.note(15.8, 0.3 * 15.8 ** 0.35, '0.3 f(k)', { anchor: 'end', dy: 16, cls: 'cb' });
    p.note(15.8, 0.4 * 15.8 ** 0.35, '0.4 f(k)', { anchor: 'end', dy: -8, cls: 'cb' });
    p.note(15.8, 0.08 * 15.8, '0.08 k', { anchor: 'end', dy: -8, cls: 'md' });
    for (const k of [2, 5, 9, 12]) p.arrow(k, 0.12, k + (k < k1 ? 0.9 : -0.9), 0.12, 'k thin');
    const [c1, c2] = panels(bot, 'two');
    const g = pts(data, 'korea-growth', 'rgdppc');
    const base = g.find(([t]) => t === '1960')?.[1];
    chart(c1, { title: 'Korea: real GDP per person (1960 = 1)', x: [1960, 2025], y: [1, 50], log: true,
      series: [{ pts: base ? g.map(([t, v]) => [t, v / base]) : [], cls: 'k' }], xt: [1960, 1990, 2025], yt: [1, 3, 10, 36], w: 440, h: 260 });
    chart(c2, { title: 'Fixed investment, % of GDP', x: [1960, 2025], y: [0, 45],
      series: [{ pts: pts(data, 'korea-growth', 'gfcf_share'), cls: 'cb' }], xt: [1960, 1991, 2025], yt: [0, 11, 38], w: 440, h: 260 });
  },

  '6.2'(art) {
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, x: [5, 12], y: [0, 6], xl: 'Y', yl: 'r', zero: false, alt: 'IS and three LM curves, one per price level.' });
    p.fn((y) => 9 - 0.75 * y, 5, 12, 'k');
    const eq = (P0) => (9 + 6 / P0) / 1.65;
    for (const [P0, cls] of [[1, 'cb'], [1.5, 'cb thin'], [2, 'cb thin faint']]) {
      p.fn((y) => 0.9 * y - 6 / P0, 5, 12, cls);
      const Y = eq(P0);
      p.dot(Y, 9 - 0.75 * Y, 'cb');
      p.note(11.9, 0.9 * 11.9 - 6 / P0, `LM, P = ${P0}`, { anchor: 'end', dx: -6, dy: 2, cls: 'cb' });
    }
    p.note(5.2, 9 - 0.75 * 5.2, 'IS', { dx: 6, dy: -8 });
    ticks(p, { x: [5, 7.27, 9.09, 12], y: [0, 3, 6], fx: (v) => (v % 1 ? v.toFixed(2) : String(v)) });
    const q = P(r, { ...H2, x: [5, 12], y: [0, 2.6], xl: 'Y', yl: 'P', zero: false, alt: 'Aggregate demand traced by the IS–LM equilibria.' });
    q.param((P0) => [eq(P0), P0], 0.85, 2.6, 'k');
    for (const P0 of [1, 1.5, 2]) { q.dot(eq(P0), P0, 'cb'); q.guide(5, P0, eq(P0), P0); }
    q.note(eq(2.5), 2.5, 'AD', { dx: 8 });
    ticks(q, { x: [5, 7.27, 9.09, 12], y: [1, 1.5, 2], fx: (v) => (v % 1 ? v.toFixed(2) : String(v)) });
  },

  '6.3'(art, data) {
    const p = P(art, { x: [2, 11], y: [0, 16], xl: 'u (%)', yl: 'π (%)', zero: false, alt: 'Short-run Phillips curves stacked by expected inflation, with the United States 1960 to 1986.' });
    for (const pe of [2, 5, 8, 11, 14]) {
      p.fn((u) => pe - 1.2 * (u - 5), 2, 11, 'thin cb faint');
      p.note(2.05, pe + 3.6, `π^e = ${pe}`, { dx: 4, dy: 4, cls: 'cb' });
    }
    p.line(5, 0, 5, 16, 'k dash');
    const U = Object.fromEntries(pts(data, 'us-phillips', 'unrate'));
    const I = Object.fromEntries(pts(data, 'us-phillips', 'cpi_infl'));
    const path = [];
    for (let y = 1960; y <= 1986; y++) if (U[y] != null && I[y] != null) path.push([U[y], I[y], y]);
    if (path.length) {
      p.pathPts(path.map(([u, i]) => [u, Math.max(0, i)]), 'md');
      for (const [u, i, y] of path) {
        p.dot(u, Math.max(0, i), 'md', 2.6);
        if ([1960, 1969, 1974, 1975, 1980, 1983, 1986].includes(y)) p.note(u, i, String(y), { dx: 7, dy: -5, cls: 'md' });
      }
    }
    ticks(p, { x: [2, 5, 8, 11], y: [0, 5, 10, 15] });
  },

  '6.4'(art) {
    const p = P(art, { w: 560, h: 540, x: [2, 10], y: [0, 8], xl: 'u (%)', yl: 'π (%)', zero: false, alt: 'Loss circles around the target and the Phillips curve; the bank picks the closest point.' });
    for (const r of [1, 1.92, 3]) circle(p, 5, 2, r, r === 1.92 ? 'oc' : 'thin oc');
    for (const pe of [2, 8]) p.fn((u) => pe - 1.2 * (u - 5), 2, 10, 'thin cb faint');
    p.fn((u) => 5 - 1.2 * (u - 5), 2, 10, 'cb');
    p.fn((u) => 2 + (u - 5) / 1.2, 2.6, 10, 'md dash');
    p.dot(5, 2, 'oc');
    const x = 7.2 / 4.88;
    p.dot(5 + x, 5 - 1.2 * x, 'cb');
    for (const pe of [2, 8]) { const z = (1.2 * (pe - 2)) / 2.44; p.ring(5 + z, pe - 1.2 * z, 'cb', 3.5); }
    p.label(5, 2, 'target', { dx: -10, dy: 20, anchor: 'end', cls: 'note oc' });
    p.label(5 + x, 5 - 1.2 * x, '(6.5, 3.2)', { dx: 10, dy: -8, cls: 'cb' });
    p.note(9.7, 2 + 4.7 / 1.2, 'monetary rule', { anchor: 'end', dy: -8, cls: 'md' });
    p.note(2.6, 5 - 1.2 * (2.6 - 5), 'π^e = 5', { dx: 6, dy: -6, cls: 'cb' });
    ticks(p, { x: [2, 5, 8], y: [0, 2, 4, 6, 8] });
  },

  // ===== Stage 7
  '7.1'(art) {
    const { pts: P3, fit } = regressionData();
    const p = P(art, { x: [0, 10], y: [0, 14], xl: 'x_1', yl: 'y', alt: 'A scatter whose fitted slope is about one, with the true slope of one half at three values of a hidden variable.' });
    for (const x2 of [1, 3, 5]) {
      p.fn((x1) => 1 + 0.5 * x1 + 0.8 * x2, 0, 10, 'thin cb');
      p.note(10, 1 + 5 + 0.8 * x2, `x₂ = ${x2}`, { dx: 6, dy: 4, cls: 'cb' });
    }
    for (const [x1, x2, y] of P3) {
      const d = p.dot(x1, y, 'cb', 4);
      d.setAttribute('fill-opacity', (0.18 + 0.82 * Math.min(1, x2 / 7)).toFixed(2));
    }
    p.fn((x1) => fit.a + fit.b * x1, 0.3, 9.8, 'md thick');
    p.note(9.8, fit.a + fit.b * 9.8, `fitted slope ${fit.b.toFixed(2)}`, { anchor: 'end', dy: -12, cls: 'md' });
  },

  '7.2'(art) {
    const perm = [4, 3, 10, 0, 11, 9, 7, 1, 5, 6, 2, 8];
    const months = perm.map((b, k) => ({ I: 1 + (0.2 * k) / 11, v: -1 + (2 * b) / 11 }));
    const p = P(art, { x: [2, 8], y: [3, 9], xl: 'Q', yl: 'P', zero: false, alt: 'Twelve months of prices and quantities; the fitted line is flat.' });
    for (const { I, v } of months) {
      p.fn((q) => 10 * I - q, 2, 8, 'thin cb ghost');
      p.fn((q) => 1 + q + v, 2, 8, 'thin ol ghost');
    }
    const QP = months.map(({ I, v }) => [(10 * I - 1 - v) / 2, (10 * I + 1 + v) / 2]);
    const mq = QP.reduce((a, [q]) => a + q, 0) / 12;
    const mp = QP.reduce((a, [, pp]) => a + pp, 0) / 12;
    const b = QP.reduce((a, [q, pp]) => a + (q - mq) * (pp - mp), 0) / QP.reduce((a, [q]) => a + (q - mq) ** 2, 0);
    p.fn((q) => mp - (q - mq), 4.2, 7.8, 'cb');
    p.fn((q) => mp + b * (q - mq), 2.6, 7.6, 'md thick');
    for (const [q, pp] of QP) p.dot(q, pp);
    p.note(7.6, mp + b * (7.6 - mq), `fitted slope ${Math.abs(b) < 0.005 ? '0.00' : b.toFixed(2)}`, { dx: 6, dy: 4, cls: 'md' });
    p.note(7.8, mp - (7.8 - mq), 'demand slope −1', { dx: 6, dy: 4, cls: 'cb' });
    ticks(p, { x: [2, 4, 6, 8], y: [3, 5, 7, 9] });
  },

  // ===== Stage 8
  '8.1'(art) {
    const p = P(art, { x: [0.7, 1.5], y: [0.7, 1.4], xl: 'w', yl: 'r', zero: false, alt: 'Break-even curves for two goods in factor-price space, before and after a rise in the price of textiles.' });
    p.fn((w) => w ** -4, 0.7, 1.5, 'cb');
    p.fn((w) => 1.1 ** 5 * w ** -4, 0.7, 1.5, 'cb dash');
    p.fn((w) => w ** -0.25, 0.7, 1.5, 'ol');
    const w1 = Math.exp(Math.log(1.1) / 0.75);
    const r1 = w1 ** -0.25;
    p.dot(1, 1); p.dot(w1, r1, 'cb');
    p.guide(1, 0.7, 1, 1); p.guide(w1, 0.7, w1, r1);
    p.arrow(1.01, 0.995, w1 - 0.01, r1 + 0.004, 'cb');
    p.note(0.93, 0.93 ** -4, 'textiles, p = 1', { anchor: 'end', dx: -8, dy: 4, cls: 'cb' });
    p.note(1.05, 1.1 ** 5 * 1.05 ** -4, 'textiles, p = 1.1', { dx: 10, dy: 4, cls: 'cb' });
    p.note(0.72, 0.72 ** -0.25, 'machines, p = 1', { dy: -10, cls: 'ol' });
    p.note(w1, r1, 'w +13.6%, r −3.1%', { dx: 12, dy: 30, cls: 'cb' });
    ticks(p, { x: [0.8, 1, 1.2, 1.4], y: [0.8, 1, 1.2, 1.4], fx: (v) => v.toFixed(1), fy: (v) => v.toFixed(1) });
  },

  '8.2'(art, data) {
    const [top, bot] = panels(art, 'stack');
    const p = P(top, { x: [-0.1, 0.2], y: [0.9, 1.2], xl: 'return', yl: 'E', zero: false, alt: 'The foreign-exchange market for two expected future rates.' });
    p.line(0.05, 0.9, 0.05, 1.2, 'k');
    for (const [Ee, cls] of [[1.05, 'cb'], [1.1, 'cb dash']]) {
      p.param((E) => [0.03 + (Ee - E) / E, E], 0.9, 1.2, cls);
      const E = Ee / 1.02;
      p.dot(0.05, E, 'cb');
      p.note(0.05, E, `E = ${E.toFixed(2)}`, { dx: 10, dy: 4, cls: 'cb' });
      p.note(0.03 + (Ee - 1.19) / 1.19, 1.19, `E^e = ${Ee}`, { dx: 6, dy: 4, cls: 'cb' });
    }
    p.note(0.05, 1.2, 'won deposits, i = 5%', { dx: 8, dy: 4 });
    ticks(p, { x: [-0.1, 0, 0.05, 0.1], y: [0.9, 1, 1.1, 1.2], fx: (v) => `${Math.round(v * 100)}%`, fy: (v) => v.toFixed(1) });
    const [c1, c2] = panels(bot, 'two');
    const band = [yearOf('1997-06'), yearOf('1998-04') + 0.08];
    chart(c1, { title: 'Won per dollar, monthly average', x: [1997, 1999], y: [800, 1800], band,
      series: [{ pts: pts(data, 'korea-1997', 'krwusd'), cls: 'k' }], xt: [1997, 1998, 1999], yt: [889, 1392, 1707], w: 440, h: 260 });
    chart(c2, { title: 'Call rate, %', x: [1997, 1999], y: [0, 30], band,
      series: [{ pts: pts(data, 'korea-1997', 'callrate'), cls: 'md' }], xt: [1997, 1998, 1999], yt: [0, 11, 25], w: 440, h: 260 });
  },

  '8.3'(art, data) {
    const [top, bot] = panels(art, 'stack');
    const p = P(top, { x: [0, 1], y: [0, 1.6], xl: 'f', yl: 'payoff', alt: 'Payoffs from waiting and withdrawing against the share who withdraw.' });
    const W = (f) => (f < 1 / 1.1 ? (1.5 * (1 - 1.1 * f)) / (1 - f) : 0);
    p.fn(W, 0, 1 / 1.1 - 1e-6, 'cb');
    p.line(1 / 1.1, 0, 1, 0, 'cb');
    p.line(0, 1.1, 1 / 1.1, 1.1, 'md');
    p.fn((f) => 1 / f, 1 / 1.1, 1, 'md');
    p.dot(0.25, 1.45, 'cb'); p.dot(8 / 11, 1.1); p.dot(1, 1, 'md');
    p.guide(8 / 11, 0, 8 / 11, 1.1);
    p.note(0.25, 1.45, 'only the impatient withdraw: wait', { dx: 8, dy: -8, cls: 'cb' });
    p.note(8 / 11, 0, '0.73', { anchor: 'middle', dy: 34 });
    p.note(1, 1, 'everyone runs', { anchor: 'end', dx: -8, dy: -10, cls: 'md' });
    p.note(0.02, 1.1, 'withdraw: 1.1', { dy: -8, cls: 'md' });
    p.note(0.55, W(0.55), 'wait', { dx: 6, dy: -8, cls: 'cb' });
    chart(bot, { title: 'TED spread, percentage points (weekly average)', x: [2006, 2011], y: [0, 4.5],
      series: [{ pts: pts(data, 'crisis-2008', 'ted_w'), cls: 'md' }], xt: [2006, 2007, 2008, 2009, 2010, 2011], yt: [0, 0.5, 4.1], h: 220 });
  },

  '8.4'(art) {
    const p = P(art, { x: [0, 22], y: [0, 12], xl: 'σ (%)', yl: 'E[R] (%)', alt: 'Mixes of two assets for five correlations.' });
    for (const rho of [1, 0.5, 0, -0.5, -1]) {
      const sd = (w) => Math.sqrt(Math.max(0, (1 - w) ** 2 * 100 + w * w * 400 + 2 * w * (1 - w) * rho * 200));
      p.param((w) => [sd(w), 4 + 6 * w], 0, 1, rho === 0 ? 'cb' : rho === -1 ? 'cb thin' : 'thin cb faint');
    }
    p.note(15, 7, 'ρ = 1', { dx: 8, dy: 14, cls: 'cb' });
    p.note(Math.sqrt(80), 5.2, 'ρ = 0', { dx: -10, dy: 4, anchor: 'end', cls: 'cb' });
    p.note(0, 6, 'ρ = −1', { dx: 10, dy: -8, cls: 'cb' });
    p.dot(10, 4); p.dot(20, 10);
    p.label(10, 4, 'A', { dx: 8, dy: 18 });
    p.label(20, 10, 'B', { dx: 8, dy: 6 });
    p.dot(Math.sqrt(80), 5.2, 'cb');
    p.dot(0, 6, 'cb');
  },

  '8.5'(art) {
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, x: [0, 10], y: [0, 12], xl: 'Q', yl: 'P', alt: 'A tax of two in the market of Figure 1.1.' });
    rect(p, 0, 4.5, 3.5, 6.5, 'f-ochre');
    p.area([[3.5, 6.5], [3.5, 4.5], [4.5, 5.5]], 'f-madder');
    p.fn((q) => 10 - q, 0, 10, 'k');
    p.fn((q) => 1 + q, 0, 10, 'ol');
    p.guide(3.5, 0, 3.5, 6.5);
    p.note(1.75, 5.5, 'revenue 7', { anchor: 'middle', dy: 4, cls: 'oc' });
    p.note(4.6, 5.5, 'loss 1', { dx: 4, dy: 4, cls: 'md' });
    p.note(0, 6.5, '6.5', { anchor: 'end', dx: -6, dy: 4 });
    p.note(0, 4.5, '4.5', { anchor: 'end', dx: -6, dy: 4 });
    const q = P(r, { ...H2, x: [0, 9], y: [0, 12], xl: 't', yl: '', alt: 'Revenue and deadweight loss at every tax rate.' });
    q.fn((t) => (t * (9 - t)) / 2, 0, 9, 'oc thick');
    q.fn((t) => (t * t) / 4, 0, 6.9, 'md thick');
    for (const t of [2, 4]) { q.dot(t, (t * (9 - t)) / 2, 'oc'); q.dot(t, (t * t) / 4, 'md'); q.guide(t, 0, t, (t * (9 - t)) / 2); }
    q.note(4.5, 10.125, 'revenue', { anchor: 'middle', dy: -10, cls: 'oc' });
    q.note(6.6, 6.6 ** 2 / 4, 'deadweight loss', { anchor: 'end', dx: -8, cls: 'md' });
    ticks(q, { x: [2, 4, 4.5, 9] });
  },

  '8.6'(art) {
    const p = P(art, { x: [0, 10], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Private cost with a layer of discounted future damage on top, at two discount rates.' });
    p.area([[0, 1], [10, 11], [10, 13.49], [0, 3.49]].map(([x, y]) => [x, Math.min(y, 12)]), 'f-madder');
    p.fn((q) => 10 - q, 0, 10, 'k');
    p.fn((q) => 1 + q, 0, 10, 'ol');
    p.fn((q) => 3.49 + q, 0, 8.51, 'md');
    p.fn((q) => 1.12 + q, 0, 10, 'md thin dash');
    p.dot(4.5, 5.5); p.dot(3.255, 6.745, 'md');
    p.guide(4.5, 0, 4.5, 5.5); p.guide(3.255, 0, 3.255, 6.745);
    p.note(4.5, 0, '4.5', { anchor: 'middle', dy: 34 });
    p.note(3.255, 0, '3.25', { anchor: 'middle', dy: 34, cls: 'md' });
    p.note(0.2, 3.69, 'social cost at r = 1.4%: + 2.49', { dx: 4, dy: -10, cls: 'md' });
    p.note(0.2, 1.2, 'private cost (r = 4.5% adds 0.12)', { dx: 4, dy: 20, cls: 'ol' });
  },

  '8.7'(art) {
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, x: [0, 14], y: [0, 16], xl: 'L', yl: 'w', alt: 'A labor market with a single employer.' });
    p.fn((L) => 2 + L, 0, 14, 'ol');
    p.fn((L) => 2 + 2 * L, 0, 7, 'ol dash');
    p.fn((L) => 14 - L, 0, 14, 'k');
    p.dot(6, 8); p.dot(4, 6, 'cb'); p.ring(4, 10, 'k');
    p.guide(4, 6, 4, 10); p.guide(0, 6, 4, 6); p.guide(0, 8, 6, 8);
    p.note(6, 8, 'price-taking: 6 at 8', { dx: 10, dy: 4 });
    p.note(4, 6, 'single employer: 4 at 6', { dx: 8, dy: 18, cls: 'cb' });
    p.note(13.8, 15.8, 'supply', { anchor: 'end', dy: 16, cls: 'ol' });
    p.note(6.8, 15.6, 'marginal cost of labor', { anchor: 'end', dy: -4, cls: 'ol' });
    p.note(13.8, 0.2, 'marginal product', { anchor: 'end', dy: -8 });
    const q = P(r, { ...H2, x: [0, 14], y: [0, 7], xl: 'm', yl: 'L', alt: 'Employment at every minimum wage: a tent under a single employer.' });
    q.pathPts([[0, 6], [8, 6], [14, 0]], 'k dash');
    q.pathPts([[0, 4], [6, 4], [8, 6], [14, 0]], 'cb thick');
    q.dot(8, 6, 'cb');
    q.note(2, 4, 'single employer', { dy: 18, cls: 'cb' });
    q.note(2, 6, 'price-taking', { dy: -8 });
    ticks(q, { x: [6, 8, 14] });
  },

  '8.8'(art) {
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, x: [0, 8], y: [0, 16], xl: 'period', yl: 'profit', alt: 'Two streams of profit: steady for the cartel, high once then low for the cheat.' });
    for (let t = 0; t < 7; t++) {
      rect(p, t + 0.12, 0, t + 0.47, 12.5, 'f-cobalt');
      rect(p, t + 0.53, 0, t + 0.88, t === 0 ? 14.06 : 11.11, 'f-madder');
    }
    p.line(0, 12.5, 7.2, 12.5, 'cb thin');
    p.note(7.3, 12.5, 'cartel 12.5', { dy: 4, cls: 'cb' });
    p.note(0.7, 14.06, 'cheat 14.1', { dy: -8, cls: 'md' });
    p.note(7.3, 11.11, '11.1', { dy: 14, cls: 'md' });
    const q = P(r, { ...H2, x: [0, 0.9], y: [0, 130], xl: 'δ', yl: 'worth', alt: 'What each stream is worth at every discount factor; they cross at nine seventeenths.' });
    q.fn((d) => 12.5 / (1 - d), 0, 0.9, 'cb');
    q.fn((d) => 14.0625 + (11.111 * d) / (1 - d), 0, 0.9, 'md');
    const ds = 9 / 17;
    q.dot(ds, 12.5 / (1 - ds));
    q.guide(ds, 0, ds, 12.5 / (1 - ds));
    q.note(ds, 0, 'δ* = 0.53', { anchor: 'middle', dy: 34 });
    q.note(0.89, 12.5 / 0.11, 'keep the cartel', { anchor: 'end', dx: -8, cls: 'cb' });
    q.note(0.89, 14.06 + 11.11 * 0.89 / 0.11, 'cheat', { anchor: 'end', dx: -8, dy: 22, cls: 'md' });
  },

  '8.9'(art) {
    const p = P(art, { x: [0, 10], y: [0, 120], xl: '', yl: 'value', alt: 'Values of the two payments seen from day zero and from day ten.' });
    const bars = [[0.7, 70, 'f-cobalt', '100, day 10'], [2.5, 77, 'f-madder', '110, day 11'], [5.7, 100, 'f-cobalt', '100, day 10'], [7.5, 77, 'f-madder', '110, day 11']];
    for (const [x, v, cls, s] of bars) {
      rect(p, x, 0, x + 1.1, v, cls);
      p.note(x + 0.55, v, String(v), { anchor: 'middle', dy: -8 });
      p.note(x + 0.55, 0, s, { anchor: 'middle', dy: 20 });
    }
    p.note(2.15, 112, 'seen from day 0: wait', { anchor: 'middle' });
    p.note(7.15, 112, 'seen from day 10: take 100', { anchor: 'middle' });
  },

  '8.10'(art) {
    const p = P(art, { x: [0, 30], y: [0, 0.6], xl: 'k = wealth', yl: 'marginal product', alt: 'Marginal product of capital falling with scale; poor owners sit where returns are high.' });
    p.fn((k) => 1 / (2 * Math.sqrt(k)), 0.7, 30, 'k');
    p.line(0, 0.1, 30, 0.1, 'md dash');
    p.note(11, 0.1, 'interest rate 10%', { dy: 18, cls: 'md' });
    for (const w of [1, 4, 9, 16, 25]) {
      const m = 1 / (2 * Math.sqrt(w));
      p.dot(w, m, 'cb');
      p.note(w, m, `${(m * 100).toFixed(m * 100 % 1 ? 1 : 0)}%`, { dx: 8, dy: -8, cls: 'cb' });
    }
    ticks(p, { x: [1, 4, 9, 16, 25] });
    p.guide(25, 0, 25, 0.1);
  },

  '8.11'(art, data) {
    const [top, bot] = panels(art, 'stack');
    const [l, r] = panels(top, 'two');
    const p = P(l, { ...H2, x: [0.5, 1.8], y: [0, 0.05], xl: 'income', yl: 'rate', zero: false, alt: 'Birth and death rates crossing at subsistence income.' });
    p.fn((y) => 0.025 + 0.01 * (y - 1), 0.5, 1.8, 'cb');
    p.fn((y) => 0.025 - 0.012 * (y - 1), 0.5, 1.8, 'md');
    p.dot(1, 0.025);
    p.guide(1, 0, 1, 0.025);
    p.note(1, 0, 'y*', { anchor: 'middle', dy: 34 });
    p.note(1.78, 0.025 + 0.0078, 'births', { anchor: 'end', dy: -8, cls: 'cb' });
    p.note(1.78, 0.025 - 0.0094, 'deaths', { anchor: 'end', dy: 16, cls: 'md' });
    const q = P(r, { ...H2, x: [0, 16], y: [0.5, 1.8], xl: 'population', yl: 'income', zero: false, alt: 'Income per person falling with population; better technology lifts the curve.' });
    q.fn((L) => 3 / Math.sqrt(L), 3, 16, 'k');
    q.fn((L) => 3.6 / Math.sqrt(L), 4.2, 16, 'cb');
    q.line(0, 1, 16, 1, 'k thin dash');
    q.dot(9, 1); q.dot(9, 1.2, 'cb'); q.dot(12.96, 1, 'cb');
    q.arrow(9, 1.02, 9, 1.18, 'cb');
    q.arrow(9.2, 1.19, 12.8, 1.01, 'cb');
    q.note(16, 1, 'y*', { anchor: 'end', dy: -8 });
    q.note(5, 3.6 / Math.sqrt(5), 'better technology', { dx: 10, dy: -2, cls: 'cb' });
    chart(bot, { title: 'Income per person, 2011 dollars (log scale)', x: [1250, 2022], y: [600, 60000], log: true, h: 280,
      series: [
        { pts: pts(data, 'maddison', 'gdppc_gbr'), cls: 'k', label: 'England, then the UK', at: 1400, dy: -12 },
        { pts: pts(data, 'maddison', 'gdppc_nld'), cls: 'ol thin', label: 'Netherlands', lcls: 'ol', at: 1650, dy: -12 },
        { pts: pts(data, 'maddison', 'gdppc_chn'), cls: 'md', label: 'China', lcls: 'md', at: 1300, dy: 20 },
        { pts: pts(data, 'maddison', 'gdppc_ind'), cls: 'oc', label: 'India', lcls: 'oc', at: 1750, dy: 22 },
      ],
      xt: [1250, 1400, 1600, 1800, 2022], yt: [1000, 3000, 10000, 40000], fy: (v) => v.toLocaleString('en-US') });
  },
};
