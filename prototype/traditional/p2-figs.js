// Part 2, flat: what the classical figures cannot draw. The models are in
// p2-models.js; data.state holds the reader's settings for the live figures.

import { plot } from './figures.js';
import { SW, SW_PS, smallWorld, smallWorldCurve, distances, chainAndCore, chainLayout, coreLayout, preferential, LEVELS, beauty, contagion, fifths, io, rounds } from './p2-models.js';

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
  '2.4'(art, data) {
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

  '2.5'(art) {
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

  '2.1'(art) {
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

  '2.3'(art, data) {
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

  '2.7'(art, data) {
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
  // Korean households by fifths of income: spending against disposable income
  '2.2'(art, data) {
    const F = fifths(data['korea-households']);
    const p = P(art, { w: 760, h: 440, x: [0, 10], y: [0, 7.2], yl: 'spending', pad: { b: 62 }, alt: 'Five points for the five fifths of Korean households by income, spending against disposable income. The bottom fifth spends more than its income; the top fifth spends about half. A line through the average household from the origin passes through none of them.' });
    p.line(0, 0, 7, 7, 'k thin dash');
    p.note(5, 5, 'spending = income', { dx: -10, dy: -4, anchor: 'end' });
    const k = F.all.apc;
    p.line(0, 0, 10, 10 * k, 'oc');
    p.note(10, 10 * k, `the representative household: ${Math.round(100 * k)}% of any income`, { anchor: 'end', dy: -10, cls: 'oc halo' });
    p.ring(F.all.y, F.all.c, 'oc', 5);
    for (const r of F.rows) {
      p.dot(r.y, r.c, 'cb', 6);
      const top = r.name === 'top fifth';
      p.note(r.y, r.c, `${r.name}: ${Math.round(100 * r.apc)}%`, { dx: top ? -10 : -12, dy: top ? 20 : -8, anchor: 'end', cls: 'cb halo' });
    }
    p.note(10, 0, 'disposable income, million won a month', { anchor: 'end', dy: 44 });
    ticks(p, { x: [2, 4, 6, 8, 10], y: [2, 4, 6] });
  },

  // Korea's sectors, who supplies whom, and where a won of demand goes
  '2.6'(art, data) {
    const m = io(data['korea-io']);
    const j = data.state.sector;
    const [l, r] = panels(art, 'two');
    const pos = ringPos(m.n);
    const p = P(l, { ...H2, h: 440, x: [-2.2, 2.2], y: [-2.2, 2.2], axes: false, pad: { l: 10, r: 10, t: 10, b: 10 }, alt: `Korea’s 33 sectors on a circle, with lines from suppliers to the sectors that buy at least 5 percent of their output from them; ${m.names[j]} is marked.` });
    for (let i = 0; i < m.n; i++) for (let b = 0; b < m.n; b++) {
      if (i === b || m.A[i][b] < 0.05) continue;
      p.line(...pos[i], ...pos[b], b === j ? 'oc' : 'k thin faint');
    }
    const R = rounds(m, j);
    for (let i = 0; i < m.n; i++) {
      p.dot(...pos[i], i === j ? 'md' : 'cb', i === j ? 6 : 2.4 + 9 * Math.sqrt(R[i].total - R[i].r0) );
      // names stand along their radius, reading outward
      const [x, y] = pos[i];
      const right = x >= -1e-6;
      const t = p.note(1.08 * x, 1.08 * y, m.names[i], { anchor: right ? 'start' : 'end', dy: 4, cls: `small${i === j ? ' md' : ''}` });
      const deg = (-Math.atan2(y, x) * 180) / Math.PI + (right ? 0 : 180);
      t.setAttribute('transform', `rotate(${deg.toFixed(1)} ${p.X(1.08 * x).toFixed(1)} ${p.Y(1.08 * y).toFixed(1)})`);
    }
    const top = [...R].sort((a, b) => b.total - a.total).slice(0, 10);
    const max = top[0].total;
    const total = R.reduce((a, v) => a + v.total, 0);
    const q = P(r, { ...H2, h: 440, x: [-1.15, max * 1.05], y: [0, 11], axes: false, pad: { l: 10, r: 14, t: 24, b: 30 }, alt: `The output one won of final demand for ${m.names[j]} draws from the ten sectors it draws most from, in rounds; ${total.toFixed(2)} won in all.` });
    const cls = [['rgba(176, 59, 59, 0.55)', 'the won itself'], ['rgba(168, 118, 28, 0.6)', 'its suppliers'], ['rgba(88, 118, 32, 0.55)', 'theirs'], ['rgba(42, 85, 160, 0.5)', 'further rounds']];
    top.forEach((v, k) => {
      const y = 10 - k;
      let x = 0;
      [v.r0, v.r1, v.r2, v.rest].forEach((w, t) => {
        if (w > 1e-4) q.area([[x, y - 0.32], [x + w, y - 0.32], [x + w, y + 0.32], [x, y + 0.32]], '').style.fill = cls[t][0];
        x += w;
      });
      q.pathPts([[0, y - 0.32], [x, y - 0.32], [x, y + 0.32], [0, y + 0.32]], 'k thin');
      q.note(-0.05, y, m.names[v.i], { anchor: 'end', dy: 4, cls: v.i === j ? 'md' : '' });
      q.note(x, y, v.total.toFixed(2), { dx: 5, dy: 4 });
    });
    q.line(0, 0.4, 0, 10.5, 'k thin');
    cls.forEach(([c, name], t) => {
      const x0 = -1.1 + t * ((max * 1.05 + 1.1) / 4);
      q.area([[x0, 0.05], [x0 + 0.07, 0.05], [x0 + 0.07, 0.35], [x0, 0.35]], '').style.fill = c;
      q.note(x0 + 0.1, 0.2, name, { dy: 4 });
    });
    q.note(max * 1.05, 11, `in all, across 33 sectors: ${total.toFixed(2)} won`, { anchor: 'end', dy: -2 });
  },
};

export { SW_PS };
