// Part 3, flat: the archive drawn as a plan. Four layers of what economics
// studies, six rooms each; every name is a door to the course that teaches it.
// The later figures draw the ontology on the same plan (ontology.js): a model
// as a state of the wheel, the classical sequence as a run of states, and the
// assumptions by stage.

import { plot } from './figures.js';
import { MODELS, STAGES, RELATIONS, ASSUMPTIONS } from './ontology.js';
import { t, localHref } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';

// The order of rooms on each layer is the wheel's plan (wheel.js,
// docs/engine.md): a layer is a ring and its rooms are the ring's cells, so a
// figure that spans two cells is read where they meet, next to each other on a
// ring or one outside the other.
export const LAYERS = [
  { name: 'Methods', c: 'chalk', rooms: [
    ['Optimization', 'course.html?c=math'], ['Equilibrium', 'course.html?c=micro'], ['Strategy', 'course.html?c=games'],
    ['Measurement', 'course.html?c=metrics'], ['Computation', 'archive.html#b-computation'], ['History', 'course.html?c=history']] },
  { name: 'Institutions', c: 'olive', rooms: [
    ['Property', 'course.html?c=development'], ['Taxes', 'course.html?c=public'], ['Contracts', 'course.html?c=micro'],
    ['Regulation', 'course.html?c=io'], ['Policy rules', 'course.html?c=macro'], ['Networks', 'beyond.html#b4']] },
  { name: 'Markets', c: 'ochre', rooms: [
    ['Capital', 'course.html?c=finance'], ['Goods', 'course.html?c=principles'], ['Money', 'course.html?c=banking'],
    ['Labor', 'course.html?c=labor'], ['Foreign exchange', 'course.html?c=intlfin'], ['Land and air', 'course.html?c=environmental']] },
  // agents carry the maquette that stands in their room
  { name: 'Agents', c: 'cobalt', rooms: [
    ['Firms', 'course.html?c=io', 'firm'], ['Households', 'course.html?c=micro', 'household'], ['Banks', 'course.html?c=banking', 'bank'],
    ['Central banks', 'course.html?c=macro', 'central_bank'], ['Other countries', 'course.html?c=trade', 'rest_of_world'], ['Governments', 'course.html?c=public', 'government']] },
];

const FILL = { chalk: 'f-hatch', olive: 'f-olive', ochre: 'f-ochre', cobalt: 'f-cobalt' };

