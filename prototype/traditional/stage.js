// The stage: an exploded assembly drawing of the curriculum, beside the page.
//
// Every graph the courses build is a card (parts.js). When a section reaches the
// reading line, its assembly is staged: the parts it is built from fly in from
// the shelf (where earlier graphs were filed), a construct shows in three
// dimensions what the flat graph cannot (a sum over people, an envelope of
// curves, a stack of equilibria whose shadow is the next curve), and the new
// graph is formed. Moving on, the new graph is filed on the shelf in its turn,
// ready to be called back by a later course.

import { PARTS, EQS, ECON, drawCard, isEq } from './parts.js';
import { COURSES } from './curriculum.js';
import { ANATOMY } from './anatomy.js';
import { lerp, clamp, smooth, ease } from './geom.js';

const W_GRAPH = 560;
const H_GRAPH = 424;
const H_EQ = 236;

// card slots, in stage coordinates (x right, y up, z toward the reader)
const SLOT = {
  main: { p: [0, 0, 0], w: 0.4, ry: 0 },
  left: { p: [-0.36, 0, 0.07], w: 0.26, ry: 0.4 },
  right: { p: [0.42, 0, 0.06], w: 0.28, ry: -0.34 },
  // sources float above and behind, so their leader lines come down into the work
  left2: { p: [-0.12, 0.34, -0.24], w: 0.22, ry: 0.16 },
  right2: { p: [0.36, 0.34, -0.24], w: 0.22, ry: -0.16 },
  over: { p: [0, 0, 0.035], w: 0.4, ry: 0 },
};
const LEAN = 0.2;

// The finale: the agents of the world economy, and the card that explains each one.
const RING = [
  ['household', 'Households', -0.43, 0.15, 'intertemporal'], ['firm', 'Firms', -0.08, 0.32, 'envelope'],
  ['market_hall', 'Goods markets', 0.27, 0.36, 'market'], ['government', 'Government', 0.62, 0.18, 'surplus'],
  ['rest_of_world', 'Rest of the world', 0.74, -0.18, 'mf'], ['central_bank', 'Central bank', 0.37, -0.38, 'eq-nk'],
  ['bank', 'Banks', 0.02, -0.4, 'money'], ['exchange', 'Financial markets', -0.33, -0.25, 'loanable'],
];
RING.forEach(([, , x, z], i) => {
  SLOT[`w${i}`] = { p: [x, 0.17, z], w: 0.15, ry: -x * 0.4 };
});
SLOT.wc1 = { p: [0.0, 0.3, -0.05], w: 0.2, ry: 0.15 };
SLOT.wc2 = { p: [0.36, 0.3, -0.05], w: 0.2, ry: -0.15 };

// Fields: which earlier parts each field course is assembled from.
const FIELD_PARTS = {
  trade: ['ppf', 'edgeworth', 'sd'],
  intlfin: ['mf', 'eq-trilemma', 'intertemporal'],
  banking: ['money', 'lm', 'eq-euler'],
  public: ['surplus', 'externality', 'eq-welfare'],
  labor: ['labor', 'supply', 'intertemporal'],
  io: ['monopoly', 'cournot', 'nfirms'],
  development: ['solow', 'loanable', 'envelope'],
  environmental: ['externality', 'eq-euler', 'surplus'],
  finance: ['intertemporal', 'eq-euler', 'loanable'],
  behavioral: ['intertemporal', 'consumer', 'eq-euler'],
  history: ['solow', 'labor', 'adas'],
};

