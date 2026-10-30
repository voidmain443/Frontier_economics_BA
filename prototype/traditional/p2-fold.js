// Part 2, folded: the dimension each classical figure does not have, raised over
// the flat drawing of what replaces it. Same conventions as p1-fold.js: data
// units of the anchor drawing, plus a height h in plot widths.

import { SW, smallWorld, distances, chainAndCore, chainLayout, coreLayout, cutPairs, preferential, LEVELS, beauty, contagion } from './p2-models.js';
import { ringPos } from './p2-figs.js';

// dims: a dimension line along the raised axis. crowd: { asset, items }, the
// many agents that fill the figure's room in place of one representative
// (fold.js places them; an item may keep to a side, and a bank may fall)
const blank = () => ({ surfaces: [], quads: [], meshes: [], segs: [], lines: [], points: [], tags: [], eqs: [], agents: [], dims: [] });
const jitter = (i) => ((Math.abs(Math.sin((i + 1) * 91.17) * 43758.5453) % 1) - 0.5) * 0.6;

// columns standing on a plan, batched: tops and two faces in one mesh, edges in one set of lines
function columns(list, c, alpha) {
  const quads = [];
  const segs = [];
  for (const { x0, x1, y0, y1, h } of list) {
    quads.push([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]]);
    quads.push([[x0, y0, 0], [x1, y0, 0], [x1, y0, h], [x0, y0, h]]);
    quads.push([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]]);
    segs.push([[x0, y0, 0], [x0, y0, h]], [[x1, y0, 0], [x1, y0, h]], [[x1, y1, 0], [x1, y1, h]], [[x0, y0, h], [x1, y0, h]], [[x1, y0, h], [x1, y1, h]]);
  }
  return { mesh: { quads, c, alpha }, segs: { segs, c, w: 0.9, o: 0.7 } };
}

