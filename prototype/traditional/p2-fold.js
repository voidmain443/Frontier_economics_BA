// Part 2, folded: the dimension each classical figure does not have, raised over
// the flat drawing of what replaces it. Same conventions as p1-fold.js: data
// units of the anchor drawing, plus a height h in plot widths.

import { SW, smallWorld, distances, chainAndCore, chainLayout, coreLayout, cutPairs, preferential, LEVELS, beauty, contagion, fifths, io, rounds, excessScarf, excessOne, tatonnement, onSimplex, SCARF_P0, METHODS, PUBLISHED, ARGUMENTS, PROJECTS } from './p2-models.js';
import { ringPos, FINDINGS } from './p2-figs.js';
import { CELLS } from './wheel.js';
import { MEASURED } from './ontology.js';

// dims: a dimension line along the raised axis. crowd: { asset, items }, the
// many agents that fill the figure's room in place of one representative
// (fold.js places them; an item may keep to a side, and a bank may fall)
const blank = () => ({ surfaces: [], quads: [], meshes: [], segs: [], lines: [], points: [], tags: [], eqs: [], agents: [], dims: [] });
const jitter = (i) => ((Math.abs(Math.sin((i + 1) * 91.17) * 43758.5453) % 1) - 0.5) * 0.6;
// in a story, the dimension the classical figure lacks comes in and rises as
// beat 1 begins (fold.js)
const UP = { show: [1], rise: 1 };
const e01 = (t) => t * t * (3 - 2 * t);
const cl01 = (t) => Math.min(1, Math.max(0, t));

// an engine that starts at a beat of its story and runs in time while the
// figure stands; before that beat it shows nothing (fold.js)
function fromBeat(from, sets, draw) {
  const st = { t: 0 };
  const none = { dots: sets.dots.map(() => []), segs: (sets.segs ?? []).map(() => []) };
  return {
    ...sets,
    step(dt, { grow, reduced, beat }) {
      if (grow < 0.02) { st.t = 0; return null; }
      if ((beat ?? Infinity) < from - 0.5) { st.t = 0; return none; }
      st.t += dt;
      return draw(reduced ? Infinity : st.t);
    },
  };
}

// 2.6: a letter passed from friend to friend along a shortest path, as in
// Milgram's study, one hop every HOP seconds; each hop climbs one step
function letterEngine(path, at) {
  const HOP = 0.55;
  const span = HOP * (path.length - 1);
  return fromBeat(2, { dots: [{ c: 'ochre', size: 12, o: 1, glow: 0.5, max: 1 }], segs: [{ c: 'ochre', w: 2.6, o: 1, max: 600 }] }, (t) => {
    const u = t === Infinity ? span : t % (span + 2.4);
    const segs = [];
    let head = at(path[0]);
    for (let i = 0; i + 1 < path.length; i++) {
      const f = cl01((u - i * HOP) / HOP);
      if (f <= 0) break;
      const A = at(path[i]);
      const B = at(path[i + 1]);
      const n = Math.max(1, Math.ceil(12 * f));
      let prev = A;
      for (let j = 1; j <= n; j++) {
        const v = (f * j) / n;
        const q = [A[0] + (B[0] - A[0]) * v, A[1] + (B[1] - A[1]) * v, A[2] + (B[2] - A[2]) * e01(v) + 0.05 * v * (1 - v)];
        segs.push([prev, q]);
        prev = q;
      }
      head = prev;
    }
    return { dots: [[[...head, 1]]], segs: [segs] };
  });
}