// The assemblies, in page order. at: a selector on the page; cards: [id, slot,
// from, to] over the section's progress u; links: [from, to] leader lines.
const ASSEMBLIES = [
  { at: '#anat-opportunity', cards: [['ppf', 'main']] },
  { at: '#anat-market', cards: [['sd', 'main']] },
  { at: '#anat-elasticity', cards: [['elastic', 'main'], ['eq-elastic', 'right', 0.45]], construct: 'revenue', links: [['eq-elastic', 'elastic', 0.5]] },
  { at: '#anat-surplus', cards: [['surplus', 'main'], ['eq-surplus', 'right', 0.3]], construct: 'bars' },
  { at: '#anat-externality', cards: [['surplus', 'left'], ['externality', 'main']], links: [['surplus', 'externality']] },
  { at: '#anat-lagrange', cards: [['optim', 'main'], ['eq-lagrange', 'right', 0.3]] },
  { at: '#anat-consumer', cards: [['optim', 'left'], ['consumer', 'main']], links: [['optim', 'consumer']] },
  { at: '#anat-demand', cards: [['consumer', 'left'], ['demandI', 'main', 0.1], ['eq-slutsky', 'right', 0.5]], links: [['consumer', 'demandI', 0.15]] },
  { at: '#anat-sum', cards: [['demandI', 'left'], ['market', 'main', 0.25]], construct: 'sum', links: [['demandI', 'market', 0.3]] },
  { at: '#anat-time', cards: [['consumer', 'left'], ['intertemporal', 'main'], ['eq-euler', 'right', 0.4]], links: [['consumer', 'intertemporal']] },
  { at: '#anat-envelope', cards: [['isoquant', 'left'], ['envelope', 'main', 0.15], ['eq-envelope', 'right', 0.6]], construct: 'envelope', links: [['isoquant', 'envelope', 0.2]] },
  { at: '#anat-entry', cards: [['envelope', 'left'], ['supply', 'right'], ['longrun', 'main', 0.2]], construct: 'entry', links: [['envelope', 'longrun', 0.3], ['supply', 'longrun', 0.3]] },
  { at: '#anat-monopoly', cards: [['market', 'left'], ['monopoly', 'main'], ['eq-monopoly', 'right', 0.35]], construct: 'profit', links: [['market', 'monopoly']] },
  { at: '#anat-structure', cards: [['monopoly', 'left'], ['cournot', 'main'], ['nfirms', 'right', 0.3], ['longrun', 'right2', 0.5]], construct: 'continuum', links: [['monopoly', 'nfirms', 0.35], ['longrun', 'nfirms', 0.55]] },
  { at: '#anat-box', cards: [['consumerA', 'main', 0, 0.62], ['consumerB', 'over', 0.08, 0.62], ['edgeworth', 'main', 0.62], ['eq-welfare', 'right', 0.7]], construct: 'overlay' },
  { at: '#anat-welfare', cards: [['edgeworth', 'main'], ['eq-welfare', 'right'], ['market', 'left']], links: [['market', 'edgeworth'], ['eq-welfare', 'edgeworth']] },
  { at: '#anat-failure', cards: [['eq-welfare', 'left'], ['externality', 'main'], ['surplus', 'right']], links: [['eq-welfare', 'externality'], ['surplus', 'externality']] },
  { at: '#anat-aggregate', construct: 'city', cards: [['demandI', 'left'], ['market', 'right'], ['eq-aggregate', 'main']], links: [['demandI', 'eq-aggregate'], ['market', 'eq-aggregate']] },
  { at: '#anat-longrun', cards: [['isoquant', 'left2'], ['labor', 'left', 0.1], ['intertemporal', 'right2'], ['loanable', 'right', 0.35], ['envelope', 'main', 0, 0.1]], links: [['isoquant', 'labor', 0.15], ['isoquant', 'loanable', 0.4], ['intertemporal', 'loanable', 0.4]] },
  { at: '#anat-solow', cards: [['loanable', 'left'], ['solow', 'main']], links: [['loanable', 'solow']] },
  { at: '#anat-euler', cards: [['intertemporal', 'left'], ['eq-euler', 'main']], links: [['intertemporal', 'eq-euler']] },
  { at: '#anat-lm', cards: [['money', 'main'], ['lm', 'right', 0.4]], links: [['money', 'lm', 0.45]] },
  { at: '#anat-islm', cards: [['intertemporal', 'left2'], ['loanable', 'right2'], ['cross', 'left'], ['is', 'main', 0.45, 0.82], ['lm', 'right', 0.6], ['islm', 'main', 0.82]], construct: 'crosses', links: [['intertemporal', 'cross'], ['loanable', 'cross'], ['cross', 'is', 0.5], ['lm', 'islm', 0.85]] },
  { at: '#anat-adas', cards: [['islm', 'left'], ['labor', 'right'], ['adas', 'main', 0.55], ['eq-ad', 'right2', 0.6]], construct: 'stackP', links: [['islm', 'adas', 0.6], ['labor', 'adas', 0.6]] },
  { at: '#anat-phillips', cards: [['adas', 'left'], ['phillips', 'main']], links: [['adas', 'phillips']] },
  { at: '#anat-nk', cards: [['intertemporal', 'left'], ['monopoly', 'right'], ['eq-nk', 'main']], links: [['intertemporal', 'eq-nk'], ['monopoly', 'eq-nk']] },
  { at: '#anat-open', cards: [['islm', 'left'], ['mf', 'main'], ['eq-trilemma', 'right', 0.4]], links: [['islm', 'mf']] },
  { at: '#anat-ols', cards: [['regression', 'main'], ['eq-ols', 'right', 0.3]] },
  { at: '#anat-iv', cards: [['regression', 'left'], ['eq-iv', 'main']], links: [['regression', 'eq-iv']] },
  ...Object.entries(FIELD_PARTS).map(([id, parts]) => ({
    at: `#anat-field-${id}`, field: id, construct: 'field',
    cards: [[parts[0], 'left'], [parts[1], 'right'], [parts[2], 'left2'], [`field-${id}`, 'main', 0.15]],
    links: parts.map((p) => [p, `field-${id}`, 0.2]),
  })),
  { at: '#ch7', cards: [] },
  { at: '#anat-archive', construct: 'archive', cards: [] },
  {
    at: '#anat-world', construct: 'world',
    cards: [...RING.map((r, i) => [r[4], `w${i}`, 0.42 + i * 0.03]), ['edgeworth', 'wc1', 0.7], ['adas', 'wc2', 0.72]],
  },
];