export const FIGS = {
  '3.1'(art) {
    const p = plot(art, { w: 940, h: 470, x: [-1.5, 6], y: [0, 4], axes: false, pad: { l: 10, r: 10, t: 14, b: 14 }, alt: 'The archive as a plan: four layers, methods at the bottom and agents at the top, six cells each, the wheel laid flat; every cell links to a course.' });
    LAYERS.forEach((layer, L) => {
      p.line(-1.5, L, 6, L, 'k thin');
      p.label(-1.45, L + 0.5, layer.name, { dy: 6, roman: true, cls: 'step' });
      layer.rooms.forEach(([name, href], i) => {
        p.area([[i + 0.06, L + 0.1], [i + 0.94, L + 0.1], [i + 0.94, L + 0.9], [i + 0.06, L + 0.9]], FILL[layer.c]);
        p.pathPts([[i + 0.06, L + 0.1], [i + 0.94, L + 0.1], [i + 0.94, L + 0.9], [i + 0.06, L + 0.9], [i + 0.06, L + 0.1]], 'k thin');
        const t = p.label(i + 0.5, L + 0.5, name, { anchor: 'middle', dy: 6, roman: true, cls: 'room' });
        const a = document.createElementNS(NS, 'a');
        a.setAttribute('href', localHref(href));
        a.setAttribute('class', 'room-door');
        t.parentNode.insertBefore(a, t);
        a.appendChild(t);
      });
    });
    p.line(-1.5, 4, 6, 4, 'k thin');
  },

  // a model is a state of the wheel: two models on the plan of Figure 3.1
  '3.2'(art) {
    const p = plot(art, { w: 940, h: 600, x: [-1.5, 6], y: [0, 10.2], axes: false, pad: { l: 10, r: 10, t: 10, b: 10 }, alt: 'Two models drawn on the plan of the archive. Figure 1.1 moves the goods market and the taxes beside it, holds the households, the firms and the labor market still, with income held at 1, and leaves out the rest. Figure 6.2 moves goods, money, households and firms, holds the price level, government spending and the money supply, and leaves out banks, other countries and the rest.' });
    const hatch = hatchPattern(p.svg);
    const byId = Object.fromEntries(MODELS.map((m) => [m.id, m]));
    [['1.1', 5.5, 'Figure 1.1, supply and demand'], ['6.2', 0, 'Figure 6.2, IS–LM']].forEach(([id, y0, title]) => {
      const m = byId[id];
      const held = new Map(m.held.filter(([c]) => c));
      const moving = new Set([...m.moving, m.method]);
      p.label(-1.45, y0 + 4.32, title, { roman: true, cls: 'step' });
      planRows(p, y0, (name) => (moving.has(name) ? 'm' : held.has(name) ? 's' : 'o'), (name) => held.get(name), hatch);
    });
    legend(p, 6, 9.95, hatch);
  },

  // the classical sequence as states of the wheel, stage by stage
  '3.3'(art) {
    const W = 940;
    const H = 470;
    const p = plot(art, { w: W, h: H, x: [0, W], y: [H, 0], axes: false, pad: { l: 0, r: 0, t: 0, b: 0 }, alt: 'The eight stages of Part 1 as rows, the 24 cells of the wheel as columns, from the agents on the rim to the methods at the hub. Each stage opens, adds, relaxes or measures one thing; by stage 8 every cell moves but two, networks and computation.' });
    const hatch = hatchPattern(p.svg);
    const cols = columns(206, 21, 7);
    const top = 128;
    const rh = 36;
    header(p, cols, top - 8);
    let prev = null;
    STAGES.forEach((S, i) => {
      const y = top + i * rh;
      const moving = new Set(S.moving);
      const held = new Map(S.held);
      const mode = (n) => (moving.has(n) ? 'm' : held.has(n) ? 's' : 'o');
      p.label(8, y + 23, String(S.no), { roman: true, cls: 'step' });
      p.label(32, y + 23, S.name, { roman: true, cls: 'room' });
      for (const c of cols) {
        const md = mode(c.name);
        const changed = prev && prev(c.name) !== md;
        box(p, c.x, y + 6, 18, rh - 12, md, c.c, hatch, changed);
      }
      const R = RELATIONS.find((r) => r.id === S.rel);
      p.label(cols.at(-1).x + 34, y + 23, `${t(R ? R.name : 'Starts')}: ${t(S.what)}`, { roman: true, cls: 'note' });
      prev = mode;
    });
    legend(p, null, null, hatch, { x: 206, y: top + 8 * rh + 30 });
  },

  // where each classical assumption is made and relaxed
  '3.4'(art) {
    const W = 940;
    const H = 470;
    const p = plot(art, { w: W, h: H, x: [0, W], y: [H, 0], axes: false, pad: { l: 0, r: 0, t: 0, b: 0 }, alt: 'Eight classical assumptions as rows, the eight stages of Part 1 and Part 2 as columns. Six assumptions are relaxed somewhere in Part 1. Two, a representative agent and no connections, are relaxed only in Part 2; the first is touched once, in passing, in figure 8.10.' });
    const x0 = 316;
    const cw = 54;
    const top = 58;
    const rh = 44;
    const colX = (k) => x0 + (k - 0.5) * cw;
    for (let k = 1; k <= 8; k++) p.label(colX(k), top - 14, `Stage ${k}`, { anchor: 'middle', roman: true, cls: 'room small' });
    const p2x = colX(8.5) + 12;
    p.label(p2x + 70, top - 14, 'Part 2', { anchor: 'middle', roman: true, cls: 'room small' });
    p.line(p2x, top - 4, p2x, top + 8 * rh, 'k thin');
    ASSUMPTIONS.forEach((A, i) => {
      const y = top + i * rh;
      if (!Object.keys(A.relaxed).length) p.area([[4, y + 2], [W - 4, y + 2], [W - 4, y + rh - 2], [4, y + rh - 2]], 'f-madder');
      p.line(4, y + rh, W - 4, y + rh, 'guide');
      p.label(10, y + 19, `${A.id}  ${A.name}`, { roman: true, cls: 'room' });
      p.label(10, y + 36, A.says, { cls: 'note' });
      for (let k = 1; k <= 8; k++) {
        const marks = [['made', A.made[k]], ['relaxed', A.relaxed[k]], ['touched', A.touched?.[k]]].filter(([, f]) => f);
        // two marks in one stage stand one above the other
        marks.forEach(([kind, fig], j) => {
          const x = colX(k) - 10;
          const yy = y + rh / 2 + (marks.length > 1 ? (j - 0.5) * 18 : 0);
          mark(p, x, yy, kind);
          p.label(x + 10, yy + 4.5, fig, { roman: true, cls: 'note' });
        });
      }
      (A.p2 ?? []).forEach((fig, j) => {
        const x = p2x + 18 + j * 40;
        mark(p, x, y + rh / 2, 'p2');
        p.label(x + 10, y + rh / 2 + 4.5, fig, { roman: true, cls: 'note md' });
      });
    });
    const ly = top + 8 * rh + 30;
    [['made', 'made'], ['relaxed', 'relaxed in Part 1'], ['touched', 'relaxed in passing'], ['p2', 'relaxed in Part 2']].forEach(([kind, text], j) => {
      mark(p, x0 - 6 + j * 150, ly - 5, kind);
      p.label(x0 + 6 + j * 150, ly, text, { roman: true, cls: 'note' });
    });
  },
};

