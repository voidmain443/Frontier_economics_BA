// Live redraws of the textbook figures while their instruments move. Each takes
// the instrument's state and draws the figure the book would draw at that
// instant, including the states between equilibria that the book never shows.
// The SVG is copied into the unfolded scene with html-in-canvas.

import { plot } from './figures.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const f2 = (v) => v.toFixed(2);

export const LIVE = {
  // s: { I (income), p (price) }
  sd(host, s) {
    const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Supply and demand, adjusting' });
    const qd = clamp(10 * s.I - s.p, 0, 12);
    const qs = clamp(s.p - 1, 0, 12);
    const shifted = s.I > 1.005;
    if (shifted) p.fn((q) => 10 - q, 0, 10, 'cb dash');
    p.fn((q) => 10 * s.I - q, 0, 12, 'cb thick');
    p.fn((q) => 1 + q, 0, 11, 'md thick');
    p.line(0, s.p, 12, s.p, 'oc thin');
    const gap = qd - qs;
    if (Math.abs(gap) > 0.2) {
      p.line(Math.min(qd, qs), s.p, Math.max(qd, qs), s.p, 'oc thick');
      p.note((qd + qs) / 2, s.p + 0.5, gap > 0 ? 'excess demand pushes the price up' : 'excess supply pushes the price down', { anchor: 'middle', cls: 'oc' });
      p.dot(qd, s.p, 'cb');
      p.dot(qs, s.p, 'md');
    } else {
      p.guide(qs, s.p, qs, 0);
      p.guide(qs, s.p, 0, s.p);
      p.dot(qs, s.p, 'k');
      p.label(qs + 0.3, s.p - 0.55, shifted ? 'E′' : 'E');
    }
    if (shifted) p.label(9.4, 0.95, 'D');
    p.label(Math.min(11.7, 10 * s.I - 0.6), 0.95, shifted ? 'D′' : 'D');
    p.label(10.6, 11.2, 'S');
    p.note(0.4, 11.2, `P = ${f2(s.p)}   income ${f2(s.I)}`);
    p.note(0.4, 10.4, 'dP/dt = κ [D(P, I) − S(P)]', { cls: 'oc' });
  },

  // s: { p (price of x in y), xa, xb (each household's chosen x, in A's coordinates) }
  edgeworth(host, s) {
    const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'x_A', yl: 'y_A', alt: 'Edgeworth box, adjusting' });
    p.pathPts([[0, 10], [10, 10], [10, 0]], 'k');
    p.line(0, 0, 10, 10, 'oc');
    const line = (x) => 2 - s.p * (x - 8);
    const xs = [];
    for (const x of [0, 10]) xs.push([x, line(x)]);
    p.param((t) => [t, line(t)], 0, 10, 'k thin', 2);
    const ya = line(s.xa);
    const yb = line(s.xb);
    const ua = Math.sqrt(Math.max(s.xa * ya, 1e-6));
    const ub = Math.sqrt(Math.max((10 - s.xb) * (10 - yb), 1e-6));
    p.fn((x) => (ua * ua) / x, (ua * ua) / 10, 10, 'cb');
    p.fn((x) => 10 - (ub * ub) / (10 - x), 0, 10 - (ub * ub) / 10, 'md');
    p.dot(8, 2, 'k');
    p.label(8.2, 1.5, 'ω');
    const gap = s.xa - s.xb;
    if (Math.abs(gap) > 0.12) {
      p.line(s.xa, ya, s.xb, yb, 'oc thick');
      p.dot(s.xa, ya, 'cb');
      p.dot(s.xb, yb, 'md');
      p.note(0.3, 9.3, `excess demand for x: ${f2(s.xa - s.xb)}`, { cls: 'oc' });
      p.note(0.3, 8.6, 'p·z(p) = 0: both choices lie on one budget line');
    } else {
      p.dot(s.xa, ya, 'oc');
      p.label(s.xa + 0.25, ya - 0.3, 'E');
      p.note(0.3, 9.3, 'MRS_A = MRS_B = p: a Pareto-efficient equilibrium', { cls: 'oc' });
    }
    p.note(0.3, 0.5, `relative price p = ${f2(s.p)}`);
    p.label(0.25, 0.4 + 0.6, 'A', { roman: true, cls: 'cb' });
    p.label(9.7, 9.5, 'B', { roman: true, anchor: 'end', cls: 'md' });
  },

  // s: { s (saving rate), k }
  solow(host, st) {
    const f = (k) => Math.pow(k, 0.35);
    const p = plot(host, { x: [0, 12], y: [0, 2.6], xl: 'k', yl: 'y', alt: 'Solow diagram, adjusting' });
    p.fn(f, 0, 12, 'k');
    if (Math.abs(st.s - 0.3) > 0.005) p.fn((k) => 0.3 * f(k), 0, 12, 'cb dash');
    p.fn((k) => st.s * f(k), 0, 12, 'cb thick');
    p.fn((k) => 0.08 * k, 0, 12, 'md thick');
    const ks = Math.pow(st.s / 0.08, 1 / 0.65);
    if (ks < 12) {
      p.guide(ks, 0.08 * ks, ks, 0);
      p.ring(ks, 0.08 * ks, 'k');
      p.label(ks + 0.15, -0.12, 'k*');
    }
    const k = clamp(st.k, 0, 12);
    p.guide(k, st.s * f(k), k, 0);
    p.dot(k, st.s * f(k), 'cb');
    p.dot(k, 0.08 * k, 'md');
    if (Math.abs(st.s * f(k) - 0.08 * k) > 0.01) p.line(k, 0.08 * k, k, st.s * f(k), 'oc thick');
    p.label(11.4, 0.08 * 11.4 + 0.1, '(n + δ) k', { anchor: 'end', cls: 'md' });
    p.label(11.4, st.s * f(11.4) - 0.17, 's f(k)', { anchor: 'end', cls: 'cb' });
    p.note(0.4, 2.45, `s = ${f2(st.s)}   k = ${f2(k)}   k̇ = ${(st.s * f(k) - 0.08 * k).toFixed(3)}`);
  },

  // s: { g (rightward IS shift in units of Y), Y, r }
  islm(host, s) {
    const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'Y', yl: 'r', alt: 'IS–LM, adjusting' });
    if (s.g > 0.02) p.fn((Y) => 9 - 0.75 * Y, 0, 12, 'cb dash');
    p.fn((Y) => 9 - 0.75 * (Y - s.g), 0, 12, 'cb thick');
    p.fn((Y) => 0.9 * Y - s.m, 0, 12, 'md thick');
    if (Math.abs(s.m - 6) > 0.05) p.fn((Y) => 0.9 * Y - 6, 0, 12, 'md dash');
    const Ys = (12 + s.g + (4 / 3) * s.m) / 2.2;
    p.ring(Ys, 0.9 * Ys - s.m, 'k');
    p.dot(s.Y, s.r, 'oc');
    p.guide(s.Y, s.r, s.Y, 0);
    p.label(11.6, 0.6, s.g > 0.02 ? 'IS′' : 'IS', { roman: true, anchor: 'end', cls: 'cb' });
    p.label(11.6, 0.9 * 11.6 - s.m - 0.9, 'LM', { roman: true, anchor: 'end', cls: 'md' });
    p.note(0.4, 9.3, `Y = ${f2(s.Y)}   r = ${f2(s.r)}`);
    if (s.g > 0.02) p.note(0.4, 8.6, 'income rises, r rises with it, investment is crowded out', { cls: 'oc' });
  },
};