export function createStage({ kit, sheet, plates, ctx, sheetBox }) {
  const { G, pageFrame, at, put, rod, bead, agent, label, GEO, C, MAT } = kit;

  // field cards are made from the curriculum data
  const FIELD = {};
  for (const c of COURSES.filter((x) => x.side === 'field')) {
    FIELD[`field-${c.id}`] = {
      no: c.short, title: c.name, src: 'Field course',
      html: `<span class="q">${c.question}</span><br><span class="from">Built from ${c.from}</span>${c.adds ? `<br><span class="em">Adds ${c.adds}</span>` : ''}`,
    };
  }
  const meta = (id) => PARTS[id] ?? EQS[id] ?? FIELD[id];

  // ---- assemblies on the page ----
  // each assembly plays while its anatomy block crosses the reading line
  const span = (sel) => {
    const el = sheet.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.top + scrollY, r.bottom + scrollY];
  };
  const A = ASSEMBLIES.map((a) => ({ ...a, r: span(a.at) })).filter((a) => a.r).sort((x, y) => x.r[0] - y.r[0]);
  A.forEach((a, i) => {
    a.a = a.r[0] - 280;
    a.b = Math.max(a.r[1] + (a.construct === 'world' ? 900 : 60), a.a + 500);
    if (i + 1 < A.length) a.b = Math.min(a.b, A[i + 1].r[0] - 280);
  });

  // ---- cards ----
  const cards = new Map();
  const card = (id) => {
    if (cards.has(id)) return cards.get(id);
    const m = meta(id);
    if (!m) return null;
    const eq = isEq(id) || Boolean(FIELD[id]);
    const h = eq ? H_EQ : H_GRAPH;
    const host = plates.host(W_GRAPH, h, 0, 0);
    host.classList.add('card');
    const L = { id, host, w: W_GRAPH, h, aspect: h / W_GRAPH, live: null, key: '', pose: null, first: null, used: 0 };
    if (FIELD[id]) {
      host.innerHTML = `<div class="card-head"><span class="card-no">${m.no}</span><span class="card-title">${m.title}</span><span class="card-src">${m.src}</span></div><div class="card-body eqs"><p>${m.html}</p></div>`;
    } else drawCard(host, id, undefined, ctx);
    plates.mark(L);
    cards.set(id, L);
    return L;
  };
  // cards are made when their assembly is first staged; that moment decides their place on the shelf
  const ALL = ASSEMBLIES.map((a, idx) => ({ ...a, id: a.at.replace('#anat-', ''), idx }));
  const FIRST = {};
  ALL.forEach((a) => a.cards.forEach(([id]) => { FIRST[id] ??= a.idx; }));
  const ensure = (a) => {
    for (const [id, , from = 0] of a.cards) {
      const L = card(id);
      if (L && L.first == null) L.first = a.a != null ? a.a + from * (a.b - a.a) : -Infinity;
    }
  };
  const exhibitFrame = { o: [0, 0, 0], X: [1.45, 0, 0], N: [0, 1.45, 0], D: [0, 0, 1.45] };

  const shelfOrder = () => [...cards.values()].filter((L) => L.onShelf).sort((x, y) => y.used - x.used);

  // ---- stage frame and poses ----
  // the stage stands a little behind the reading line, right of the page, at 1.45× scale
  const SCALE = 1.45;
  const stageFrame = (P) => {
    const F = pageFrame(sheetBox[2] + 640, P.focus - 220, P);
    return { o: F.o, X: F.X.map((v) => v * SCALE), N: F.N.map((v) => v * SCALE), D: F.D.map((v) => v * SCALE) };
  };
  const mk = (F, pose) => {
    const ry = pose.ry;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const ax = [F.X[0] * c - F.D[0] * s, F.X[1] * c - F.D[1] * s, F.X[2] * c - F.D[2] * s];
    const az = [F.X[0] * s + F.D[0] * c, F.X[1] * s + F.D[1] * c, F.X[2] * s + F.D[2] * c];
    const cl = Math.cos(pose.lean);
    const sl = Math.sin(pose.lean);
    let up = [F.N[0] * cl - az[0] * sl, F.N[1] * cl - az[1] * sl, F.N[2] * cl - az[2] * sl];
    const nrm = [az[0] * cl + F.N[0] * sl, az[1] * cl + F.N[1] * sl, az[2] * cl + F.N[2] * sl];
    let right = ax;
    const h = pose.w * pose.aspect;
    const base = at(F, pose.p);
    let origin = base;
    if (pose.rz) {
      // turn the card in its own plane about its centre
      const cz = Math.cos(pose.rz);
      const sz = Math.sin(pose.rz);
      const center = base.map((v, i) => v + up[i] * h * 0.5);
      const r2 = right.map((v, i) => v * cz + up[i] * sz);
      const u2 = up.map((v, i) => -right[i] * sz + v * cz);
      right = r2;
      up = u2;
      origin = center.map((v, i) => v - up[i] * h * 0.5);
    }
    return {
      m: new Float32Array([right[0] * pose.w, right[1] * pose.w, right[2] * pose.w, 0, up[0] * h, up[1] * h, up[2] * h, 0, nrm[0], nrm[1], nrm[2], 0, origin[0], origin[1], origin[2], 1]),
      center: origin.map((v, i) => v + up[i] * h * 0.5), top: origin.map((v, i) => v + up[i] * h), base: origin, right, up, h,
    };
  };
  const target = (slot, aspect) => ({ p: [...SLOT[slot].p], w: SLOT[slot].w, ry: SLOT[slot].ry, lean: LEAN, rz: 0, aspect, op: 1 });
  const shelfPose = (j, aspect) => {
    const k = Math.min(j, 11);
    return { p: [0.5 + 0.1 * k, 0.03 + 0.01 * k, -0.42 - 0.085 * k], w: 0.13, ry: -0.5, lean: 0.1, rz: 0, aspect, op: j > 11 ? 0 : 1 - 0.055 * k };
  };
  const step = (pose, tgt, dt, rate = 3.6) => {
    if (!pose) return { ...tgt };
    const k = 1 - Math.exp(-dt * rate);
    return {
      p: pose.p.map((v, i) => v + (tgt.p[i] - v) * k), w: pose.w + (tgt.w - pose.w) * k, ry: pose.ry + (tgt.ry - pose.ry) * k,
      lean: pose.lean + (tgt.lean - pose.lean) * k, rz: pose.rz + (tgt.rz - pose.rz) * k, aspect: tgt.aspect, op: pose.op + (tgt.op - pose.op) * k,
    };
  };

  // ---- lines and names ----
  const leaders = G.lines([], [0, 0, 1, 1], [0.86, 0.91, 0.96], 1.2, 0.85, true, 0, 64);
  const ink = G.lines([], [0, 0, 1, 1], [0.86, 0.91, 0.96], 1.4, 0.9, false, 0, 4000);
  const gold = G.lines([], [0, 0, 1, 1], [1.0, 0.82, 0.42], 2.4, 1, false, 0, 1200);
  const blue = G.lines([], [0, 0, 1, 1], [0.55, 0.75, 1.0], 1.8, 1, false, 0, 1200);
  const red = G.lines([], [0, 0, 1, 1], [1.0, 0.6, 0.53], 1.8, 1, false, 0, 600);
  const dash = G.lines([], [0, 0, 1, 1], [0.86, 0.91, 0.96], 1, 0.6, true, 0, 600);
  for (const o of [leaders, ink, gold, blue, red, dash]) o.glow = 0;
  const names = [];
  const name = (html) => {
    const L = label(html, 'stage');
    names.push(L);
    return L;
  };
  const cap = name('');
  cap.el.classList.add('caption');
  // names that open a course: anchors placed like any other name
  const links = [];
  const link = (html, href) => {
    const L = label(html, 'stage link');
    const a = document.createElement('a');
    a.href = href;
    a.className = L.el.className;
    a.innerHTML = html;
    L.el.replaceWith(a);
    L.el = a;
    names.push(L);
    links.push(L);
    return L;
  };

  // ======================================================================
  // constructs: what the flat graph cannot say
  // ======================================================================
  const seg = { ink: [], gold: [], blue: [], red: [], dash: [] };
  const line = (key, F, a, b) => seg[key].push([at(F, a), at(F, b)]);
  const poly = (key, F, pts) => pts.slice(1).forEach((p, i) => line(key, F, pts[i], p));
  const boxAt = (F, p, w, h, d, color, matp = MAT.matte) => put(GEO.box, kit.fm(F, p, [w, Math.max(h, 0.0005), d]), color, matp);
  const used = new Set();
  const archiveNames = {};

  const CONSTRUCT = {
    // Elasticity: the revenue rectangle P·Q stands up as a bar over its point on the demand line
    revenue(F, u) {
      const X = (q) => -0.26 + q * 0.052;
      const Z = (p) => 0.42 - p * 0.03;
      const H = (r) => r * 0.0075;
      poly('ink', F, [[X(0), 0.001, Z(10)], [X(10), 0.001, Z(0)]]);
      poly('dash', F, [[X(0), 0.001, Z(0)], [X(10.6), 0.001, Z(0)]]);
      poly('dash', F, [[X(0), 0.001, Z(0)], [X(0), 0.001, Z(10.6)]]);
      const q0 = 0.3 + 9.4 * smooth(0.05, 0.8, u);
      const arch = [];
      for (let q = 0.25; q <= q0; q += 0.25) arch.push([X(q), H(ECON.revenue(q)), Z(10 - q)]);
      if (arch.length > 1) poly('gold', F, arch);
      for (let q = 1; q < q0; q += 1) boxAt(F, [X(q), 0, Z(10 - q)], 0.01, H(ECON.revenue(q)), 0.01, C.plaster);
      boxAt(F, [X(q0), 0, Z(10 - q0)], 0.016, H(ECON.revenue(q0)), 0.016, C.ochre, MAT.bead);
      // the area P·Q on the floor
      const pq = [[X(0), 0.0015, Z(0)], [X(q0), 0.0015, Z(0)], [X(q0), 0.0015, Z(10 - q0)], [X(0), 0.0015, Z(10 - q0)], [X(0), 0.0015, Z(0)]];
      poly('gold', F, pq);
      if (q0 > 5) {
        bead(at(F, [X(5), H(25) + 0.008, Z(5)]), 0.007, C.accent);
        cap.p = at(F, [X(5), H(25) + 0.05, Z(5)]);
        cap.html = 'revenue peaks where |ε| = 1';
      } else {
        cap.p = at(F, [X(q0), H(ECON.revenue(q0)) + 0.05, Z(10 - q0)]);
        cap.html = 'the area P·Q, stood on end';
      }
      return { elastic: { q: Math.round(q0 * 4) / 4 } };
    },

    // Surplus: the curves are people. A tax splits the price and stops trades.
    bars(F, u) {
      const t = 9 * smooth(0.45, 0.9, u);
      const { n, pb, ps } = ECON.trades(t);
      const X = (i) => -0.3 + i * 0.031;
      const Hh = (v) => v * 0.0105;
      const grow = smooth(0, 0.2, u);
      for (let i = 0; i < 20; i++) {
        const traded = i < n;
        const lost = !traded && ECON.wtp(i) > ECON.cost(i);
        boxAt(F, [X(i), 0, 0.3], 0.022, Hh(ECON.wtp(i)) * grow, 0.022, traded ? C.cobalt : lost ? C.accent : C.plaster, MAT.bead);
        boxAt(F, [X(i), 0, 0.2], 0.022, Hh(ECON.cost(i)) * grow, 0.022, traded ? C.madder : lost ? C.accent : C.plaster, MAT.bead);
        if (grow > 0.9) {
          agent('person', F, [X(i), Hh(ECON.wtp(i)), 0.3], 0.012, 0, 1);
        }
      }
      const plane = (p, key) => poly(key, F, [[X(-0.5), Hh(p), 0.17], [X(19.5), Hh(p), 0.17], [X(19.5), Hh(p), 0.33], [X(-0.5), Hh(p), 0.33], [X(-0.5), Hh(p), 0.17]]);
      plane(pb, 'gold');
      if (t > 0.05) plane(ps, 'gold');
      cap.p = at(F, [X(19.5), Hh(pb) + 0.03, 0.33]);
      cap.html = t > 0.05 ? `tax ${t.toFixed(1)}: buyers pay ${pb.toFixed(1)}, sellers keep ${ps.toFixed(1)}; red trades are lost` : 'front row: buyers by willingness to pay; back row: sellers by cost';
      return { surplus: { t: Math.round(t * 2) / 2 } };
    },

    // Market demand: three households, each with a demand; add across at each price
    sum(F, u) {
      const k = smooth(0.15, 0.7, u);
      ECON.incomes.forEach((m, i) => agent('household', F, [-0.5 + i * 0.07, 0, 0.32], 0.05, 0.2, 1));
      const X = (x) => -0.3 + x * 0.025;
      const Y = (p) => p * 0.04;
      // curve i is drawn at x_i(p) plus k times the quantities of the households before it
      ECON.incomes.forEach((m, i) => {
        const pts = [];
        for (let p = 0.6; p <= 6; p += 0.2) {
          const before = ECON.incomes.slice(0, i).reduce((a, mm) => a + ECON.xi(mm, p), 0);
          pts.push([X(ECON.xi(m, p) + k * before), Y(p), 0.3]);
        }
        poly(['blue', 'ink', 'red'][i], F, pts);
      });
      if (k > 0.98) {
        const pts = [];
        for (let p = 1; p <= 6; p += 0.2) pts.push([X(ECON.incomes.reduce((a, m) => a + ECON.xi(m, p), 0)), Y(p), 0.3]);
        poly('gold', F, pts);
      }
      // stacking: at one price the three quantities are laid end to end
      const p0 = 2;
      let x0 = 0;
      ECON.incomes.forEach((m, i) => {
        const x1 = x0 + ECON.xi(m, p0);
        poly(['blue', 'ink', 'red'][i], F, [[X(lerp(0, x0, k)), Y(p0), 0.3], [X(lerp(ECON.xi(m, p0), x1, k)), Y(p0), 0.3]]);
        x0 = x1;
      });
      cap.p = at(F, [X(10), Y(2) + 0.04, 0.3]);
      cap.html = k < 0.98 ? 'at each price, lay the quantities end to end' : 'the market curve is the sum across people';
      return {};
    },

    // Cost: short-run curves on planes, one per plant size; collapse them and the envelope appears
    envelope(F, u) {
      const collapse = smooth(0.35, 0.7, u);
      const X = (q) => -0.3 + q * 0.05;
      const Y = (c) => c * 0.045;
      ECON.plants.forEach((qk, j) => {
        const z = lerp(-0.02 - j * 0.07, 0.25, collapse);
        const pts = [];
        for (let q = Math.max(0.3, qk - 3.3); q <= Math.min(12, qk + 3.3); q += 0.15) pts.push([X(q), Y(Math.min(6, ECON.sratc(q, qk))), z]);
        poly('blue', F, pts);
        poly('dash', F, [[X(0), 0, z], [X(12), 0, z]]);
        bead(at(F, [X(qk), Y(ECON.lrac(qk)), z]), 0.005, C.ochre);
        agent('firm', F, [X(qk), 0, z - 0.035], 0.03 + 0.007 * j, 0, 1 - collapse * 0.7);
      });
      if (collapse > 0.97) {
        const pts = [];
        for (let q = 0; q <= 12; q += 0.2) pts.push([X(q), Y(ECON.lrac(q)), 0.25]);
        poly('gold', F, pts);
        bead(at(F, [X(6), Y(2), 0.25]), 0.008, C.accent);
      }
      cap.p = at(F, [X(6), Y(4.6), 0.25]);
      cap.html = collapse < 0.97 ? 'one short-run curve per plant size' : 'their lower envelope is long-run cost; its minimum is where competition ends';
      return { envelope: { k: collapse > 0.97 ? 1 : 0 } };
    },

    // Entry: firms keep arriving while price is above the minimum of average cost
    entry(F, u) {
      const n = 3 + 4.33 * smooth(0.25, 0.85, u);
      const P = (60 - 2 * n) / (2 * n + 8);
      for (let i = 0; i < Math.floor(n); i++) agent('firm', F, [-0.28 + i * 0.085, 0, 0.3], 0.06, 0, 1);
      const Y = (p) => p * 0.05;
      poly('gold', F, [[-0.34, Y(P), 0.36], [0.34, Y(P), 0.36]]);
      poly('red', F, [[-0.34, Y(2), 0.36], [0.34, Y(2), 0.36]]);
      cap.p = at(F, [0.34, Y(P) + 0.03, 0.36]);
      cap.html = P > 2.03 ? `price ${P.toFixed(2)} above min LRAC = 2: profits draw entry` : 'price = min LRAC: profits gone, entry stops';
      return { longrun: { n: Math.round(n * 4) / 4 } };
    },

    // Monopoly: profit is a hill over output; its top is where MR = MC
    profit(F, u) {
      const X = (q) => -0.28 + q * 0.07;
      const H = (v) => v * 0.012;
      const pts = [];
      for (let q = 0; q <= 8; q += 0.1) pts.push([X(q), H(8 * q - q * q), 0.3]);
      poly('gold', F, pts);
      poly('dash', F, [[X(0), 0, 0.3], [X(8), 0, 0.3]]);
      const q0 = 0.5 + 3.5 * smooth(0.1, 0.75, u);
      const slope = 8 - 2 * q0;
      bead(at(F, [X(q0), H(8 * q0 - q0 * q0) + 0.006, 0.3]), 0.008, C.ochre);
      const d = 0.9;
      poly('red', F, [[X(q0 - d), H(8 * q0 - q0 * q0 - slope * d), 0.3], [X(q0 + d), H(8 * q0 - q0 * q0 + slope * d), 0.3]]);
      cap.p = at(F, [X(q0), H(8 * q0 - q0 * q0) + 0.06, 0.3]);
      cap.html = Math.abs(slope) > 0.1 ? `slope of profit = MR − MC = ${slope.toFixed(1)}` : 'flat at the top: MR = MC, Q = 4';
      return {};
    },

    // Market structure: one line from monopoly to competition
    continuum(F, u) {
      const X = (n) => -0.3 + n * 0.05;
      const Y = (p) => p * 0.03;
      const nmax = 1 + 11 * smooth(0.1, 0.85, u);
      const pts = [];
      for (let n = 1; n <= nmax; n += 0.1) pts.push([X(n), Y(ECON.cournotP(n)), 0.32]);
      if (pts.length > 1) poly('gold', F, pts);
      for (let n = 1; n <= nmax; n++) {
        boxAt(F, [X(n), 0, 0.32], 0.008, Y(ECON.cournotP(n)), 0.008, C.plaster);
        if (n <= 4) for (let k = 0; k < n; k++) agent('firm', F, [X(n) - 0.012 + (k % 2) * 0.024, 0, 0.36 + Math.floor(k / 2) * 0.03], 0.02, 0, 1);
      }
      poly('red', F, [[X(0.5), Y(2), 0.32], [X(12.5), Y(2), 0.32]]);
      cap.p = at(F, [X(Math.min(nmax, 11)), Y(ECON.cournotP(Math.min(nmax, 11))) + 0.04, 0.32]);
      cap.html = nmax < 2 ? 'one seller: the monopoly price' : nmax < 11 ? `${Math.floor(nmax)} sellers: P = ${ECON.cournotP(Math.floor(nmax)).toFixed(2)}` : 'many sellers: price falls to marginal cost';
      return {};
    },

    // General equilibrium: turn household B’s map half a turn and lay it on A’s: the box
    overlay(F, u, poseOf) {
      const k = smooth(0.15, 0.5, u);
      poseOf.consumerB = (tgt) => ({ ...tgt, rz: Math.PI * k, op: 1 - 0.38 * k, p: [lerp(0.45, 0, smooth(0.08, 0.3, u)), tgt.p[1], tgt.p[2]] });
      agent('household', F, [-0.26, 0, 0.12], 0.05, 0.4, 1);
      agent('household', F, [0.26, 0, 0.12], 0.05, -0.4, smooth(0.05, 0.2, u));
      cap.p = at(F, [0, 0.36, 0.05]);
      cap.html = k < 0.98 ? 'B’s own map, turned half a turn' : 'laid on A’s, the two maps make the box; tangencies line the contract curve';
      return {};
    },

    // IS: a Keynesian cross for each interest rate, stacked; their equilibria drop to the floor
    crosses(F, u) {
      const X = (y) => -0.32 + y * 0.03;
      const Y = (v) => v * 0.022;
      const Z = (r) => 0.42 - r * 0.07;
      const shown = smooth(0.0, 0.45, u);
      [1, 2, 3, 4].forEach((r, j) => {
        if (shown < j / 4) return;
        const z = Z(r);
        poly('ink', F, [[X(0), 0, z], [X(14), Y(14), z]]);
        poly('blue', F, [[X(0), Y(ECON.ae(0, r)), z], [X(14), Y(ECON.ae(14, r)), z]]);
        poly('dash', F, [[X(0), 0, z], [X(14), 0, z]]);
        const ys = ECON.yIS(r);
        bead(at(F, [X(ys), Y(ys), z]), 0.006, C.ochre);
        poly('dash', F, [[X(ys), Y(ys), z], [X(ys), 0.001, z]]);
      });
      if (u > 0.45) {
        const pts = [];
        for (let r = 0.6; r <= 4.4; r += 0.1) pts.push([X(ECON.yIS(r)), 0.002, Z(r)]);
        poly('gold', F, pts);
      }
      cap.p = at(F, [X(9), Y(13), Z(2)]);
      cap.html = u < 0.45 ? 'a goods market for each interest rate' : 'their equilibria, dropped to the floor (Y, r): the IS curve';
      return { cross: { r: 1 + Math.min(3, Math.floor(shown * 4)) } };
    },

    // AD: an IS–LM for each price level, stacked; output at each falls on the floor (Y, P)
    stackP(F, u) {
      const X = (y) => -0.32 + y * 0.05;
      const Y = (r) => r * 0.028;
      const Z = (P) => 0.5 - P * 0.16;
      const shown = smooth(0.0, 0.5, u);
      [1, 1.5, 2].forEach((P, j) => {
        if (shown < j / 3) return;
        const z = Z(P);
        poly('blue', F, [[X(0), Y(9), z], [X(12), Y(0), z]]);
        poly('red', F, [[X(6 / P / 0.9), 0, z], [X(12), Y(0.9 * 12 - 6 / P), z]]);
        const Ys = (9 + 6 / P) / 1.65;
        bead(at(F, [X(Ys), Y(9 - 0.75 * Ys), z]), 0.006, C.ochre);
        poly('dash', F, [[X(Ys), Y(9 - 0.75 * Ys), z], [X(Ys), 0.001, z]]);
      });
      if (u > 0.5) {
        const pts = [];
        for (let P = 0.9; P <= 2.1; P += 0.05) pts.push([X((9 + 6 / P) / 1.65), 0.002, Z(P)]);
        poly('gold', F, pts);
      }
      cap.p = at(F, [X(9), Y(9), Z(1.5)]);
      cap.html = u < 0.5 ? 'IS–LM at three price levels' : 'output at each price level, on the floor (Y, P): aggregate demand';
      return {};
    },

    // Aggregation: many households, and the city they add up to
    city(F, u) {
      const k = smooth(0.2, 0.7, u);
      for (let i = 0; i < 9; i++) agent('household', F, [-0.3 + (i % 3) * 0.07 + k * 0.1, 0, 0.22 + Math.floor(i / 3) * 0.07], 0.045 * (1 - k * 0.6), 0.3 * i, 1 - k);
      if (kit.has('city')) agent('city', F, [0.0, 0, 0.3], 0.16, 0, k);
      cap.p = at(F, [0, 0.2, 0.3]);
      cap.html = k < 0.5 ? 'many households, each with its own demand' : 'one representative household, if Gorman’s condition holds';
      return {};
    },

    // A field course: the agents and objects it studies, standing before its assembled parts
    field(F, u, poseOf, a) {
      const PROPS = {
        trade: [['rest_of_world', 0.12], ['containers', 0.08]], intlfin: [['rest_of_world', 0.12], ['central_bank', 0.07]],
        banking: [['bank', 0.08], ['coins', 0.06]], public: [['government', 0.09], ['household', 0.05]],
        labor: [['person', 0.05], ['firm', 0.07]], io: [['firm', 0.06], ['firm', 0.08]],
        development: [['farm', 0.09], ['city', 0.07]], environmental: [['power_plant', 0.08], ['farm', 0.07]],
        finance: [['exchange', 0.06], ['coins', 0.06]], behavioral: [['person', 0.05], ['market_hall', 0.08]],
        history: [['city', 0.08], ['farm', 0.07]],
      };
      const g = smooth(0.0, 0.25, u);
      (PROPS[a.field] ?? []).forEach(([asset, sc], i) => {
        if (kit.has(asset) || asset === 'person' || asset === 'firm' || asset === 'household') agent(asset, F, [-0.12 + i * 0.22, 0, 0.3], sc, -0.2 + i * 0.4, g);
      });
      return {};
    },

    // Part 3: an archive arranged by what economics studies. Agents on the ground,
    // markets between them, and the methods in layers above, classical then modern.
    archive(F, u) {
      const ga = smooth(0.0, 0.18, u);
      const gm = smooth(0.15, 0.32, u);
      const tiersShown = u < 0.33 ? 0 : u < 0.5 ? 3 : 6;
      const course = (c) => `course.html?c=${c}`;
      const AGENTS = [
        ['household', 'Households', -0.62, 0.2, 'micro'], ['firm', 'Firms', -0.28, 0.5, 'io'], ['government', 'Government', 0.18, 0.56, 'public'],
        ['rest_of_world', 'Rest of the world', 0.6, 0.32, 'trade'], ['central_bank', 'Central bank', 0.66, -0.12, 'macro'],
        ['bank', 'Banks', 0.34, -0.48, 'banking'], ['exchange', 'Financial markets', -0.12, -0.56, 'finance'], ['person', 'Workers', -0.52, -0.28, 'labor'],
      ];
      const MARKETS = [
        ['market_hall', 'Goods markets', -0.22, 0.18, 'micro'], ['person', 'Labor market', -0.3, -0.12, 'labor'],
        ['coins', 'Money', 0.22, -0.2, 'banking'], ['exchange', 'Capital markets', 0.0, -0.3, 'finance'], ['containers', 'Foreign exchange', 0.3, 0.12, 'intlfin'],
      ];
      AGENTS.forEach(([asset, nm, x, z, c], i) => {
        agent(kit.has(asset) || asset === 'person' ? asset : 'household', F, [x, 0, z], asset === 'person' ? 0.04 : 0.1, Math.atan2(-x, -z) * 0.3, ga);
        const L = archiveNames[`a${i}`] ??= link(nm, course(c));
        L.p = ga > 0.6 ? at(F, [x, asset === 'person' ? 0.07 : 0.11, z]) : null;
      });
      MARKETS.forEach(([asset, nm, x, z, c], i) => {
        if (gm > 0.02) agent(kit.has(asset) || asset === 'person' ? asset : 'household', F, [x, 0, z], asset === 'person' ? 0.03 : 0.07, 0.4 * i, gm);
        const L = archiveNames[`m${i}`] ??= link(nm, course(c));
        L.p = gm > 0.6 ? at(F, [x, 0.08, z]) : null;
        if (gm > 0.6) {
          // each market joins the agents nearest to it
          const near = AGENTS.map(([, , ax, az], j) => [Math.hypot(ax - x, az - z), j]).sort((p, q) => p[0] - q[0]).slice(0, 2);
          for (const [, j] of near) poly('blue', F, [[x, 0.01, z], [AGENTS[j][2], 0.01, AGENTS[j][3]]]);
        }
      });
      const TIERS = [
        ['Choice and optimization', 0.36, 'math', false], ['Equilibrium and welfare', 0.5, 'micro', false], ['Aggregates, time and money', 0.64, 'macro', false],
        ['Strategy and networks', 0.8, 'games', true], ['Measurement and causality', 0.94, 'metrics', true], ['Computation with many agents', 1.08, 'behavioral', true],
      ];
      TIERS.forEach(([nm, y, c, modern], i) => {
        const shown = i < tiersShown;
        const L = archiveNames[`t${i}`] ??= link(`${modern ? '<i>new</i> ' : ''}${nm}`, course(c));
        L.p = shown ? at(F, [0.82, y, 0.0]) : null;
        if (!shown) return;
        const R = 0.5 - i * 0.03;
        const pts = [];
        for (let k = 0; k <= 64; k++) pts.push([R * Math.cos((k / 64) * Math.PI * 2), y, R * Math.sin((k / 64) * Math.PI * 2)]);
        poly(modern ? 'red' : 'gold', F, pts);
        poly('dash', F, [[R, y, 0], [0.8, y, 0]]);
      });
      // three ways through the archive
      if (u > 0.66) {
        const PATHS = [
          ['gold', [[-0.62, 0.02, 0.2], [-0.22, 0.36, 0.18], [0.0, 0.64, 0.0], [-0.12, 0.94, -0.56]]],
          ['blue', [[-0.52, 0.02, -0.28], [-0.3, 0.5, -0.12], [0.0, 0.64, 0.0], [0.0, 0.94, -0.3]]],
          ['red', [[0.6, 0.02, 0.32], [0.3, 0.5, 0.12], [0.22, 0.8, -0.2], [0.34, 1.08, -0.48]]],
        ];
        const k = smooth(0.66, 0.82, u);
        for (const [col, pts] of PATHS) {
          const n = Math.max(2, Math.ceil(k * pts.length));
          poly(col, F, pts.slice(0, n));
        }
      }
      cap.p = at(F, [0, 1.2, 0]);
      cap.html = ['Agents first: who decides', 'Markets between them: where they meet', 'The classical layers: choice, equilibrium, aggregates', 'What the classical sequence leaves out: strategy, networks, data, computation', 'Three ways through: a question, an agent, a market', 'Every name opens its textbook'][Math.min(5, Math.floor(u * 6))];
      return {};
    },

    // The world: the agents of every course, joined by a real layer and a financial one
    world(F, u) {
      const g = smooth(0.0, 0.35, u);
      const ring = RING;
      ring.forEach(([asset, , x, z]) => agent(kit.has(asset) ? asset : 'household', F, [x, 0, z], 0.09, Math.atan2(-x, -z) * 0.3, g));
      // the real layer on the floor, the financial layer above
      for (let i = 0; i < ring.length; i++) {
        const [, , x0, z0] = ring[i];
        const [, , x1, z1] = ring[(i + 1) % ring.length];
        if (g > 0.6) {
          poly('blue', F, [[x0, 0.01, z0], [x1, 0.01, z1]]);
          poly('gold', F, [[x0, 0.16, z0], [x1, 0.16, z1]]);
          poly('dash', F, [[x0, 0.01, z0], [x0, 0.16, z0]]);
        }
      }
      if (kit.has('globe')) agent('globe', F, [0.17, 0, 0.04], 0.14, 0, smooth(0.35, 0.6, u));
      if (kit.has('university')) agent('university', F, [0.17, 0, -0.16], 0.16, 0, smooth(0.8, 0.95, u));
      cap.p = at(F, [0.17, 0.48, -0.02]);
      cap.html = u < 0.35 ? 'every agent the courses built' : u < 0.62 ? 'goods and labor below, money and credit above: one world economy' : u < 0.8 ? 'each agent carries the card that explains it' : 'the curriculum is the order in which these parts can be built';
      return {};
    },
  };

  // ======================================================================
  // per frame
  // ======================================================================
  const out = { cards: [], over: [leaders, ink, gold, blue, red, dash] };
  function update(P, dt, appear, ex = null) {
    for (const k in seg) seg[k].length = 0;
    used.clear();
    const focus = P.focus;
    // an exhibit stands alone at the origin; otherwise the stage follows the reading line
    const F = ex ? exhibitFrame : stageFrame(P);
    const cur = ex ? ALL.find((a) => a.id === ex.id) ?? null : A.find((a) => focus >= a.a && focus < a.b) ?? null;
    const u = ex ? ex.u : cur ? clamp((focus - cur.a) / (cur.b - cur.a), 0, 1) : 0;
    if (cur) ensure(cur);
    for (const L of links) L.p = null;

    // which cards are on stage, and where
    const onStage = new Map();
    const poseOf = {};
    let live = {};
    cap.p = null;
    if (cur && appear > 0.5) {
      if (cur.construct) live = CONSTRUCT[cur.construct](F, u, poseOf, cur) ?? {};
      for (const [id, slot, from = 0, to = 1.01] of cur.cards) if (u >= from && u < to) onStage.set(id, slot);
    }
    for (const L of cards.values()) {
      L.onShelf = !onStage.has(L.id) && L.first != null && (ex ? (FIRST[L.id] ?? 99) < (cur?.idx ?? 0) : focus > L.first);
      if (onStage.has(L.id)) L.used = performance.now();
    }
    const shelf = shelfOrder();
    out.cards.length = 0;
    for (const L of cards.values()) {
      let tgt;
      if (onStage.has(L.id)) {
        tgt = target(onStage.get(L.id), L.aspect);
        if (poseOf[L.id]) tgt = poseOf[L.id](tgt);
      } else if (L.onShelf) tgt = shelfPose(shelf.indexOf(L), L.aspect);
      else {
        // not yet made: wait below the stage floor, ready to rise
        const t0 = target('main', L.aspect);
        tgt = { ...t0, p: [t0.p[0], -0.5, t0.p[2]], op: 0 };
      }
      L.pose = step(L.pose, tgt, dt);
      // a card under the floor is not drawn
      if (L.pose.op < 0.02 || L.pose.p[1] < -0.3 || appear < 0.05) {
        if (L.card) L.card.m = null;
        continue;
      }
      const M = mk(F, L.pose);
      L.world = M;
      if (L.card) {
        L.card.m = M.m;
        L.card.opacity = L.pose.op * appear;
        out.cards.push(L.card);
      }
      // a thin plaster mount under each card on stage
      if (onStage.has(L.id)) kit.put(GEO.box, kit.fm(F, [L.pose.p[0], 0, L.pose.p[2] - 0.004], [L.pose.w * 0.6, 0.006, 0.02], L.pose.ry), C.plaster);
      // live redraws of graph cards
      const s = live[L.id];
      if (s && !isEq(L.id)) {
        const key = JSON.stringify(s);
        if (key !== L.key) {
          L.key = key;
          drawCard(L.host, L.id, s, ctx);
          plates.mark(L);
        }
      }
    }
    // leader lines between parts and what they become
    const lsegs = [];
    if (cur && appear > 0.5) {
      for (const [a, b, from = 0] of cur.links ?? []) {
        if (u < from) continue;
        const LA = cards.get(a);
        const LB = cards.get(b);
        if (!LA?.world || !LB?.world || !onStage.has(a) || !onStage.has(b)) continue;
        lsegs.push([LA.world.center, LB.world.center]);
      }
    }
    leaders.set(lsegs);
    ink.set(seg.ink);
    gold.set(seg.gold);
    blue.set(seg.blue);
    red.set(seg.red);
    dash.set(seg.dash);
    for (const o of out.over) o.opacity = appear * o.baseOpacity;
    if (cap.p && cap.el.dataset.h !== cap.html) {
      cap.el.innerHTML = cap.html;
      cap.el.dataset.h = cap.html;
    }
    return out;
  }

  function exhibitInfo(id) {
    const a = ALL.find((x) => x.id === id);
    const an = ANATOMY.find((x) => x.id === id);
    if (!a || !an) return null;
    const parts = an.parts.map((p) => meta(p)).filter(Boolean).map((m) => ({ no: m.no, title: m.title, src: m.src }));
    return { label: id.startsWith('field-') ? 'Field course, assembled' : id === 'archive' ? 'The archive' : 'Anatomy', title: an.title, steps: an.steps, parts, cam: an.cam, exitLabel: an.exitLabel };
  }

  return {
    update,
    exhibitInfo,
    labels: names,
    destroy() {
      for (const L of cards.values()) L.card?.destroy?.();
    },
  };
}
