// Part 2, flat: what the classical figures cannot draw. The models are in
// p2-models.js; data.state holds the reader's settings for the live figures.

import { plot } from './figures.js';
import { SW, SW_PS, smallWorld, smallWorldCurve, distances, chainAndCore, chainLayout, coreLayout, preferential, LEVELS, beauty, contagion, fifths, io, rounds, excessScarf, excessOne, tatonnement, onSimplex, SIMPLEX, SCARF_P0, METHODS, PUBLISHED, ARGUMENTS, NEEDS, PROJECTS } from './p2-models.js';
import { LAYERS } from './p3-figs.js';
import { CELLS } from './wheel.js';

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
  '2.6'(art, data) {
    const p0 = data.state.p;
    const [l, r] = panels(art, 'two');
    const g = smallWorld(SW.n, SW.k, p0);
    const pos = ringPos(SW.n);
    const p = P(l, { ...H2, h: 440, x: [-1.2, 1.2], y: [-1.2, 1.2], axes: false, pad: { l: 20, r: 20, t: 20, b: 20 }, alt: 'Eighty people on a ring, each tied to six neighbors, with a few ties rewired as shortcuts.' });
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

  '2.7'(art) {
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

  '2.5'(art, data) {
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

  '2.9'(art, data) {
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
  '2.4'(art, data) {
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
  '2.8'(art, data) {
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
  // Korea, 2020–2024: what a one-curve explanation of 2022 holds still
  '2.1'(art, data) {
    const S = Object.fromEntries((data['rates-2022']?.series ?? []).map((x) => [x.key, x.points]));
    const yr = ([m]) => Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 1) / 12;
    const span = (pts) => (pts ?? []).filter(([m]) => m >= '2020-01' && m <= '2024-12');
    const [l, r] = panels(art, 'two');
    const p = P(l, { ...H2, x: [2020, 2025], y: [-1, 7], xl: 'year', yl: '%', zero: false, alt: 'Korea’s consumer price inflation rose to 6.3 percent in July 2022; the Bank of Korea’s base rate rose from 0.5 percent in 2021 to 3.5 percent in 2023.' });
    p.line(2020, 0, 2025, 0, 'k thin faint');
    const cpi = span(S.kr_cpi);
    const rate = span(S.bok_rate);
    p.pathPts(cpi.map((q) => [yr(q), q[1]]), 'md');
    p.pathPts(rate.map((q) => [yr(q), q[1]]), 'cb');
    const peak = cpi.reduce((a, q) => (q[1] > a[1] ? q : a), cpi[0] ?? ['2022-07', 0]);
    p.dot(yr(peak), peak[1], 'md', 4);
    p.note(yr(peak), peak[1], `${peak[1].toFixed(1)}%, July 2022`, { dx: 8, dy: -4, cls: 'md halo' });
    p.note(2020.15, 2.2, 'consumer prices, % over a year', { cls: 'md halo' });
    p.note(2023.2, 3.9, 'base rate', { cls: 'cb' });
    ticks(p, { x: [2020, 2021, 2022, 2023, 2024], y: [0, 2, 4, 6] });
    const q = P(r, { ...H2, x: [2020, 2025], y: [0, 240], xl: 'year', yl: 'Jan 2021 = 100', zero: false, alt: 'The price of Brent crude rose to more than twice its January 2021 level by June 2022; the won fell by about a third against the dollar by October 2022.' });
    const idx = (pts) => { const base = pts.find(([m]) => m === '2021-01')?.[1] ?? 1; return span(pts).map((x) => [yr(x), (100 * x[1]) / base]); };
    q.line(2020, 100, 2025, 100, 'k thin faint');
    q.pathPts(idx(S.brent ?? []), 'oc');
    q.pathPts(idx(S.krwusd ?? []), 'ol');
    q.note(2022.6, 215, 'Brent crude', { cls: 'oc halo' });
    q.note(2022.9, 145, 'won per dollar', { cls: 'ol halo' });
    ticks(q, { x: [2020, 2021, 2022, 2023, 2024], y: [0, 100, 200] });
  },

  // when the textbook was built, and when what it leaves out was found
  '2.2'(art) {
    const p = P(art, { w: 940, h: 440, x: [1872, 2012], y: [0, 1.12], axes: false, pad: { l: 20, r: 20, t: 10, b: 30 }, alt: 'A timeline from 1880 to 2010. Above, the textbook’s parts: Marshall 1890, Hicks 1937, Samuelson 1947 and 1948, Arrow and Debreu 1954, Solow 1956. Below, findings it leaves out, from Pareto 1896 to Axtell 2001; game theory and Akerlof’s lemons entered the core, Kahneman and Tversky a field course, and the rest none of Part 1.' });
    const ROW = { canon: 0.78, found: 0.14 };
    p.line(1880, ROW.canon, 2010, ROW.canon, 'k thin');
    p.line(1880, ROW.found, 2010, ROW.found, 'k thin');
    p.label(1880, ROW.canon, 'The textbook', { dy: 20, roman: true, cls: 'room small' });
    p.label(1880, ROW.found, 'Found, and set aside', { dy: 20, roman: true, cls: 'room small' });
    for (let yr = 1890; yr <= 2010; yr += 10) {
      p.line(yr, ROW.found - 0.015, yr, ROW.found + 0.015, 'k thin');
      p.label(yr, ROW.found, String(yr), { anchor: 'middle', dy: 36, roman: true, cls: 'tick' });
    }
    // labels stand in lanes above their row, each on a leader to its year,
    // in the lowest lane where it does not run into the one before
    const lanes = (items, y0, step, text) => {
      const ends = [];
      for (const it of items) {
        const x = p.X(it.y);
        const w = 6.4 * text(it).length + 10;
        let k = ends.findIndex((e) => e < x - 6);
        if (k < 0) k = ends.length;
        ends[k] = x + w;
        const yl = y0 + (k + 1) * step;
        it.lane = yl;
      }
    };
    const canon = CANON.map(([y, t]) => ({ y, t }));
    lanes(canon, ROW.canon, 0.07, (c) => `${c.y} ${c.t}`);
    for (const c of canon) {
      p.line(c.y, ROW.canon, c.y, c.lane - 0.012, 'k thin faint');
      p.dot(c.y, ROW.canon, 'k', 4);
      p.label(c.y, c.lane, `${c.y} ${c.t}`, { dx: -3, dy: -2, roman: true, cls: 'note halo' });
    }
    const found = FINDINGS.map((f) => ({ ...f }));
    lanes(found, ROW.found, 0.075, (f) => `${f.y} ${f.who}`);
    for (const f of found) {
      p.line(f.y, ROW.found, f.y, f.lane - 0.012, `${f.part1 === 'none' ? 'md' : 'k'} thin faint`);
      if (f.part1 === 'core') p.dot(f.y, ROW.found, 'k', 5);
      else if (f.part1 === 'field') p.ring(f.y, ROW.found, 'k', 5);
      else p.dot(f.y, ROW.found, 'md', 5);
      p.label(f.y, f.lane, `${f.y} ${f.who}`, { dx: -3, dy: -2, roman: true, cls: `note halo${f.part1 === 'none' ? ' md' : ''}` });
    }
    [['core', 'in Part 1’s core'], ['field', 'in a field course only'], ['none', 'not in Part 1']].forEach(([k, text], j) => {
      const x = 1986;
      const y = 0.7 - j * 0.065;
      if (k === 'core') p.dot(x, y, 'k', 5);
      else if (k === 'field') p.ring(x, y, 'k', 5);
      else p.dot(x, y, 'md', 5);
      p.note(x, y, text, { dx: 9, dy: 4 });
    });
  },

  // Scarf's economy: the prices circle the equilibrium; one consumer's settle
  '2.10'(art) {
    const p = P(art, { w: 640, h: 560, x: [-0.12, 1.12], y: [-0.1, 0.98], axes: false, pad: { l: 10, r: 10, t: 10, b: 10 }, alt: 'A triangle of relative prices for three goods, with the equilibrium at its center. Under the classical adjustment the prices of Scarf’s economy go round the center in a closed loop; with one representative consumer they go straight to the center.' });
    const C = [[0, 0], [1, 0], [0.5, SIMPLEX.h]];
    p.pathPts([...C, C[0]], 'k thin');
    p.note(0, 0, 'good 1 dearest', { anchor: 'middle', dy: 20 });
    p.note(1, 0, 'good 2 dearest', { anchor: 'middle', dy: 20 });
    p.note(0.5, SIMPLEX.h, 'good 3 dearest', { anchor: 'middle', dy: -10 });
    // the direction the classical adjustment moves the prices, here and there
    for (let i = 1; i < 9; i++) for (let j = 1; j < 9 - i; j++) {
      const pr = [i / 9, j / 9, (9 - i - j) / 9];
      const z = excessScarf(pr);
      const a = onSimplex(pr);
      const b = onSimplex(pr.map((v, k) => v + 0.12 * z[k]));
      p.arrow(a[0], a[1], a[0] + 0.55 * (b[0] - a[0]), a[1] + 0.55 * (b[1] - a[1]), 'k thin faint');
    }
    const one = tatonnement(excessOne, SCARF_P0, 8).map((s) => onSimplex(s.p));
    const scarf = tatonnement(excessScarf, SCARF_P0, 15.2).map((s) => onSimplex(s.p));
    p.pathPts(one, 'cb thick');
    p.pathPts(scarf, 'md thick');
    const c = onSimplex([1, 1, 1]);
    p.dot(...onSimplex(SCARF_P0), 'k', 4);
    p.note(...onSimplex(SCARF_P0), 'start', { dx: 8, dy: 4 });
    p.ring(...c, 'k', 6);
    p.note(...c, 'equilibrium', { dx: 10, dy: 18 });
    p.note(0.78, 0.55, 'three people who differ:', { cls: 'md' });
    p.note(0.78, 0.55, 'round and round', { dy: 16, cls: 'md' });
    p.note(0.08, 0.5, 'one representative consumer:', { cls: 'cb' });
    p.note(0.08, 0.5, 'straight to the center', { dy: 16, cls: 'cb' });
  },
  // what the top journals published, by method, 1963–2011
  '2.11'(art) {
    const p = P(art, { w: 760, h: 420, x: [1955, 2030], y: [0, 100], yl: '% of articles', zero: false, alt: 'Stacked bars for 1963 to 2011: pure theory falls from about half of all articles to a fifth; empirical work on the authors’ own data rises from 9 to 34 percent, and experiments from none to 8 percent.' });
    for (const r of PUBLISHED) {
      let y = 0;
      for (const m of METHODS) {
        const v = r[m.key];
        if (v > 0) p.area([[r.y - 3, y], [r.y + 3, y], [r.y + 3, y + v], [r.y - 3, y + v]], '').style.fill = FILLS[m.c];
        y += v;
      }
      p.pathPts([[r.y - 3, 0], [r.y + 3, 0], [r.y + 3, y], [r.y - 3, y], [r.y - 3, 0]], 'k thin');
      p.label(r.y, 0, String(r.y), { anchor: 'middle', dy: 18, roman: true, cls: 'tick' });
    }
    // the legend, beside the last bar, each name at its band
    let y = 0;
    const last = PUBLISHED.at(-1);
    for (const m of METHODS) {
      const v = last[m.key];
      p.area([[2016, y + v / 2 - 1.6], [2018, y + v / 2 - 1.6], [2018, y + v / 2 + 1.6], [2016, y + v / 2 + 1.6]], '').style.fill = FILLS[m.c];
      p.note(2019, y + v / 2, m.name, { dy: 4 });
      y += v;
    }
    p.note(1963, 50.7, '50.7', { anchor: 'middle', dy: -4, cls: 'halo' });
    p.note(2011, 19.1, '19.1', { anchor: 'middle', dy: -4, cls: 'halo' });
    ticks(p, { y: [0, 25, 50, 75, 100] });
  },

  // the old arguments, each as a state of the plan
  '2.12'(art) {
    const W = 940;
    const H = 500;
    const p = P(art, { w: W, h: H, x: [0, W], y: [H, 0], axes: false, pad: { l: 0, r: 0, t: 0, b: 0 }, alt: 'Eight small plans of the wheel, one for each argument about what economics is, from Menger and Schmoller in 1883 to the crisis of 2008, each showing which cells it moves, holds or leaves out and which it puts first.' });
    ARGUMENTS.forEach((A, i) => {
      const x0 = 14 + (i % 4) * 232;
      const y0 = 10 + Math.floor(i / 4) * 250;
      p.label(x0, y0 + 16, A.year, { roman: true, cls: 'room small' });
      p.label(x0, y0 + 34, A.who, { roman: true, cls: 'room' });
      p.label(x0, y0 + 52, A.short, { cls: 'note' });
      miniPlan(p, x0, y0 + 66, A.state);
    });
    const ly = H - 14;
    [['moving', FILLS.ochre, ''], ['put first', FILLS.ochreDeep, ''], ['held', null, 'hatch'], ['left out', null, 'out']].forEach(([t, f, k], j) => {
      const x = 14 + j * 150;
      const q = [[x, ly - 12], [x + 22, ly - 12], [x + 22, ly], [x, ly]];
      if (f) p.area(q, '').style.fill = f;
      if (k === 'hatch') p.area(q, '').style.fill = hatchOf(p.svg);
      p.pathPts([...q, q[0]], k === 'out' ? 'k thin dash faint' : 'k thin');
      p.note(x + 30, ly - 2, t);
    });
    p.note(620, ly - 2, 'rows, top to bottom: agents, markets, rules, methods');
  },

  // ten projects and the needs this part finds
  '2.13'(art) {
    const W = 940;
    const H = 470;
    const p = P(art, { w: W, h: H, x: [0, W], y: [H, 0], axes: false, pad: { l: 0, r: 0, t: 0, b: 0 }, alt: 'Ten projects that rebuild the teaching of economics as rows, and eight needs found in this part as columns. Every need but the last is met by at least one project; the last, a map of what each model holds, by none.' });
    const x0 = 268;
    const cw = 80;
    const top = 120;
    const rh = 32;
    NEEDS.forEach((n, j) => {
      const x = x0 + j * cw + cw / 2;
      if (j === NEEDS.length - 1) p.area([[x - cw / 2 + 4, top - 6], [x + cw / 2 - 4, top - 6], [x + cw / 2 - 4, top + PROJECTS.length * rh], [x - cw / 2 + 4, top + PROJECTS.length * rh]], 'f-ochre');
      const t = p.label(x - 6, top - 14, n, { roman: true, cls: 'note col' });
      t.setAttribute('transform', `rotate(-32 ${p.X(x - 6).toFixed(1)} ${p.Y(top - 14).toFixed(1)})`);
    });
    PROJECTS.forEach((pr, i) => {
      const y = top + i * rh + rh / 2;
      p.line(10, y + rh / 2, x0 + NEEDS.length * cw, y + rh / 2, 'guide');
      const t = p.label(12, y, pr.name, { dy: 5, roman: true, cls: 'room small' });
      const a = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      a.setAttribute('href', pr.href);
      a.setAttribute('class', 'room-door');
      t.parentNode.insertBefore(a, t);
      a.appendChild(t);
      if (pr.when) p.label(x0 - 12, y, pr.when, { anchor: 'end', dy: 5, cls: 'note' });
      NEEDS.forEach((_, j) => {
        const x = x0 + j * cw + cw / 2;
        if (pr.needs.includes(j)) p.dot(x, y, 'k', 6);
        else if (j === NEEDS.length - 1) p.ring(x, y, 'k dash', 6);
      });
    });
    p.label(x0 + (NEEDS.length - 0.5) * cw, top + PROJECTS.length * rh + 24, 'none yet', { anchor: 'middle', roman: true, cls: 'note' });
  },
};

export { SW_PS };

// Figure 2.2: the textbook's parts, and the findings it set aside, with
// where Part 1 takes each in (core, a field course, or not at all)
export const CANON = [[1890, 'Marshall'], [1937, 'Hicks, IS–LM'], [1947, 'Samuelson, Foundations'], [1948, 'Samuelson, Economics'], [1954, 'Arrow–Debreu'], [1956, 'Solow']];
export const FINDINGS = [
  { y: 1896, who: 'Pareto', what: 'incomes follow a power law', a: 'A1', part1: 'none', beat: 1 },
  { y: 1931, who: 'Gibrat', what: 'firms grow in proportion', a: 'A1', part1: 'none', beat: 1 },
  { y: 1936, who: 'Keynes', what: 'guessing what others guess', a: 'A6', part1: 'none', beat: 2 },
  { y: 1944, who: 'von Neumann, Morgenstern', what: 'games', a: 'A3', part1: 'core', beat: 2 },
  { y: 1949, who: 'Zipf', what: 'sizes by rank', a: 'A1', part1: 'none', beat: 1 },
  { y: 1950, who: 'Nash', what: 'equilibrium in any game', a: 'A3', part1: 'core', beat: 2 },
  { y: 1955, who: 'Simon', what: 'bounded rationality', a: 'A6', part1: 'none', beat: 2 },
  { y: 1960, who: 'Scarf', what: 'prices that never settle', a: 'A7', part1: 'none', beat: 2 },
  { y: 1967, who: 'Milgram', what: 'a few steps to anyone', a: 'A2', part1: 'none', beat: 3 },
  { y: 1970, who: 'Akerlof', what: 'hidden quality', a: 'A4', part1: 'core', beat: 2 },
  { y: 1973, who: 'Granovetter', what: 'weak ties', a: 'A2', part1: 'none', beat: 3 },
  { y: 1979, who: 'Kahneman, Tversky', what: 'prospect theory', a: 'A6', part1: 'field', beat: 2 },
  { y: 1998, who: 'Watts, Strogatz', what: 'small worlds', a: 'A2', part1: 'none', beat: 3 },
  { y: 2001, who: 'Axtell', what: 'Zipf’s law for firms', a: 'A1', part1: 'none', beat: 1 },
];

// the fills of the methods and the small plans
const FILLS = { chalk: 'rgba(31, 35, 30, 0.5)', violet: 'rgba(120, 90, 170, 0.55)', cobalt: 'rgba(42, 85, 160, 0.55)', ochre: 'rgba(168, 118, 28, 0.32)', ochreDeep: 'rgba(168, 118, 28, 0.75)', madder: 'rgba(176, 59, 59, 0.6)', olive: 'rgba(88, 118, 32, 0.45)' };
let hatchN = 0;
function hatchOf(svg) {
  const id = `p2-held-${hatchN++}`;
  const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  Object.entries({ id, patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }).forEach(([k, v]) => pat.setAttribute(k, v));
  const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  Object.entries({ x1: 0, y1: 0, x2: 0, y2: 5, stroke: '#1f231e', 'stroke-width': 1, opacity: 0.6 }).forEach(([k, v]) => ln.setAttribute(k, v));
  pat.appendChild(ln);
  svg.querySelector('defs').appendChild(pat);
  return `url(#${id})`;
}
// A small plan of the wheel (Figure 3.1's rings, agents on top) in a state:
// moving cells filled, those put first filled deeper, held cells hatched,
// cells left out dashed; dots of equal or unequal size for alike or unlike
// agents, and a tie between households and firms when the state ties them
function miniPlan(p, x0, y0, st) {
  const names = CELLS.map((c) => c.name);
  const moving = st.moving ? new Set(st.moving) : st.movingOf ? new Set(st.movingOf(names)) : null;
  const held = new Map(st.stopped ?? []);
  const lit = new Set(st.lit ?? []);
  const hatch = hatchOf(p.svg);
  const cw = 32;
  const ch = 22;
  const at = {};
  [3, 2, 1, 0].forEach((L, r) => LAYERS[L].rooms.forEach(([name], i) => {
    const x = x0 + i * cw;
    const y = y0 + r * ch;
    at[name] = [x + cw / 2, y + ch / 2];
    const q = [[x + 1, y + 1], [x + cw - 1, y + 1], [x + cw - 1, y + ch - 1], [x + 1, y + ch - 1]];
    const out = moving && !moving.has(name) && !held.has(name);
    if (held.has(name)) p.area(q, '').style.fill = hatch;
    else if (!out) p.area(q, '').style.fill = lit.has(name) ? FILLS.ochreDeep : FILLS.ochre;
    p.pathPts([...q, q[0]], out ? 'k thin dash faint' : 'k thin');
  }));
  for (const name of ['Households', 'Firms']) {
    const [cx, cy] = at[name];
    [-8, 0, 8].forEach((dx, k) => p.dot(cx + dx, cy, 'k', st.unlike ? [1.4, 2.6, 4.2][k] : st.alike ? 2.4 : 2));
  }
  if (st.tied === true || (Array.isArray(st.tied) && st.tied.includes('households'))) p.line(at.Households[0] - 8, at.Households[1], at.Firms[0] + 8, at.Firms[1], 'md');
  // what a held cell is held at, under the plan
  [...held].filter(([, v]) => v).forEach(([name, v], k) => p.label(x0, y0 + 4 * ch + 14 + 14 * k, `${name}: ${v}`, { cls: 'note small' }));
}