// ---- the plan in a model's state ----

const SOLID = { chalk: 'rgba(31, 35, 30, 0.42)', olive: 'rgba(88, 118, 32, 0.6)', ochre: 'rgba(168, 118, 28, 0.62)', cobalt: 'rgba(42, 85, 160, 0.6)' };

let hatchN = 0;
function hatchPattern(svg) {
  const id = `held-${hatchN++}`;
  const defs = svg.querySelector('defs');
  const pat = document.createElementNS(NS, 'pattern');
  pat.setAttribute('id', id);
  pat.setAttribute('patternUnits', 'userSpaceOnUse');
  pat.setAttribute('width', '7');
  pat.setAttribute('height', '7');
  pat.setAttribute('patternTransform', 'rotate(45)');
  const ln = document.createElementNS(NS, 'line');
  Object.entries({ x1: 0, y1: 0, x2: 0, y2: 7, stroke: '#1f231e', 'stroke-width': 1.2, opacity: 0.55 }).forEach(([k, v]) => ln.setAttribute(k, v));
  pat.appendChild(ln);
  defs.appendChild(pat);
  return `url(#${id})`;
}

// the four rings of Figure 3.1, from y0, each cell drawn as moving (its
// ring's colour), held (hatched, with its value) or left out (an outline)
function planRows(p, y0, mode, value, hatch) {
  LAYERS.forEach((layer, L) => {
    const y = y0 + L;
    p.label(-1.45, y + 0.5, layer.name, { dy: 6, roman: true, cls: 'step' });
    layer.rooms.forEach(([name], i) => {
      const md = mode(name);
      const q = [[i + 0.06, y + 0.1], [i + 0.94, y + 0.1], [i + 0.94, y + 0.9], [i + 0.06, y + 0.9]];
      if (md !== 'o') p.area(q, md === 'm' ? FILL[layer.c] : '').style.fill = md === 'm' ? '' : hatch;
      p.pathPts([...q, q[0]], md === 'o' ? 'k thin dash faint' : 'k thin');
      const v = md === 's' ? value(name) : '';
      p.label(i + 0.5, y + 0.5, name, { anchor: 'middle', dy: v ? -1 : 6, roman: true, cls: `room${md === 'o' ? ' out' : ''}` });
      if (v) p.label(i + 0.5, y + 0.5, v, { anchor: 'middle', dy: 16, cls: 'note held' });
    });
  });
}

// the legend: moving, held, left out
function legend(p, x, y, hatch, px = null) {
  const items = [['m', 'moving'], ['s', 'held still, at a value'], ['o', 'left out']];
  items.forEach(([md, text], j) => {
    if (px) {
      box(p, px.x + j * 190, px.y - 12, 18, 16, md, 'ochre', hatch);
      p.label(px.x + j * 190 + 26, px.y + 1, text, { roman: true, cls: 'note' });
      return;
    }
    const xx = x - 4.4 + j * 1.5;
    const q = [[xx, y - 0.2], [xx + 0.25, y - 0.2], [xx + 0.25, y + 0.05], [xx, y + 0.05]];
    if (md !== 'o') p.area(q, md === 'm' ? 'f-ochre' : '').style.fill = md === 'm' ? '' : hatch;
    p.pathPts([...q, q[0]], md === 'o' ? 'k thin dash faint' : 'k thin');
    p.label(xx + 0.32, y - 0.08, text, { dy: 5, roman: true, cls: 'note' });
  });
}

// the 24 cells as columns, from the rim (agents) to the hub (methods)
function columns(x0, w, gap) {
  const out = [];
  [3, 2, 1, 0].forEach((L, g) => LAYERS[L].rooms.forEach(([name], i) => out.push({ name, c: LAYERS[L].c, layer: LAYERS[L].name, x: x0 + (g * 6 + i) * w + g * gap })));
  return out;
}
function header(p, cols, y) {
  for (const c of cols) {
    const t = p.label(c.x + 9, y, c.name, { roman: true, cls: 'note col' });
    t.setAttribute('transform', `rotate(-58 ${p.X(c.x + 9)} ${p.Y(y)})`);
  }
}
function box(p, x, y, w, h, md, c, hatch, strong = false) {
  const q = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  if (md !== 'o') {
    const a = p.area(q, '');
    a.style.fill = md === 'm' ? SOLID[c] : hatch;
  }
  p.pathPts([...q, q[0]], strong ? 'k' : md === 'o' ? 'k thin faint' : 'k thin');
}
function mark(p, x, y, kind) {
  if (kind === 'made') p.ring(x, y, 'k', 6);
  else if (kind === 'relaxed') p.dot(x, y, 'k', 6);
  else if (kind === 'touched') p.ring(x, y, 'k dash', 6);
  else p.dot(x, y, 'md', 6);
}