export const CONSTRUCTS = {
  // who is how many steps from you
  '2.1': {
    dom: { x: [-1.2, 1.2], y: [-1.2, 1.2] },
    build(data) {
      const X = blank();
      const g = smallWorld(SW.n, SW.k, data.state.p);
      const d = distances(g.adj, 0);
      const pos = ringPos(SW.n);
      const k = 0.035;
      const at = (i) => [pos[i][0], pos[i][1], d[i] * k];
      X.segs.push({ segs: g.edges.filter((e) => !e.rewired).map((e) => [at(e.a), at(e.b)]), c: 'chalk', w: 1, o: 0.55 });
      X.segs.push({ segs: g.edges.filter((e) => e.rewired).map((e) => [at(e.a), at(e.b)]), c: 'madder', w: 2.4, o: 1 });
      X.segs.push({ segs: pos.map((q, i) => [[q[0], q[1], 0], at(i)]), c: 'cobalt', w: 0.8, o: 0.35 });
      for (let i = 0; i < SW.n; i++) X.points.push({ at: at(i), c: 'cobalt', size: 5 });
      const far = d.indexOf(Math.max(...d));
      X.agents.push({ asset: 'person', at: [pos[0][0], pos[0][1], 0], scale: 0.045 });
      X.tags.push({ text: `the farthest person: ${d[far]} steps`, at: at(far) }, { text: 'steps from you, as height', at: [-1.2, 1.2, Math.max(...d) * k] });
      X.dims.push({ from: [1.2, -1.2, 0], to: [1.2, -1.2, d[far] * k], text: `steps 0 … ${d[far]}` });
      X.crowd = { asset: 'person_crowd', items: Array.from({ length: SW.n }, (_, i) => ({ s: 0.05, ry: jitter(i) })) };
      return X;
    },
  },

  // what breaks if this tie breaks
  '2.2': {
    dom: { x: [0, 2.2], y: [0, 1] },
    build() {
      const X = blank();
      const { chain, core, n } = chainAndCore();
      const cp = chainLayout();
      const kp = coreLayout().map(([x, y]) => [x + 1.2, y]);
      const k = 0.3 / 144;
      for (const [edges, pos] of [[chain, cp], [core, kp]]) {
        const cut = cutPairs(n, edges);
        const walls = [];
        edges.forEach(([a, b], i) => {
          if (!cut[i]) return;
          const h = cut[i] * k;
          walls.push([[...pos[a], 0], [...pos[b], 0], [...pos[b], h], [...pos[a], h]]);
        });
        X.meshes.push({ quads: walls, c: 'madder', alpha: 0.22 });
        X.segs.push({ segs: walls.map((q) => [q[3], q[2]]), c: 'madder', w: 1.8, o: 0.95 });
      }
      X.tags.push({ text: 'pairs cut off if this tie breaks: up to 144', at: [0.5, 0.6, 0.3], c: 'madder' }, { text: 'the core: at most 23, one student', at: [1.7, 0.95, 0.06] });
      X.dims.push({ from: [2.2, 0, 0], to: [2.2, 0, 0.3], text: 'pairs cut 0 … 144' });
      // the chain's students on the left of the page, the core's on the right
      X.crowd = { asset: 'person_crowd', items: Array.from({ length: 2 * n }, (_, i) => ({ s: 0.05, ry: jitter(i), side: i < n ? 'left' : 'right' })) };
      return X;
    },
  },

  // the size of every firm, as a skyline over the plan; the mean, as a plane through it
  '2.3': {
    dom: { x: [0, 20], y: [0, 20] },
    build() {
      const X = blank();
      const { deg, order, mean } = preferential();
      const k = 0.011;
      const cols = order.map((f, i) => ({ x0: (i % 20) + 0.12, x1: (i % 20) + 0.88, y0: Math.floor(i / 20) + 0.12, y1: Math.floor(i / 20) + 0.88, h: deg[f] * k }));
      const { mesh, segs } = columns(cols, 'cobalt', 0.3);
      X.meshes.push(mesh);
      X.segs.push(segs);
      X.quads.push({ q: [[0, 0, mean * k], [20, 0, mean * k], [20, 20, mean * k], [0, 20, mean * k]], c: 'ochre', alpha: 0.1 });
      const big = order.indexOf(deg.indexOf(Math.max(...deg)));
      X.tags.push({ text: `mean ${mean.toFixed(1)}: the representative firm, which no firm is`, at: [20, 0, mean * k], c: 'ochre' }, { text: `largest: ${Math.max(...deg)}`, at: [(big % 20) + 0.5, Math.floor(big / 20) + 0.5, Math.max(...deg) * k] });
      const max = Math.max(...deg);
      X.dims.push({ from: [20, 20, 0], to: [20, 20, max * k], text: `size ${Math.min(...deg)} … ${max}` });
      // four hundred firms, larger as they are larger (by the square root, so
      // that they fit the room: the skyline gives the sizes); small ones in front
      const sizes = [...deg].sort((a, b) => a - b);
      X.crowd = { asset: 'firm_crowd', items: sizes.map((v, i) => ({ s: 0.024 + 0.05 * Math.sqrt((v - sizes[0]) / (max - sizes[0])), ry: jitter(i) * 0.5 })) };
      return X;
    },
  },

  // reasoning level, as height: a staircase down to zero that few people climb
  '2.4': {
    dom: (data) => ({ x: [0, 100], y: [0, Math.max(...data.state.mix, 1) + 1] }),
    build(data) {
      const X = blank();
      const mix = data.state.mix;
      const top = Math.max(...mix, 1) + 1;
      const sy = 1;
      const hk = [0, 0.08, 0.16, 0.24, 0.4];
      const stair = [];
      LEVELS.forEach((L, i) => {
        const x = L.guess;
        if (mix[i]) {
          X.quads.push({ q: [[x - 1.6, 0, hk[i]], [x + 1.6, 0, hk[i]], [x + 1.6, mix[i] * sy, hk[i]], [x - 1.6, mix[i] * sy, hk[i]]], c: i === 4 ? 'madder' : 'cobalt', alpha: 0.35 });
          X.lines.push({ pts: [[x, 0, 0], [x, 0, hk[i]]], c: 'chalk', w: 1, o: 0.5, dash: true });
        }
        stair.push([x, 0.3, hk[i]]);
        if (i < LEVELS.length - 1) stair.push([LEVELS[i + 1].guess, 0.3, hk[i]]);
      });
      X.lines.push({ pts: stair, c: 'white', w: 2.4 });
      X.lines.push({ pts: [[beauty(mix).target, 0, 0], [beauty(mix).target, top, 0]], c: 'madder', w: 2 });
      X.tags.push({ text: 'level 1 reasons one step', at: [LEVELS[1].guess, 0.3, hk[1]] }, { text: 'Nash: the top of a staircase few climb', at: [0, 0.3, hk[4]], c: 'madder' }, { text: 'reasoning level, as height', at: [100, 0, 0.25] });
      X.dims.push({ from: [100, 0, 0], to: [100, 0, hk[4]], text: 'level 0 … Nash' });
      // the players, level 0 at the front of the room and Nash at the back
      X.crowd = { asset: 'person_crowd', items: mix.flatMap((m, lv) => Array.from({ length: m }, (_, j) => ({ s: 0.055, ry: jitter(lv * 10 + j) }))) };
      return X;
    },
  },

  // the round in which each bank fails, as height
  '2.5': {
    dom: { x: [0, 2.2], y: [0, 1] },
    build(data) {
      const X = blank();
      const s = data.state.shock;
      const pos = ringPos(10);
      const k = 0.06;
      const banks = [];
      let last = 0;
      for (const [cx, complete] of [[0.5, false], [1.7, true]]) {
        const r = contagion(s, complete);
        const at = (i) => [cx + 0.38 * pos[i][0], 0.5 + 0.42 * pos[i][1], r[i] * k];
        const segs = [];
        for (let i = 0; i < 10; i++) {
          if (!complete) segs.push([at(i), at((i + 1) % 10)]);
          else for (let j = i + 1; j < 10; j++) segs.push([at(i), at(j)]);
        }
        X.segs.push({ segs, c: 'chalk', w: 1, o: complete ? 0.25 : 0.6 });
        X.segs.push({ segs: r.map((v, i) => [[...at(i).slice(0, 2), 0], at(i)]).filter((q) => q[1][2] > 0), c: 'madder', w: 1.4, o: 0.6 });
        r.forEach((v, i) => {
          X.points.push({ at: at(i), c: v ? 'madder' : 'cobalt', size: 9 });
          banks.push({ s: 0.07, side: complete ? 'right' : 'left', fall: v > 0, round: v });
        });
        const end = Math.max(...r);
        last = Math.max(last, end);
        if (end) X.tags.push({ text: complete ? `all at once, round ${end}` : `one after another, to round ${end}`, at: at(r.indexOf(end)), c: 'madder' });
      }
      X.tags.push({ text: 'the round a bank fails, as height', at: [0, 1, 0.3] });
      if (last) X.dims.push({ from: [2.2, 0, 0], to: [2.2, 0, last * k], text: `round 1 … ${last}` });
      // the banks themselves stand in the room: each ring of the drawing on its own
      // side of the page, and a failed bank falls in the round it fails
      X.crowd = { asset: 'bank', items: banks };
      return X;
    },
  },
};