// 2.7: the tallest tie of the chain breaks; its two ends pull apart, and the
// students on each side of it take their own colour
function breakEngine(pos, edges, cut) {
  const e = cut.indexOf(Math.max(...cut));
  const [a, b] = edges[e];
  const adj = pos.map(() => []);
  edges.forEach(([x, y], i) => { if (i !== e) { adj[x].push(y); adj[y].push(x); } });
  const side = new Set([a]);
  const q = [a];
  for (let i = 0; i < q.length; i++) for (const v of adj[q[i]]) if (!side.has(v)) { side.add(v); q.push(v); }
  const P = (i) => [...pos[i], 0.004];
  return fromBeat(2, { dots: [{ c: 'cobaltInk', size: 8, o: 1, max: 24 }, { c: 'madderInk', size: 8, o: 1, max: 24 }], segs: [{ c: 'madder', w: 3, o: 1, max: 2 }] }, (t) => {
    const f = e01(cl01(t / 0.8));
    const k = cl01((t - 0.5) / 0.6);
    const dots = [[], []];
    pos.forEach((_, i) => dots[side.has(i) || k === 0 ? 0 : 1].push([...P(i), 1]));
    const A = P(a);
    const B = P(b);
    const m = A.map((v, j) => (v + B[j]) / 2);
    const g = 0.5 * f;
    const lerp3 = (U, V, w) => U.map((v, j) => v + (V[j] - v) * w);
    return { dots, segs: [[[A, lerp3(m, A, g)], [lerp3(m, B, g), B]]] };
  });
}

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
  '2.6': {
    dom: { x: [-1.2, 1.2], y: [-1.2, 1.2] },
    build(data) {
      const X = blank();
      const g = smallWorld(SW.n, SW.k, data.state.p);
      const d = distances(g.adj, 0);
      const pos = ringPos(SW.n);
      const k = 0.035;
      const at = (i) => [pos[i][0], pos[i][1], d[i] * k];
      X.segs.push({ segs: g.edges.filter((e) => !e.rewired).map((e) => [at(e.a), at(e.b)]), c: 'chalk', w: 1, o: 0.55, ...UP });
      X.segs.push({ segs: g.edges.filter((e) => e.rewired).map((e) => [at(e.a), at(e.b)]), c: 'madder', w: 2.4, o: 1, ...UP });
      X.segs.push({ segs: pos.map((q, i) => [[q[0], q[1], 0], at(i)]), c: 'cobalt', w: 0.8, o: 0.35, ...UP });
      for (let i = 0; i < SW.n; i++) X.points.push({ at: at(i), c: 'cobalt', size: 5, ...UP });
      const far = d.indexOf(Math.max(...d));
      X.agents.push({ asset: 'person', at: [pos[0][0], pos[0][1], 0], scale: 0.045 });
      X.tags.push({ text: `the farthest person: ${d[far]} steps`, at: at(far), show: [2] }, { text: 'steps from you, as height', at: [-1.2, 1.2, Math.max(...d) * k], ...UP });
      X.dims.push({ from: [1.2, -1.2, 0], to: [1.2, -1.2, d[far] * k], text: `steps 0 … ${d[far]}`, ...UP });
      X.crowd = { asset: 'person_crowd', items: Array.from({ length: SW.n }, (_, i) => ({ s: 0.05, ry: jitter(i) })) };
      // the letter's way: back from the farthest person along shorter distances
      const path = [far];
      while (d[path[path.length - 1]] > 0) path.push(g.adj[path[path.length - 1]].find((v) => d[v] === d[path[path.length - 1]] - 1));
      X.engine = letterEngine(path.reverse(), at);
      X.story = [
        { say: 'Eighty people on a ring, each tied to the six nearest. The red ties have been rewired at random into shortcuts.' },
        { say: 'Raise each person by the number of steps it takes to reach them from you. On a plain ring the far side would stand 14 steps high.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [0, 0, 0.12] }, dur: 1.6 },
        { say: `Send a letter to the farthest person, from friend to friend, as Milgram’s senders did. With these shortcuts it arrives in ${d[far]} steps.`, cam: { az: -0.3, el: 0.22, zoom: 0.8, at: [0, 0, 0.12] }, dur: 1.4 },
        { say: 'Granovetter (1973) found that people often hear of jobs through acquaintances rather than close friends: the weak ties are the shortcuts. Rewire more with the slider in the margin, and distance collapses long before neighbours stop knowing one another.', cam: { az: -0.6, el: 0.12, zoom: 0.9, at: [0, 0, 0.1] } },
        { say: 'On the wheel, households now buy from and work for the few firms they are tied to, and what they send one another travels along those ties instead of through the market.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
      ];
      X.model = (b) => (b >= 4 ? { tied: ['households'] } : null);
      return X;
    },
  },

  // what breaks if this tie breaks
  '2.7': {
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
        X.meshes.push({ quads: walls, c: 'madder', alpha: 0.22, ...UP });
        X.segs.push({ segs: walls.map((q) => [q[3], q[2]]), c: 'madder', w: 1.8, o: 0.95, ...UP });
      }
      X.tags.push({ text: 'pairs cut off if this tie breaks: up to 144', at: [0.5, 0.6, 0.3], c: 'madder', ...UP }, { text: 'the core: at most 23, one student', at: [1.7, 0.95, 0.06], show: [3] });
      X.dims.push({ from: [2.2, 0, 0], to: [2.2, 0, 0.3], text: 'pairs cut 0 … 144', ...UP });
      X.engine = breakEngine(cp, chain, cutPairs(n, chain));
      // the chain's students on the left of the page, the core's on the right
      X.crowd = { asset: 'person_crowd', items: Array.from({ length: 2 * n }, (_, i) => ({ s: 0.05, ry: jitter(i), side: i < n ? 'left' : 'right' })) };
      X.story = [
        { say: 'Twenty-four students linked as a long chain with short branches, and twenty-four linked around a core. On average each has about two partners in the chain and two and a half in the core.' },
        { say: 'Raise every tie as a wall, as tall as the number of pairs of students who would be cut off from each other if it broke.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [1.1, 0.5, 0.1] }, dur: 1.6 },
        { say: 'Break the tallest tie in the chain. The students on either side can no longer reach each other: 144 pairs are cut apart by one tie.', cam: { az: -0.35, el: 0.2, zoom: 0.7, at: [0.5, 0.5, 0.08] }, dur: 1.2 },
        { say: 'In the core no tie stands higher than 23, and those only where one student hangs off the edge. Two networks with similar averages differ completely in what one broken tie does.', cam: { az: 0.45, el: 0.16, zoom: 0.7, at: [1.7, 0.5, 0.05] } },
      ];
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
      X.meshes.push({ ...mesh, ...UP });
      X.segs.push({ ...segs, ...UP });
      X.quads.push({ q: [[0, 0, mean * k], [20, 0, mean * k], [20, 20, mean * k], [0, 20, mean * k]], c: 'ochre', alpha: 0.1, show: [2] });
      const max = Math.max(...deg);
      const big = order.indexOf(deg.indexOf(max));
      const below = Math.round((100 * deg.filter((v) => v < mean).length) / deg.length);
      X.tags.push({ text: `mean ${mean.toFixed(1)}: the representative firm, which no firm is`, at: [20, 0, mean * k], c: 'ochre', show: [2] }, { text: `largest: ${max}`, at: [(big % 20) + 0.5, Math.floor(big / 20) + 0.5, max * k], ...UP });
      X.dims.push({ from: [20, 20, 0], to: [20, 20, max * k], text: `size ${Math.min(...deg)} … ${max}`, ...UP });
      // four hundred firms, larger as they are larger (by the square root, so
      // that they fit the room: the skyline gives the sizes); small ones in front
      const sizes = [...deg].sort((a, b) => a - b);
      X.crowd = { asset: 'firm_crowd', items: sizes.map((v, i) => ({ s: 0.024 + 0.05 * Math.sqrt((v - sizes[0]) / (max - sizes[0])), ry: jitter(i) * 0.5 })) };
      // on the wheel, the largest of its firms stops as the last beat begins
      X.wheel = (b) => (b >= 2.5 ? { firms: [0] } : {});
      X.wheelTag = 'the largest firm, stopped: a seventh of the flow';
      X.story = [
        { say: 'Four hundred firms grown by preferential attachment, darker for larger: newcomers link to those already well connected.' },
        { say: 'Raise every firm as tall as it is large. A few giants stand over a long tail.', cam: { az: -0.5, el: 0.16, zoom: 0.85, at: [10, 10, 0.06] }, dur: 1.6 },
        { say: `The mean is a plane at height ${mean.toFixed(1)}, and it runs through no actual firm: ${below} percent stand below it, and the largest is about ${(max / mean).toFixed(1)} times the mean.`, cam: { az: -0.65, el: 0.1, zoom: 0.85, at: [10, 10, 0.06] } },
        { say: 'The wheel’s 600 firms have sizes of the same kind, by Zipf’s law, and goods, work and pay reach each in proportion to its size. Stop the largest, and a seventh of all that flow stops with it: shocks to giants do not average out (Gabaix 2011).', cam: { az: -0.35, el: 0.22, zoom: 1.7, at: null }, dur: 1.6 },
      ];
      return X;
    },
  },

  // reasoning level, as height: a staircase down to zero that few people climb
  '2.5': {
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
          X.quads.push({ q: [[x - 1.6, 0, hk[i]], [x + 1.6, 0, hk[i]], [x + 1.6, mix[i] * sy, hk[i]], [x - 1.6, mix[i] * sy, hk[i]]], c: i === 4 ? 'madder' : 'cobalt', alpha: 0.35, ...UP });
          X.lines.push({ pts: [[x, 0, 0], [x, 0, hk[i]]], c: 'chalk', w: 1, o: 0.5, dash: true, ...UP });
        }
        stair.push([x, 0.3, hk[i]]);
        if (i < LEVELS.length - 1) stair.push([LEVELS[i + 1].guess, 0.3, hk[i]]);
      });
      X.lines.push({ pts: stair, c: 'white', w: 2.4, show: [2], draw: 2, head: 'white' });
      const { target } = beauty(mix);
      X.lines.push({ pts: [[target, 0, 0], [target, top, 0]], c: 'madder', w: 2, show: [3] });
      X.tags.push({ text: 'level 1 reasons one step', at: [LEVELS[1].guess, 0.3, hk[1]], show: [2] }, { text: 'Nash: the top of a staircase few climb', at: [0, 0.3, hk[4]], c: 'madder', show: [2] }, { text: 'reasoning level, as height', at: [100, 0, 0.25], ...UP });
      X.dims.push({ from: [100, 0, 0], to: [100, 0, hk[4]], text: 'level 0 … Nash', ...UP });
      // the players, level 0 at the front of the room and Nash at the back
      X.crowd = { asset: 'person_crowd', items: mix.flatMap((m, lv) => Array.from({ length: m }, (_, j) => ({ s: 0.055, ry: jitter(lv * 10 + j) }))) };
      X.story = [
        { say: 'Everyone chooses a number from 0 to 100, and the winner is closest to two-thirds of the average. The bars count the players who reason zero, one, two or three steps, or all the way.' },
        { say: 'Raise each level of reasoning as height. Level 0 guesses 50, on the page.', cam: { az: 0.5, el: 0.14, zoom: 0.85, at: [40, 1, 0.15] }, dur: 1.4 },
        { say: 'Each step up guesses a third lower, and the steps lead down to 0, the only Nash equilibrium, at the top. The guesses trace a staircase, and the bars show how few players climb it.', dur: 2.2 },
        { say: `In Rosemarie Nagel’s experiments first guesses averaged 36.7: most players reason one or two steps and stop. With this mix the winning number is ${target.toFixed(1)}${target >= 1 ? ', and a guess of 0 loses' : ''}. Change the mix in the margin.`, cam: { az: 0.3, el: 0.3, zoom: 0.85, at: [35, 1, 0.1] } },
      ];
      return X;
    },
  },

  // the round in which each bank fails, as height
  '2.9': {
    dom: { x: [0, 2.2], y: [0, 1] },
    build(data) {
      const X = blank();
      const s = data.state.shock;
      const pos = ringPos(10);
      const k = 0.06;
      const banks = [];
      const told = [];
      let last = 0;
      for (const [cx, complete] of [[0.5, false], [1.7, true]]) {
        const r = contagion(s, complete);
        const at = (i) => [cx + 0.38 * pos[i][0], 0.5 + 0.42 * pos[i][1], r[i] * k];
        const segs = [];
        for (let i = 0; i < 10; i++) {
          if (!complete) segs.push([at(i), at((i + 1) % 10)]);
          else for (let j = i + 1; j < 10; j++) segs.push([at(i), at(j)]);
        }
        X.segs.push({ segs, c: 'chalk', w: 1, o: complete ? 0.25 : 0.6, ...UP });
        X.segs.push({ segs: r.map((v, i) => [[...at(i).slice(0, 2), 0], at(i)]).filter((q) => q[1][2] > 0), c: 'madder', w: 1.4, o: 0.6, ...UP });
        r.forEach((v, i) => {
          X.points.push({ at: at(i), c: v ? 'madder' : 'cobalt', size: 9, ...UP });
          banks.push({ s: 0.07, side: complete ? 'right' : 'left', fall: v > 0, round: v });
        });
        const end = Math.max(...r);
        last = Math.max(last, end);
        if (end) X.tags.push({ text: complete ? `all at once, round ${end}` : `one after another, to round ${end}`, at: at(r.indexOf(end)), c: 'madder', ...UP });
        told.push({ n: r.filter(Boolean).length, end });
      }
      X.tags.push({ text: 'the round a bank fails, as height', at: [0, 1, 0.3], ...UP });
      if (last) X.dims.push({ from: [2.2, 0, 0], to: [2.2, 0, last * k], text: `round 1 … ${last}`, ...UP });
      // the banks themselves stand in the room: each ring of the drawing on its own
      // side of the page, and a failed bank falls in the round it fails, once
      // the story reaches beat 2
      X.crowd = { asset: 'bank', items: banks, from: 2 };
      const [ring, dense] = told;
      const banksOf = (n) => (n === 1 ? 'one bank fails' : `${n} banks fail`);
      X.story = [
        { say: 'Ten banks with a buffer of 1 each. A failed bank passes its loss beyond the buffer, in equal parts, to the banks it owes: on the left only the next one, on the right all the others.' },
        { say: 'Raise each bank to the round in which it fails. The ones that survive stay on the page.', cam: { az: -0.5, el: 0.14, zoom: 0.85, at: [1.1, 0.5, 0.12] }, dur: 1.6 },
        { say: `A loss of ${s} at the first bank. On the ring ${banksOf(ring.n)}${ring.n > 1 ? `, one after another, to round ${ring.end}` : ''}; in the dense network ${dense.n === 1 ? 'only the first fails' : `${dense.n} banks fail, all by round ${dense.end}`}. Beside the page they fall in their rounds.`, cam: { az: -0.3, el: 0.3, zoom: 1.4, at: [1.1, 0.5, 0.05] }, dur: 1.4 },
        { say: 'They are the wheel’s ten banks, each now tied to the bank it owes and to the firms it lends to. Each that fails turns red there too, and the saving and lending that ran through it stop. Raise the loss above 10 with the slider, and the dense network falls all at once, in round 2.', cam: { az: -0.25, el: 0.4, zoom: 2.2, at: null }, dur: 1.6 },
      ];
      X.model = (b) => (b >= 3 ? { tied: true } : null);
      return X;
    },
  },
  // each fifth of households, by its share of all income and of all spending
  '2.4': {
    dom: { x: [0, 10], y: [0, 6] },
    build(data) {
      const X = blank();
      const F = fifths(data['korea-households']);
      const k = 0.5;
      const pct = (v) => `${Math.round(100 * v)}%`;
      const inc = [];
      const spend = [];
      for (const r of F.rows) {
        inc.push({ x0: r.y - 0.3, x1: r.y, y0: r.c - 0.12, y1: r.c + 0.12, h: r.ys * k });
        spend.push({ x0: r.y, x1: r.y + 0.3, y0: r.c - 0.12, y1: r.c + 0.12, h: r.cs * k });
      }
      const a = columns(inc, 'cobalt', 0.35);
      const b = columns(spend, 'ochre', 0.35);
      X.meshes.push({ ...a.mesh, ...UP });
      X.segs.push({ ...a.segs, ...UP });
      X.meshes.push({ ...b.mesh, show: [2], rise: 2 });
      X.segs.push({ ...b.segs, show: [2], rise: 2 });
      const [bot, , , , top] = F.rows;
      X.tags.push(
        { text: `top fifth: ${pct(top.ys)} of all income`, at: [top.y - 0.15, top.c, top.ys * k], c: 'cobalt', ...UP },
        { text: `bottom fifth: ${pct(bot.ys)} of all income`, at: [bot.y - 0.15, bot.c, bot.ys * k], c: 'cobalt', ...UP },
        { text: `${pct(top.cs)} of all spending`, at: [top.y + 0.15, top.c, top.cs * k], c: 'ochre', show: [2] },
        { text: `${pct(bot.cs)} of all spending`, at: [bot.y + 0.15, bot.c, bot.cs * k], c: 'ochre', show: [2] },
      );
      X.dims.push({ from: [10, 0, 0], to: [10, 0, top.ys * k], text: `share of all income 0 … ${pct(top.ys)}`, ...UP });
      // on the wheel, the households take their sizes by income, fifth by fifth
      X.model = (b2) => (b2 >= 3 ? { unlike: true } : null);
      X.story = [
        { say: `Korean households in ${F.year}, in five fifths by income: what each spends a month against what it has to spend. The line through the average is the representative household, which spends ${pct(F.all.apc)} of whatever it has.` },
        { say: `Raise each fifth by its share of all disposable income. The top fifth has ${pct(top.ys)} of it; the bottom fifth, ${pct(bot.ys)}.`, cam: { az: -0.5, el: 0.16, zoom: 0.85, at: [5, 3, 0.08] }, dur: 1.6 },
        { say: `Beside each, its share of all spending. The bottom fifth does ${pct(bot.cs)} of the spending with ${pct(bot.ys)} of the income, the top fifth ${pct(top.cs)} with ${pct(top.ys)}. A won given to one does not do what a won given to the other does.`, cam: { az: -0.3, el: 0.22, zoom: 0.85, at: [5, 3, 0.08] }, dur: 1.4 },
        { say: 'On the wheel the households take their sizes by income, each dot in its fifth, the area in proportion to that fifth’s income. The representative household drew them all alike.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
      ];
      return X;
    },
  },

  // the output a won of final demand draws from each sector, round by round
  '2.8': {
    dom: { x: [-2.2, 2.2], y: [-2.2, 2.2] },
    build(data) {
      const X = blank();
      const m = io(data['korea-io']);
      const j = data.state.sector;
      const R = rounds(m, j);
      const pos = ringPos(m.n);
      const k = 0.2;
      const w = 0.07;
      // each sector a column on the circle, in stacked rounds: the won itself,
      // its suppliers, theirs, and the rest; each round comes in at its beat
      const layers = [['r0', 'madder', 1], ['r1', 'ochre', 2], ['r2', 'olive', 3], ['rest', 'cobalt', 4]];
      const stack = { r0: 0, r1: 0, r2: 0, rest: 0 };
      for (const [key, c, beat] of layers) {
        const quads = [];
        const segs = [];
        R.forEach((v, i) => {
          const z0 = (v.r0 * (key !== 'r0') + v.r1 * (key === 'r2' || key === 'rest') + v.r2 * (key === 'rest')) * k;
          const z1 = z0 + v[key] * k;
          if (v[key] < 2e-3) return;
          const [x, y] = pos[i];
          const q = (z) => [[x - w, y - w, z], [x + w, y - w, z], [x + w, y + w, z], [x - w, y + w, z]];
          quads.push(q(z1), [[x - w, y - w, z0], [x + w, y - w, z0], [x + w, y - w, z1], [x - w, y - w, z1]], [[x + w, y - w, z0], [x + w, y + w, z0], [x + w, y + w, z1], [x + w, y - w, z1]]);
          segs.push([[x - w, y - w, z1], [x + w, y - w, z1]], [[x + w, y - w, z1], [x + w, y + w, z1]]);
          stack[key] += v[key];
        });
        X.meshes.push({ quads, c, alpha: 0.4, show: [beat], rise: beat });
        X.segs.push({ segs, c, w: 1, o: 0.8, show: [beat], rise: beat });
      }
      // the ties into the chosen sector, from its suppliers, on the page
      const ties = [];
      for (let i = 0; i < m.n; i++) if (i !== j && m.A[i][j] >= 0.02) ties.push([[...pos[i], 0.002], [...pos[j], 0.002]]);
      X.segs.push({ segs: ties, c: 'ochre', w: 1.4, o: 0.8, show: [2] });
      const name = m.names[j];
      const total = R.reduce((a, v) => a + v.total, 0);
      const first = R.filter((v) => v.i !== j).sort((a, b) => b.r1 - a.r1).slice(0, 3).map((v) => m.names[v.i]);
      const [x, y] = pos[j];
      X.tags.push({ text: `${name}: one won of final demand`, at: [x, y, k], c: 'madder', show: [1] }, { text: `in all: ${total.toFixed(2)} won`, at: [x, y, R[j].total * k], c: 'cobalt', show: [4] });
      X.dims.push({ from: [1.6, -1.6, 0], to: [1.6, -1.6, R[j].total * k], text: `output drawn, won 0 … ${R[j].total.toFixed(2)}`, ...UP });
      X.model = (b) => (b >= 5 ? { tied: ['households', 'firms'] } : null);
      X.story = [
        { say: `Korea’s 33 sectors in ${m.year}, each on a circle, with a line from a supplier to each sector that buys at least 5 percent of its output from it. Choose a sector in the margin; here it is ${name}.` },
        { say: `Add one won of final demand for ${name}. Without ties, as the firm of Figure 3.1 has none, that is all: one sector rises by one won.`, cam: { az: -0.45, el: 0.18, zoom: 0.85, at: [0, 0, 0.06] }, dur: 1.4 },
        { say: `To make it, ${name} buys from its suppliers: ${stack.r1.toFixed(2)} won in the first round, most from ${first.join(', ')}.`, dur: 1.4 },
        { say: `The suppliers buy from theirs: ${stack.r2.toFixed(2)} won more in the second round.`, dur: 1.2 },
        { say: `And so on, round after round, until one won of final demand has drawn ${total.toFixed(2)} won of output in all. This is the column of the Leontief inverse.`, dur: 1.4 },
        { say: 'On the wheel, the firms are tied to the firms they buy from. A shock to a firm that supplies many travels along the ties and does not average out (Acemoglu et al. 2012).', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
      ];
      return X;
    },
  },
  // the price of oil in won, as height: what a one-curve answer flattens;
  // then the one-curve answer and the economy of 2022, on the wheel
  '2.1': {
    dom: { x: [2020, 2025], y: [-1, 7] },
    build(data) {
      const X = blank();
      const S = Object.fromEntries((data['rates-2022']?.series ?? []).map((x) => [x.key, Object.fromEntries(x.points)]));
      const yr = (m) => Number(m.slice(0, 4)) + (Number(m.slice(5, 7)) - 1) / 12;
      const months = Object.keys(S.kr_cpi ?? {}).filter((m) => m >= '2020-01' && m <= '2024-12' && S.brent?.[m] && S.krwusd?.[m]);
      const won = (m) => S.brent[m] * S.krwusd[m];
      const base = won('2021-01');
      const k = 0.07;
      const pts = months.map((m) => [yr(m), S.kr_cpi[m], (k * won(m)) / base]);
      X.lines.push({ pts, c: 'madder', w: 2.4, show: [1], rise: 1 });
      X.segs.push({ segs: pts.filter((_, i) => i % 3 === 0).map((q) => [[q[0], q[1], 0], q]), c: 'madder', w: 0.8, o: 0.45, show: [1], rise: 1 });
      const top = pts.reduce((a2, q) => (q[2] > a2[2] ? q : a2), pts[0]);
      X.tags.push({ text: `oil in won, ${((top[2] / k) * 100).toFixed(0)} (Jan 2021 = 100)`, at: top, c: 'ochre', show: [1, 2] });
      X.dims.push({ from: [2025, -1, 0], to: [2025, -1, top[2]], text: 'Brent × won per dollar', ...UP });
      const oneCurve = { moving: new Set(['Goods', 'Equilibrium']), stopped: new Map([['Households', ''], ['Firms', '']]) };
      X.model = (b2) => [
        null,
        null,
        oneCurve,
        { lit: ['Other countries', 'Foreign exchange', 'Central banks', 'Goods'], tied: ['firms'], unlike: true, measured: 'Consumer prices <b>+6.3%</b><br><i>July 2022, a year earlier</i>' },
        { moving: oneCurve.moving, stopped: new Map([['Households', 'unlike households'], ['Firms', 'supply chains'], ['Other countries', 'oil $18 → $123'], ['Foreign exchange', '₩1,097 → ₩1,427 per $'], ['Central banks', 'base rate 0.5% → 3.5%']]) },
      ][Math.min(b2, 4)];
      X.story = [
        { say: 'Korea, 2020–2024. Consumer prices rose 6.3 percent in the year to July 2022, the fastest since 1998, and the base rate followed, from 0.5 to 3.5 percent.' },
        { say: 'Raise the inflation line by what a barrel of oil cost in won: the dollar price times the exchange rate. The path climbs to more than twice its 2021 height. The flat line on the page is its shadow, and a one-curve answer reads only the shadow.', cam: { az: -0.5, el: 0.15, zoom: 0.85, at: [2022.5, 3, 0.08] }, dur: 1.8 },
        { say: 'The usual explanation names one shift: demand recovered, so the demand curve moved out. On the wheel that answer is one market moving, the households and firms behind its curves held, and the rest left out.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
        { say: 'The economy that produced the rise moved all at once: oil from abroad, the exchange rate, the central bank, and firms tied to their suppliers.', beside: true, dur: 1.6 },
        { say: 'Back to one curve, with what it held written on the cells it held. These are the values that moved most.', beside: true, dur: 1.4 },
      ];
      return X;
    },
  },

  // the assumption each finding breaks, as height: the timeline folds into
  // the rows of Part 3's Figure 3.4; then the findings on the wheel
  '2.2': {
    dom: { x: [1872, 2012], y: [0, 1.12] },
    build() {
      const X = blank();
      const LEVEL = { A1: 1, A2: 2, A3: 3, A4: 4, A6: 5, A7: 6 };
      const NAME = { A1: 'a representative agent', A2: 'no connections', A3: 'price-taking', A4: 'full information', A6: 'consistent choice', A7: 'equilibrium at once' };
      const k = 0.03;
      for (const f of FINDINGS) {
        const h = LEVEL[f.a] * k;
        X.points.push({ at: [f.y, 0.14, h], c: f.part1 === 'none' ? 'madder' : 'chalk', size: 10, show: [1], rise: 1 });
        X.segs.push({ segs: [[[f.y, 0.14, 0], [f.y, 0.14, h]]], c: f.part1 === 'none' ? 'madder' : 'chalk', w: 1, o: 0.6, show: [1], rise: 1 });
      }
      const rows = [];
      for (const [a2, L] of Object.entries(LEVEL)) rows.push([[1880, 0.14, L * k], [2010, 0.14, L * k]]);
      X.segs.push({ segs: rows, c: 'chalk', w: 0.8, o: 0.3, dash: true, show: [1], rise: 1 });
      for (const [a2, L] of Object.entries(LEVEL)) X.tags.push({ text: `${a2} ${NAME[a2]}`, at: [2010, 0.14, L * k], c: a2 === 'A1' || a2 === 'A2' ? 'madder' : '', show: [1, 3] });
      X.dims.push({ from: [1876, 0.14, 0], to: [1876, 0.14, 6 * k], text: 'the assumption it breaks', ...UP });
      X.model = (b) => [
        null,
        null,
        { unlike: true, lit: ['Households', 'Firms'] },
        { unlike: true, lit: ['Strategy', 'Households', 'Equilibrium'] },
        { unlike: true, tied: ['households'], lit: ['Households'] },
        { alike: true, lit: ['Optimization', 'Equilibrium'] },
        { unlike: true, tied: true },
      ][Math.min(b, 6)];
      X.story = [
        { say: 'Above, the years in which the textbook’s parts were built. Below, findings about what those parts leave out. Most were known while the textbook was being written.' },
        { say: 'Raise each finding to the assumption it breaks. The rows are the rows of Part 3’s table of assumptions. Two rows hold only red marks, findings Part 1 never takes in: a representative agent, and no connections.', cam: { az: -0.45, el: 0.16, zoom: 0.85, at: [1950, 0.3, 0.1] }, dur: 1.8 },
        { say: 'Pareto (1896): incomes follow a power law. Gibrat (1931): firms grow in proportion to their size. Zipf (1949): city sizes fall with rank like a power. On the wheel, households and firms take unequal sizes.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
        { say: 'Keynes (1936), von Neumann and Morgenstern (1944), Nash (1950), Simon (1955): people reason about one another, and only so far. Scarf (1960): prices need not settle. Games and hidden quality entered the core.', beside: true, dur: 1.4 },
        { say: 'Milgram (1967) and Granovetter (1973): people reach particular others, through a few steps and weak ties. The households are tied.', beside: true, dur: 1.4 },
        { say: 'For its readers, the textbook settled on what a student can solve by hand on one page: every agent of a kind the same size, anyone trading with anyone. On the wheel, what was found goes out again.', beside: true, dur: 1.6 },
        { say: 'This part puts it back, one assumption at a time.', beside: true, dur: 1.4 },
      ];
      return X;
    },
  },

  // time, as height: one consumer's prices climb straight up the equilibrium;
  // Scarf's climb around it forever
  '2.10': {
    dom: { x: [-0.12, 1.12], y: [-0.1, 0.98] },
    build() {
      const X = blank();
      const T = 45;
      const k = 0.4 / T;
      const path = (z) => tatonnement(z, SCARF_P0, T, 0.03).map((s) => [...onSimplex(s.p), s.t * k]);
      const c = onSimplex([1, 1, 1]);
      X.lines.push({ pts: path(excessOne), c: 'cobalt', w: 2.4, show: [1], draw: 1, head: 'cobalt' });
      X.lines.push({ pts: path(excessScarf), c: 'madder', w: 2.4, show: [2], draw: 2, head: 'madder' });
      X.lines.push({ pts: [[...c, 0], [...c, T * k]], c: 'white', w: 1.2, o: 0.7, dash: true, show: [3] });
      X.tags.push(
        { text: 'one representative consumer: settles, then climbs straight up', at: [c[0], c[1], 0.12], c: 'cobalt', show: [1] },
        { text: 'three people who differ: round the equilibrium, forever', at: [...onSimplex(SCARF_P0), 0.3], c: 'madder', show: [2] },
        { text: 'the equilibrium: it exists, a fixed point, and is never reached', at: [c[0], c[1], T * k], show: [3] },
      );
      X.dims.push({ from: [1.05, -0.05, 0], to: [1.05, -0.05, T * k], text: `time 0 … ${T}`, ...UP });
      X.story = [
        { say: 'Three goods, three people, each owning one good. The triangle holds every set of relative prices; its centre is the only equilibrium. The arrows show how the classical adjustment moves the prices: up where a good is in excess demand.' },
        { say: 'Let time rise off the page. With one representative consumer the prices go to the centre and then climb straight up it: equilibrium, reached.', cam: { az: -0.4, el: 0.12, zoom: 0.9, at: [0.5, 0.3, 0.15] }, dur: 2.2 },
        { say: 'In Scarf’s economy each person wants a different pair of goods. The same adjustment carries the prices round the centre, climbing, and never closer to it.', cam: { az: -0.2, el: 0.2, zoom: 0.9, at: [0.5, 0.3, 0.2] }, dur: 2.6 },
        { say: 'The equilibrium exists in both: a fixed-point theorem from topology guarantees it. Whether it is reached depends on how unlike the people are, and Sonnenschein, Mantel and Debreu showed that adding up unlike people puts almost no shape on total demand.', cam: { az: -0.5, el: 0.3, zoom: 1, at: [0.5, 0.3, 0.2] }, dur: 1.4 },
      ];
      return X;
    },
  },

  // what economists publish, by method: the stack comes apart into rows,
  // each method a row of columns as tall as its share
  '2.11': {
    dom: { x: [1955, 2030], y: [0, 100] },
    build() {
      const X = blank();
      const k = 0.0042;
      METHODS.forEach((m, j) => {
        const cols = PUBLISHED.map((r) => ({ x0: r.y - 3, x1: r.y + 3, y0: 4 + j * 19, y1: 4 + j * 19 + 12, h: r[m.key] * k })).filter((c) => c.h > 0);
        const { mesh, segs } = columns(cols, m.c === 'chalk' ? 'white' : m.c, 0.45);
        X.meshes.push({ ...mesh, show: [1], rise: 1 });
        X.segs.push({ ...segs, show: [1], rise: 1 });
        X.tags.push({ text: m.name, at: [2016, 10 + j * 19, 0], c: m.c === 'chalk' ? '' : m.c, show: [1] });
      });
      X.tags.push({ text: 'theory: 50.7% → 19.1%', at: [1963, 10, 50.7 * k], show: [2] }, { text: 'own data 8.7% → 34.0%, experiments 0 → 8.2%', at: [2011, 67, 34 * k], c: 'ochre', show: [3] });
      X.dims.push({ from: [2026, 0, 0], to: [2026, 0, 57.6 * k], text: 'share of articles, 0 … 58%', ...UP });
      X.model = (b) => (b >= 4 ? { unlike: true, measured: 'Empirical articles <b>72%</b><br><i>top three journals, 2011</i>', lit: ['Measurement', 'Households', 'Firms'] } : null);
      X.story = [
        { say: 'Every full-length article in three top journals, one year in each decade, by method (Hamermesh 2013). On the page the methods are stacked, so only the bottom band can be followed.' },
        { say: 'Take the stack apart. Each method stands in its own row, and each column is as tall as that method’s share of the year.', cam: { az: -0.5, el: 0.18, zoom: 0.85, at: [1987, 45, 0.08] }, dur: 1.8 },
        { say: 'Theory was half of all articles in 1963 and more in 1983. By 2011 it was a fifth.', dur: 1.2 },
        { say: 'Empirical work on data the authors collected themselves rose from 9 to 34 percent, and experiments from none to 8. In 2011 nearly three articles in four were empirical, and four in five had more than one author.', dur: 1.4 },
        { say: 'On the wheel the measurement cell lights, and what it measures now is households and firms that are unlike one another.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.6 },
      ];
      return X;
    },
  },

  // the old arguments, each as a state of the wheel
  '2.12': {
    dom: { x: [0, 1], y: [0, 1] },
    callout: false,
    build() {
      const X = blank();
      const names = CELLS.map((c) => c.name);
      const stateOfArg = (A) => {
        const st = { ...A.state };
        if (st.moving) st.moving = new Set(st.moving);
        if (st.movingOf) st.moving = new Set(st.movingOf(names));
        delete st.movingOf;
        if (st.stopped) st.stopped = new Map(st.stopped);
        return st;
      };
      X.model = (b) => (b >= 1 && b <= ARGUMENTS.length ? stateOfArg(ARGUMENTS[b - 1]) : b > ARGUMENTS.length ? { tied: true, lit: ['Banks'] } : null);
      const say = {
        1883: '1883. Menger: economics deduces general laws from choice. Schmoller: it studies the history and institutions of particular economies. The tools at the hub, or the rules and history.',
        '1890, 1932': '1890 and 1932. Marshall’s economics is the study of mankind in the ordinary business of life: the whole wheel. Robbins’s is behaviour as a relationship between ends and scarce means: one tool at the hub.',
        1936: '1936. Keynes: employment is set by total spending, which can stay too low. He takes the money wage as given, and cutting it need not restore employment. The labour market is held; goods and money move.',
        1945: '1945. Hayek: knowledge is dispersed among people who differ, prices carry it, and no planner can gather it. Unlike households and firms, joined by a market.',
        1953: '1953. Friedman: a theory’s assumptions need not be realistic if its predictions are right. The classical wheel, every agent alike, judged only by measurement.',
        1976: '1976. Lucas: the rules that describe behaviour change when policy changes, so models must start from choices. Households choosing, under the central bank’s rules.',
        1992: '1992. Kirman: whom does the representative individual represent? Unlike people can add up to a total that none of them would choose.',
        2008: '2008. The benchmark model behind much central-bank analysis, Smets and Wouters (2007), had no banks, and models that added credit did not tie banks to one another.',
      };
      X.story = [
        { say: 'Eight arguments about what economics is and how it should model, each drawn on the page as a small plan of the wheel.' },
        ...ARGUMENTS.map((A, i) => ({ say: say[A.year], beside: true, dur: 1.4, ...(i === 0 ? { cam: { az: 0, el: 0, zoom: 1, at: null } } : {}) })),
        { say: 'The crisis ran through banks tied to one another. Each argument proposes a different state of the same wheel.', beside: true, dur: 1.4 },
      ];
      return X;
    },
  },

  // the projects, each lighting what it adds to the wheel
  '2.13': {
    dom: { x: [0, 1], y: [0, 1] },
    callout: false,
    build() {
      const X = blank();
      const groups = [
        { names: ['Post-Crash Economics Society', 'ISIPE open letter'], say: 'Students first. After 2008 the Post-Crash Economics Society in Manchester, and then student groups in thirty countries, asked for real problems, history, money and banking, and more than one school.' },
        { names: ['CORE, The Economy'], say: 'Teachers built CORE: each unit starts from a problem, inequality first, with data, strategic interaction and power from the first week.' },
        { names: ['Rebuilding Macroeconomic Theory'], say: 'Macroeconomists asked for four changes to the benchmark model: banks and finance, limits on rational expectations, unlike agents, and better foundations.' },
        { names: ['Opportunity Insights course', 'Causal Inference: The Mixtape'], say: 'Others start from data: an introductory course built on records of millions of people, and a textbook of research designs.' },
        { names: ['QuantEcon', 'Complexity Explorer', 'The Evolution of Trust', 'Exploring Economics'], say: 'Others make the models run as code, simulate agents in networks, let readers play the games, and set the schools side by side.' },
      ];
      const lit = (g) => [...new Set(PROJECTS.filter((pr) => g.names.includes(pr.name)).flatMap((pr) => pr.lit))];
      X.model = (b) => (b >= 1 && b <= groups.length ? { lit: lit(groups[b - 1]) } : b > groups.length ? { moving: new Set(['Goods', 'Equilibrium']), stopped: new Map([['Households', ''], ['Firms', ''], ['Labor', 'income I = 1']]) } : null);
      X.story = [
        { say: 'Ten projects that rebuild the teaching of economics, against the needs this part has found. Each mark is what a project sets out to add.' },
        ...groups.map((g, i) => ({ say: g.say, beside: true, dur: 1.4, ...(i === 0 ? { cam: { az: 0, el: 0, zoom: 1, at: null } } : {}) })),
        { say: 'Every need is met somewhere, and one is met nowhere: a common map on which any model, classical or modern, shows what it moves, what it holds still and what it leaves out. Part 3 draws that map.', beside: true, dur: 1.6 },
      ];
      return X;
    },
  },

  // the five tasks, as operations on the wheel; then the whole of Part 2's
  // change, and the step to Part 3
  '2.14': {
    dom: { x: [0, 1], y: [0, 1] },
    whole: true,
    callout: false,
    build() {
      const X = blank();
      const all = CELLS.map((c) => c.name);
      X.model = (b) => [
        null,
        { moving: new Set(all.filter((n) => n !== 'Labor')), stopped: new Map([['Labor', 'income I = 1']]) },
        { unlike: true, tied: true, lit: ['Households', 'Firms', 'Banks'] },
        { measured: MEASURED, lit: ['Measurement'] },
        { lit: ['Computation'] },
        { lit: ['History'] },
        { alike: true, unlike: false, tied: false, moving: new Set(all.filter((n) => n !== 'Networks' && n !== 'Computation')) },
        { unlike: true, tied: true },
        { moving: new Set(['Households', 'Optimization']), stopped: new Map([['Goods', 'the price of x'], ['Labor', 'income I']]) },
      ][Math.min(b, 8)];
      X.story = [
        { say: 'Five tasks recur in everything above. Each is an operation on the wheel.' },
        { say: 'Say what is held. Every model holds something still; name it and its value, as Part 1 named each figure’s hidden axis.', cam: { az: 0, el: 0, zoom: 1, at: null }, beside: true, dur: 1.4 },
        { say: 'Find the assumption that decides. A few assumptions change the answer; Rodrik calls them critical. Here: whether agents are alike, and whether they are tied.', beside: true, dur: 1.4 },
        { say: 'Measure with a design. A pattern in data is not a relationship until the design separates cause from coincidence.', beside: true, dur: 1.4 },
        { say: 'Compute when the page cannot solve. Unlike, connected agents are solved by simulation, and the simulation is part of the argument.', beside: true, dur: 1.4 },
        { say: 'Keep history. The networks, the distributions and the rules change, and a model fits a period that should be stated.', beside: true, dur: 1.4 },
        { say: 'Part 1’s wheel, as it left it: every agent of a kind alike, nobody tied to anybody, two cells empty.', beside: true, dur: 1.6 },
        { say: 'Part 2’s wheel: the same cells, every one built, its agents unlike and tied. Neither replaces the other; each is a state of one wheel.', beside: true, dur: 1.8 },
        { say: 'Part 3 writes every model this way: what it moves, what it holds and at what value, what it leaves out. Here, Figure 2.2 of Part 1.', beside: true, dur: 1.6 },
      ];
      return X;
    },
  },
};
