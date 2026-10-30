// Part 2, flat: what the classical figures cannot draw. The models are in
// p2-models.js; data.state holds the reader's settings for the live figures.

import { plot } from './figures.js';
import { SW, SW_PS, smallWorld, smallWorldCurve, distances, chainAndCore, chainLayout, coreLayout, preferential, LEVELS, beauty, contagion } from './p2-models.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  parent?.appendChild(e);
  return e;
};
const P = (host, o) => { const p = plot(host, o); p.o = o; return p; };
const H2 = { w: 440, h: 400 };

function panels(art, mode) {
  art.classList.add('panels', mode);
  if (mode === 'two') art.closest('figure')?.classList.add('wide');
  const a = document.createElement('div');
  const b = document.createElement('div');
  art.append(a, b);
  return [a, b];
}

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

export const ringPos = (n) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 - (2 * Math.PI * i) / n; return [Math.cos(a), Math.sin(a)]; });

export const FIGS = {
  '2.1'(art, data) {
    const p0 = data.state.p;
    const [l, r] = panels(art, 'two');
    const g = smallWorld(SW.n, SW.k, p0);
    const pos = ringPos(SW.n);
    const p = P(l, { ...H2, h: 440, x: [-1.2, 1.2], y: [-1.2, 1.2], axes: false, pad: { l: 20, r: 20, t: 20, b: 20 }, alt: 'Eighty people on a ring, each tied to six neighbours, with a few ties rewired as shortcuts.' });
    for (const e of g.edges) p.line(...pos[e.a], ...pos[e.b], e.rewired ? 'md' : 'k thin faint');
    const d = distances(g.adj, 0);
    for (let i = 0; i < SW.n; i++) p.dot(...pos[i], i === 0 ? 'cb' : 'k', i === 0 ? 6 : 2.6);
    p.note(...pos[0], 'you', { dy: -12, anchor: 'middle', cls: 'cb' });
    p.note(0, 0, `${g.edges.filter((e) => e.rewired).length} shortcuts`, { anchor: 'middle', dy: -4, cls: 'md' });
    p.note(0, 0, `farthest person: ${Math.max(...d)} steps`, { anchor: 'middle', dy: 16 });
    const curve = smallWorldCurve();
    const q = P(r, { ...H2, x: [-3, 0], y: [0, 1.1], xl: 'p', yl: '', zero: false, alt: 'Average distance falls long before clustering does as more ties are rewired.' });
    q.pathPts(curve.map((c) => [Math.log10(c.p), c.L]), 'cb');
    q.pathPts(curve.map((c) => [Math.log10(c.p), c.C]), 'md');
    for (const c of curve) { q.dot(Math.log10(c.p), c.L, 'cb', 2.5); q.dot(Math.log10(c.p), c.C, 'md', 2.5); }
    q.line(Math.log10(Math.max(0.001, p0)), 0, Math.log10(Math.max(0.001, p0)), 1.1, 'k thin dash');
    q.note(-2.95, 0.97, 'clustering', { dy: -8, cls: 'md' });
    q.note(-1.2, 0.72, 'average distance', { dx: 6, cls: 'cb' });
    q.note(Math.log10(Math.max(0.001, p0)), 1.1, `p = ${p0}`, { dx: 6, dy: 12 });
    ticks(q, { x: [-3, -2, -1, 0], y: [0, 0.5, 1], fx: (v) => String(10 ** v), fy: (v) => v.toFixed(1) });
  },

  '2.2'(art) {
    const { chain, core } = chainAndCore();
    const cp = chainLayout();
    const kp = coreLayout().map(([x, y]) => [x + 1.2, y]);
    const p = P(art, { w: 760, h: 340, x: [0, 2.2], y: [0, 1], axes: false, pad: { l: 10, r: 10, t: 20, b: 34 }, alt: 'Two networks of twenty-four students: a long chain with short branches, and a core with students around it.' });
    for (const [a, b] of chain) p.line(...cp[a], ...cp[b], 'k');
    for (const [a, b] of core) p.line(...kp[a], ...kp[b], 'k');
    for (const q of cp) p.dot(...q, 'cb', 3.4);
    for (const q of kp) p.dot(...q, 'cb', 3.4);
    p.note(0.5, 0, 'a chain with short branches: 25 ties', { anchor: 'middle', dy: 18 });
    p.note(1.7, 0, 'a core: 31 ties', { anchor: 'middle', dy: 18 });
  },

  '2.3'(art) {
    const { deg, order, mean } = preferential();
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, h: 440, x: [0, 20], y: [0, 20], axes: false, pad: { l: 20, r: 20, t: 20, b: 20 }, alt: 'Four hundred firms on a plan, shaded by size: a few dark, most pale.' });
    const max = Math.max(...deg);
    order.forEach((f, i) => {
      const x = i % 20;
      const y = Math.floor(i / 20);
      const a = p.area([[x + 0.08, y + 0.08], [x + 0.92, y + 0.08], [x + 0.92, y + 0.92], [x + 0.08, y + 0.92]], '');
      a.setAttribute('fill', '#2a55a0');
      a.setAttribute('fill-opacity', (0.1 + 0.85 * Math.log(deg[f]) / Math.log(max)).toFixed(2));
    });
    const ranked = [...deg].sort((a, b) => b - a);
    const q = P(r, { ...H2, x: [0, Math.log10(400)], y: [0, Math.log10(50)], xl: 'rank', yl: 'size', zero: false, alt: 'Size against rank on log scales: a straight line, far from the mean.' });
    q.pathPts(ranked.map((s, i) => [Math.log10(i + 1), Math.log10(s)]), 'cb');
    q.line(0, Math.log10(mean), Math.log10(400), Math.log10(mean), 'oc dash');
    q.note(Math.log10(400), Math.log10(mean), `mean ${mean.toFixed(1)}: the representative firm`, { anchor: 'end', dy: -8, cls: 'oc' });
    q.note(0, Math.log10(ranked[0]), `largest ${ranked[0]}`, { dx: 8, dy: 4, cls: 'cb' });
    ticks(q, { x: [0, 1, 2, Math.log10(400)], y: [0, 1, Math.log10(50)], fx: (v) => String(Math.round(10 ** v)), fy: (v) => String(Math.round(10 ** v)) });
  },

  '2.4'(art, data) {
    const mix = data.state.mix;
    const { avg, target } = beauty(mix);
    const top = Math.max(...mix, 1) + 1;
    const p = P(art, { w: 760, h: 340, x: [0, 100], y: [0, top], xl: 'guess', yl: 'players', alt: 'Guesses by reasoning level, the average, two-thirds of it, and the Nash guess of zero.' });
    const cls = ['f-hatch', 'f-cobalt', 'f-ochre', 'f-olive', 'f-madder'];
    LEVELS.forEach((L, i) => {
      if (!mix[i]) return;
      const x = L.guess;
      p.area([[x - 1.6, 0], [x + 1.6, 0], [x + 1.6, mix[i]], [x - 1.6, mix[i]]], cls[i]);
      p.note(x, mix[i], `${L.name}: ${x.toFixed(0)}`, { anchor: 'middle', dy: -8 });
    });
    p.line(avg, 0, avg, top, 'k thin dash');
    p.line(target, 0, target, top, 'md');
    p.line(36.73, 0, 36.73, top, 'oc thin dash');
    p.note(target, top, `winning number ⅔ × average = ${target.toFixed(1)}`, { dx: -6, dy: 14, anchor: 'end', cls: 'md' });
    p.note(avg, top, `average ${avg.toFixed(1)}`, { dx: 6, dy: 14 });
    p.note(36.73, top, 'Nagel’s first rounds: 36.7', { dx: 6, dy: 32, cls: 'oc' });
    ticks(p, { x: [0, 22, 33, 50, 100] });
  },

  '2.5'(art, data) {
    const s = data.state.shock;
    const ring = contagion(s, false);
    const full = contagion(s, true);
    const p = P(art, { w: 760, h: 360, x: [0, 2.2], y: [0, 1], axes: false, pad: { l: 10, r: 10, t: 16, b: 36 }, alt: 'Ten banks on a ring and ten banks that all lend to each other; failed banks marked with the round in which they fail.' });
    const pos = ringPos(10);
    const at = (cx, i) => [cx + 0.38 * pos[i][0], 0.5 + 0.42 * pos[i][1]];
    for (let i = 0; i < 10; i++) {
      p.line(...at(0.5, i), ...at(0.5, (i + 1) % 10), 'k thin');
      for (let j = i + 1; j < 10; j++) p.line(...at(1.7, i), ...at(1.7, j), 'k thin faint');
    }
    for (const [cx, rounds] of [[0.5, ring], [1.7, full]]) {
      rounds.forEach((r, i) => {
        p.dot(...at(cx, i), r ? 'md' : 'cb', 7);
        if (r) p.note(...at(cx, i), String(r), { anchor: 'middle', dy: -11, cls: 'md' });
      });
    }
    const n1 = ring.filter(Boolean).length;
    const n2 = full.filter(Boolean).length;
    p.note(0.5, 0, `each owes the next: ${n1} of 10 fail`, { anchor: 'middle', dy: 22 });
    p.note(1.7, 0, `each owes all the others: ${n2} of 10 fail`, { anchor: 'middle', dy: 22 });
  },
};

export { SW_PS };
