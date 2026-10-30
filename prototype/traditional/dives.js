// Dives: guided walks into one diagram. Each step sets a camera, the layers in
// view, and the term of the equation it explains. Layers are built in data
// coordinates and converted to figure-local space (a, b, h).
//
//   meshes(p)      → { key: { dep, build(), c, alpha, freq } }   rebuilt when dep changes
//   frame(p, s)    → { key: layer | layer[] }                     rebuilt every frame
//   layer          = { type: 'lines' | 'points' | 'mesh' | 'label', … }
//   s              = { step, t (seconds into the step), mem (persists across steps) }

import {
  toLocal, surfaceVerts, quadVerts, curve, dashed, arrow, planeQuad, wallQuad, outline, smooth, lerp,
} from './geom.js';

const lines = (segs, c, w = 2, dash = false) => ({ type: 'lines', segs, c, w, dash });
const points = (pts, c, size = 10) => ({ type: 'points', pts, c, size });
const mesh = (verts, c, alpha = 1, freq = 0) => ({ type: 'mesh', verts, c, alpha, freq });
const label = (html, at, cls = 'xeq') => ({ type: 'label', html, at, cls });
const plane = (h, c = 'chalk') => [mesh(quadVerts(planeQuad(h)), c, 0.55), lines(outline(planeQuad(h)), c, 1.2)];
const wall = (h, c = 'chalk') => [mesh(quadVerts(wallQuad(h)), c, 0.28), lines(outline(wallQuad(h)), c, 1.2)];

const term = (key, html) => `<span class="term" data-term="${key}">${html}</span>`;
const cd = (x, y) => Math.sqrt(Math.max(x, 0) * Math.max(y, 0));

// ---------------------------------------------------------------- consumer

const consumer = (() => {
  const dom = { x: [0, 12], y: [0, 18] };
  const L = toLocal(dom);
  const umax = cd(12, 18);
  const H = (x, y) => (cd(x, y) / umax) * 0.55;
  const m = 16;
  const py = 1;
  const WALL = 0.32;
  const hp = (px) => (px / 4.2) * WALL;
  const EQ = `max ${term('hill', 'u(x, y)')} &nbsp;s.t.&nbsp; ${term('curtain', 'p<sub>x</sub>x + p<sub>y</sub>y = m')}` +
    `<br>${term('section', 'u(x, y) = ū')} &nbsp;&nbsp; ${term('grads', 'MRS = p<sub>x</sub> / p<sub>y</sub>')} &nbsp;&nbsp; ${term('demand', 'x* = m / 2p<sub>x</sub>')}`;
  return {
    dom,
    figure: 'Figure 3.1',
    params: { px: { sym: 'p<sub>x</sub>', label: 'Price of x', min: 1, max: 4, step: 0.01, value: 2 } },
    meshes: (p) => ({
      hill: { dep: 'static', c: 'cobalt', alpha: 1, freq: 0.5, build: () => surfaceVerts({ param: (x, y) => [x, y, H(x, y)], u: [0, 12], v: [0, 18], contour: (x, y) => cd(x, y) }, L) },
      curtain: {
        dep: p.px.toFixed(3), c: 'madder', alpha: 0.7, freq: 1,
        build: () => surfaceVerts({ param: (u, v) => [u, (m - p.px * u) / py, v * H(u, (m - p.px * u) / py)], u: [Math.max(0, (m - 18 * py) / p.px), Math.min(12, m / p.px)], v: [0, 1], contour: (u, v) => v * 4 }, L, 40),
      },
    }),
    frame(p, s) {
      const px = p.px;
      const xo = m / (2 * px);
      const yo = m / (2 * py);
      const ho = H(xo, yo);
      const out = {};
      out.hill = [16, 32, 56].map((u2) => lines(curve(L, (x) => [x, u2 / x, H(x, u2 / x)], Math.max(0.8, u2 / 18), 12), 'cobalt', 2));
      // the slice: a plane at the height of ū² = 32, lowered onto the page
      const k = s.step === 2 ? smooth(1.4, 4.2, s.t % 7) : 0;
      const hs = H(4, 8) * (1 - k);
      out.section = [...plane(hs), lines(curve(L, (x) => [x, 32 / x, hs], 32 / 18, 12), 'ochre', 3.4),
        label(k > 0.97 ? 'the slice lands on the drawn curve' : 'every point on this cut has utility ū', L([10.5, 32 / 10.5, hs + 0.05]), 'tag ochre')];
      out.curtain = lines(curve(L, (u) => [u, (m - px * u) / py, H(u, (m - px * u) / py)], Math.max(0, (m - 18 * py) / px), Math.min(12, m / px)), 'madder', 3);
      out.opt = [points([[...L([xo, yo, ho]), 1.5]], 'ochre', 12), lines(dashed(L([xo, yo, 0]), L([xo, yo, ho])), 'ochre', 1.4)];
      const g = [0.894, 0.447];
      const gn = Math.hypot(px, py);
      out.grads = [
        lines(arrow(L([xo, yo, ho]), L([xo + 3 * g[0], yo + 3 * g[1], ho])), 'olive', 2.4),
        lines(arrow(L([xo, yo, ho + 0.004]), L([xo + (2 * px) / gn, yo + (2 * py) / gn, ho + 0.004])), 'madder', 2.4),
        label('∇u', L([xo + 3.3 * g[0], yo + 3.3 * g[1], ho]), 'xeq'),
        label('λ∇g', L([xo + (2 * px) / gn, yo + (2 * py) / gn - 1.2, ho]), 'xeq'),
      ];
      // the demand wall: every optimum leaves a mark at height pₓ
      const tr = (s.mem.trace ??= new Map());
      tr.set(Math.round(px * 50) / 50, xo);
      const marks = [...tr.entries()].sort((a, b) => a[0] - b[0]).map(([q, x]) => [x / 12, 0, hp(q)]);
      out.demand = [
        ...wall(WALL),
        lines(curve((v) => v, (q) => [m / (2 * q) / 12, 0, hp(q)], 1, 4), 'cobalt', 1.2, true),
        lines(marks.length > 1 ? marks.slice(1).map((q, i) => [marks[i], q]) : [], 'cobalt', 3.4),
        points([[xo / 12, 0, hp(px), 1.4]], 'ochre', 12),
        lines(dashed([xo / 12, yo / 18, ho], [xo / 12, 0, hp(px)], 18), 'ochre', 1.2),
        label('p<sub>x</sub>', [-0.03, 0, WALL], 'xeq left'),
        label(`x*(p<sub>x</sub>) = m / 2p<sub>x</sub> = ${xo.toFixed(2)}`, [0.62, 0, WALL + 0.04], 'xeq'),
      ];
      return out;
    },
    steps: [
      { title: 'What the textbook shows', cam: 'top', show: [],
        text: 'Seen from directly above, consumer choice is a budget line and a family of curves. Everything on the page is flat, because the page has two axes and the problem has three numbers: x, y, and how much the consumer likes the pair.' },
      { title: 'Every bundle has a height', cam: 'three', show: ['hill'], focus: 'hill',
        text: 'Utility gives each bundle (x, y) a number. Draw that number as height and the page grows a hill, here u(x, y) = √(xy). The blue curves on the page were drawn on this hill all along; they only look flat from above.' },
      { title: 'An indifference curve is a slice', cam: { az: -24, el: 20, zoom: 1.2, lift: 0.1 }, show: ['hill', 'section'], focus: 'section',
        text: 'Cut the hill with a horizontal plane. Every point on the cut has the same utility ū. Lower the plane to the page and the cut lands exactly on the indifference curve in the textbook. The diagram is a cross-section.' },
      { title: 'The budget is a wall', cam: { face: [0, 16, 8, 0], el: 10, zoom: 1.2, lift: 0.14 }, show: ['hill', 'curtain', 'opt'], focus: 'curtain',
        text: 'The budget constraint does not depend on utility, so in three dimensions it is a vertical wall. Face the wall and the consumer’s problem has a single dimension: walk along its top edge, where it meets the hill, and find the highest point.' },
      { title: 'At the top, the slopes match', cam: { az: -14, el: 52, zoom: 1.1, lift: 0.08 }, show: ['hill', 'curtain', 'opt', 'grads'], focus: 'grads',
        text: 'At the highest point of the ridge, the hill’s contour runs parallel to the wall. The gradient of utility and the gradient of the budget point the same way: the marginal rate of substitution equals the price ratio.' },
      { title: 'Change a price and demand appears', cam: { az: -18, el: 14, zoom: 1.28, lift: 0.16, pb: -0.08 }, show: ['hill', 'curtain', 'opt', 'demand'], focus: 'demand', slider: 'px', sweep: true,
        text: 'Move pₓ. The wall pivots, the optimum slides, and each new optimum leaves a mark on the front wall at the height of its price. The marks trace x*(pₓ) = m / 2pₓ: the demand curve that principles took as given.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- supply and demand

const sd = (() => {
  const dom = { x: [0, 12], y: [0, 12] };
  const L = toLocal(dom);
  const lift = (I) => (I - 1) * 0.9;
  const Pstar = (I) => (10 * I + 1) / 2;
  const EQ = `${term('surface', 'Q<sub>d</sub> = D(P, I) = 10I − P')} &nbsp;&nbsp; ${term('supply', 'Q<sub>s</sub> = P − 1')}` +
    `<br>${term('slice', 'I fixed ⇒ one curve')} &nbsp;&nbsp; ${term('path', '∂P*/∂I = D<sub>I</sub> / (S<sub>P</sub> − D<sub>P</sub>)')}`;
  return {
    dom,
    figure: 'Figure 1.3',
    params: { I: { sym: 'I', label: 'Income', min: 1, max: 1.5, step: 0.005, value: 1.25 } },
    meshes: () => ({
      surface: { dep: 'static', c: 'cobalt', alpha: 1, freq: 1, build: () => surfaceVerts({ param: (u, v) => [10 * v - u, u, lift(v)], u: (v) => [Math.max(0, 10 * v - 12), 10 * v], v: [1, 1.5], contour: (u, v) => v * 10 }, L) },
      supply: { dep: 'static', c: 'madder', alpha: 0.6, freq: 1, build: () => surfaceVerts({ param: (u, v) => [u - 1, u, v * 0.45], u: [1, 12], v: [0, 1], contour: (u) => u }, L, 30) },
    }),
    frame(p) {
      const I = p.I;
      const h = lift(I);
      const P = Pstar(I);
      return {
        slice: [...plane(h), lines(curve(L, (P2) => [10 * I - P2, P2, h], Math.max(0, 10 * I - 12), 10 * I), 'cobalt', 3.4),
          lines(curve(L, (P2) => [10 * I - P2, P2, 0], Math.max(0, 10 * I - 12), 10 * I), 'cobalt', 2, true),
          label(`D(P, I = ${I.toFixed(2)})`, L([10 * I - 10.6, 10.6, h + 0.03]), 'tag cobalt'),
          label('its shadow on the page: a “shifted” demand curve', L([10 * I - 1.2, 1.2, 0.02]), 'tag cobalt')],
        path: [lines(curve(L, (J) => [Pstar(J) - 1, Pstar(J), lift(J)], 1, 1.5), 'ochre', 3.2),
          label('slope ∂P*/∂I = 10 / (1 + 1) = 5', L([Pstar(1.5) - 1, Pstar(1.5) + 0.6, lift(1.5)]), 'xeq')],
        eqp: [points([[...L([P - 1, P, h]), 1.4]], 'ochre', 12), lines(dashed(L([P - 1, P, 0]), L([P - 1, P, h])), 'ochre', 1.2)],
      };
    },
    steps: [
      { title: 'What the textbook shows', cam: 'top', show: [],
        text: 'A demand curve and a supply curve, drawn for one fixed level of income. When income rises, the text says the demand curve “shifts”.' },
      { title: 'Income is the hidden axis', cam: 'three', show: ['surface', 'supply'], focus: 'surface',
        text: 'Demand depends on price and on income. With income as a third axis, demand is a surface: D(P, I). Supply does not depend on income, so it stands as a vertical sheet.' },
      { title: 'A shift is a different slice', cam: { az: -30, el: 24, zoom: 1.2, lift: 0.14 }, show: ['surface', 'supply', 'slice', 'eqp'], focus: 'slice', slider: 'I', sweep: true,
        text: 'Each income level cuts one demand curve out of the surface. Raise income and the slice rises; its shadow on the page is the shifted curve D′. Nothing moves; we only look at a different cross-section.' },
      { title: 'The equilibria form a path', cam: { az: 82, el: 8, zoom: 1.2, lift: 0.2 }, show: ['surface', 'supply', 'path', 'eqp'], focus: 'path', slider: 'I',
        text: 'Turn to look along the quantity axis. The equilibrium for every income level lies on one path. Its slope is the comparative-static derivative ∂P*/∂I, which the implicit function theorem gives as D<sub>I</sub> / (S<sub>P</sub> − D<sub>P</sub>).' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- constrained optimization

const optim = (() => {
  const dom = { x: [0, 10], y: [0, 10] };
  const L = toLocal(dom);
  const f = (x, y) => 10 - (x - 7) ** 2 / 6 - (y - 6) ** 2 / 10;
  const H = (x, y) => (Math.max(0, f(x, y) - 2) / 8) * 0.55;
  const opt = (c) => {
    const x = (17 + 3 * c) / 8;
    const y = c - x;
    return { x, y, f: f(x, y), lam: (7 - x) / 3 };
  };
  const WALL = 0.4;
  const hv = (v) => ((v - 4) / 6) * WALL;
  const av = (c) => (c - 5) / 6;
  const EQ = `max ${term('hill', 'f(x, y)')} &nbsp;s.t.&nbsp; ${term('curtain', 'x + y = c')}` +
    `<br>${term('grads', '∇f = λ∇g')} &nbsp;&nbsp; ${term('value', 'df*/dc = λ')}`;
  return {
    dom,
    figure: 'Figure 2.1',
    params: { c: { sym: 'c', label: 'Constraint level', min: 5, max: 11, step: 0.01, value: 8 } },
    meshes: (p) => ({
      hill: { dep: 'static', c: 'olive', alpha: 1, freq: 1, build: () => surfaceVerts({ param: (x, y) => [x, y, H(x, y)], u: [0, 10], v: [0, 10], contour: f }, L) },
      curtain: {
        dep: p.c.toFixed(3), c: 'madder', alpha: 0.7, freq: 1,
        build: () => surfaceVerts({ param: (u, v) => [u, p.c - u, v * H(u, p.c - u)], u: [Math.max(0, p.c - 10), Math.min(10, p.c)], v: [0, 1], contour: (u, v) => v * 4 }, L, 40),
      },
    }),
    frame(p, s) {
      const o = opt(p.c);
      const ho = H(o.x, o.y);
      const r = 10 - o.f;
      const ell = curve(L, (t) => [7 + Math.sqrt(6 * r) * Math.cos(t), 6 + Math.sqrt(10 * r) * Math.sin(t), ho], 0, Math.PI * 2, 160)
        .filter(([a, b]) => a.every((v, i) => i === 2 || (v >= 0 && v <= 1)) && b.every((v, i) => i === 2 || (v >= 0 && v <= 1)));
      const k = s.step === 2 ? smooth(1.4, 4, s.t % 7) : 0;
      const ellDown = ell.map((sg) => sg.map(([a, b]) => [a, b, ho * (1 - k)]));
      const g = [(7 - o.x) / 3, (6 - o.y) / 5];
      const gl = Math.hypot(...g) || 1;
      const lo = Math.max(0, p.c - 10);
      const hi = Math.min(10, p.c);
      return {
        section: [...plane(ho * (1 - k)), lines(ellDown, 'ochre', 3.4),
          label('the contour through the optimum', L([o.x + 2.6, o.y + 3.2, ho * (1 - k) + 0.03]), 'tag ochre')],
        curtain: lines(curve(L, (u) => [u, p.c - u, H(u, p.c - u)], lo, hi), 'madder', 3),
        opt: [points([[...L([o.x, o.y, ho]), 1.5]], 'ochre', 12), lines(dashed(L([o.x, o.y, 0]), L([o.x, o.y, ho])), 'ochre', 1.4)],
        grads: [
          lines(arrow(L([o.x, o.y, ho]), L([o.x + (2.4 * g[0]) / gl, o.y + (2.4 * g[1]) / gl, ho])), 'olive', 2.4),
          lines(arrow(L([o.x, o.y, ho + 0.004]), L([o.x + 1.2, o.y + 1.2, ho + 0.004])), 'madder', 2.4),
          label('∇f', L([o.x + (2.7 * g[0]) / gl, o.y + (2.7 * g[1]) / gl, ho]), 'xeq'),
          label('λ∇g', L([o.x + 1.5, o.y + 0.8, ho]), 'xeq'),
        ],
        value: [
          ...wall(WALL),
          lines(curve((v) => v, (c) => [av(c), 0, hv(opt(c).f)], 5, 11), 'olive', 3),
          lines([[[av(p.c - 0.9), 0, hv(o.f - 0.9 * o.lam)], [av(p.c + 0.9), 0, hv(o.f + 0.9 * o.lam)]]], 'ochre', 2.2),
          points([[av(p.c), 0, hv(o.f), 1.4]], 'ochre', 12),
          label(`f*(c), slope λ = ${o.lam.toFixed(2)}`, [Math.min(0.75, av(p.c) + 0.05), 0, hv(o.f) + 0.05], 'xeq'),
          label('c', [1.02, 0, 0.0], 'xeq'),
        ],
      };
    },
    steps: [
      { title: 'A problem seen from above', cam: 'top', show: [],
        text: 'Contour lines of an objective f and a straight constraint. The textbook tells you to find where a contour touches the line. Why that works is easier to see from the side.' },
      { title: 'The contours are height lines', cam: 'three', show: ['hill'], focus: 'hill',
        text: 'Draw f as height. The ellipses on the page are the lines along which the hill has constant height, like contours on a map. The unconstrained maximum is the summit.' },
      { title: 'The tangent contour is a slice', cam: { az: -24, el: 20, zoom: 1.2, lift: 0.1 }, show: ['hill', 'section', 'opt'], focus: 'section',
        text: 'Cut the hill at the height of the constrained optimum. The cut is the single contour that touches the constraint; lowered to the page, it is the one drawn in bold.' },
      { title: 'The constraint is a wall', cam: { face: [0, 8, 8, 0], el: 10, zoom: 1.2, lift: 0.12 }, show: ['hill', 'curtain', 'opt'], focus: 'curtain',
        text: 'g(x, y) = c does not involve height, so it is a vertical wall. Face the wall and the problem is one-dimensional: find the highest point of the ridge where wall meets hill.' },
      { title: 'At the top, the gradients align', cam: { az: -10, el: 55, zoom: 1.1 }, show: ['hill', 'curtain', 'opt', 'grads'], focus: 'grads',
        text: 'At the top of the ridge, moving along the wall gains nothing. So the hill’s steepest direction ∇f must point straight out of the wall, parallel to the wall’s own normal ∇g. The proportion between them is λ.' },
      { title: 'The multiplier is a price', cam: { az: -16, el: 13, zoom: 1.3, lift: 0.16, pb: -0.08 }, show: ['hill', 'curtain', 'opt', 'value'], focus: 'value', slider: 'c', sweep: true,
        text: 'Push the constraint outward. The best attainable value f*(c) rises along the curve on the front wall, and its slope is exactly λ. The multiplier measures what one more unit of the constraint is worth: a shadow price.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- short-run cost

const cost = (() => {
  const dom = { x: [0, 12], y: [0, 6] };
  const L = toLocal(dom);
  const lift = (K) => ((K - 4) / 6) * 0.5;
  const atc = (q, K) => K / q + q / K;
  const qr = (K) => [0.172 * K, Math.min(12, 5.83 * K)];
  const EQ = `${term('surface', 'ATC(q; K) = rK/q + wq/K')} &nbsp;&nbsp; ${term('slice', 'K fixed ⇒ one curve')}<br>${term('envelope', 'LRAC(q) = min<sub>K</sub> ATC(q; K)')}`;
  return {
    dom,
    figure: 'Figure 3.2',
    params: { K: { sym: 'K', label: 'Plant size', min: 4, max: 10, step: 0.01, value: 6 } },
    meshes: () => ({
      surface: { dep: 'static', c: 'cobalt', alpha: 1, freq: 1, build: () => surfaceVerts({ param: (u, K) => [u, atc(u, K), lift(K)], u: qr, v: [4, 10], contour: (u, K) => K }, L) },
    }),
    frame(p) {
      const K = p.K;
      const h = lift(K);
      const fam = [];
      for (let k2 = 4; k2 <= 10; k2 += 1) fam.push(lines(curve(L, (q) => [q, atc(q, k2), lift(k2)], ...qr(k2)), 'cobalt', 1.6));
      return {
        slice: [...plane(h), lines(curve(L, (q) => [q, atc(q, K), h], ...qr(K)), 'cobalt', 3.6),
          lines(curve(L, (q) => [q, atc(q, K), 0], ...qr(K)), 'cobalt', 1.8, true),
          points([[...L([K, 2, h]), 1.3]], 'ochre', 11),
          label(`ATC for K = ${K.toFixed(1)}`, L([Math.min(11, K * 1.7), atc(Math.min(11, K * 1.7), K) + 0.3, h + 0.02]), 'tag cobalt')],
        family: fam,
        envelope: [lines(curve(L, (k2) => [k2, 2, lift(k2)], 4, 10), 'ochre', 3.4), lines(curve(L, (k2) => [k2, 2, 0], 4, 10), 'ochre', 2.4, true),
          label('LRAC: the floor of every slice', L([10, 1.6, 0.02]), 'tag ochre')],
      };
    },
    steps: [
      { title: 'One plant, one curve', cam: 'top', show: [],
        text: 'Short-run cost curves are drawn for one fixed amount of capital, here K = 4. Marginal cost cuts average total cost at its lowest point.' },
      { title: 'Plant size is the hidden axis', cam: 'three', show: ['surface'], focus: 'surface',
        text: 'Let capital vary and average cost becomes a surface over output and plant size. The curve in the textbook is the edge of this surface nearest the page.' },
      { title: 'Each plant size is a slice', cam: { az: -28, el: 24, zoom: 1.2, lift: 0.14 }, show: ['surface', 'slice'], focus: 'slice', slider: 'K', sweep: true,
        text: 'Fix K and cut. Each slice is one short-run average cost curve with its own minimum. Bigger plants are cheapest at bigger outputs.' },
      { title: 'Look straight down the K axis', cam: 'top', show: ['family', 'envelope'], focus: 'envelope',
        text: 'From above, the slices overlap and their lower boundary appears: the long-run average cost curve. This is the envelope diagram in every intermediate text, and it is a view of the surface from one particular direction.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- monopoly

const monopoly = (() => {
  const dom = { x: [0, 12], y: [0, 12] };
  const L = toLocal(dom);
  const hp = (v) => (v / 25) * 0.42;
  const EQ = `${term('profit', 'π(q) = p(q)q − C(q)')} &nbsp;&nbsp; ${term('peak', 'π′(q) = MR − MC = 0')}`;
  return {
    dom,
    figure: 'Figure 3.3',
    params: { c: { sym: 'MC', label: 'Marginal cost', min: 0, max: 6, step: 0.01, value: 2 } },
    meshes: (p) => ({
      fill: {
        dep: p.c.toFixed(3), c: 'ochre', alpha: 0.6, freq: 1,
        build: () => surfaceVerts({ param: (q, v) => [q, 0, v * hp((10 - p.c) * q - q * q)], u: [0, 10 - p.c], v: [0, 1], contour: (q, v) => v * 4 }, L, 40),
      },
    }),
    frame(p) {
      const c = p.c;
      const qm = (10 - c) / 2;
      const pm = qm * qm;
      return {
        profit: [lines(curve(L, (q) => [q, 0, hp((10 - c) * q - q * q)], 0, 10 - c), 'ochre', 3.4),
          lines(curve(L, (q) => [q, c, 0], 0, 12), 'madder', 2.4, true),
          label(`π(q), max ${pm.toFixed(1)}`, L([qm + 0.4, 0, hp(pm) + 0.04]), 'xeq')],
        peak: [points([[...L([qm, 0, hp(pm)]), 1.5]], 'ochre', 12),
          lines([...dashed(L([qm, c, 0]), L([qm, 0, 0]), 10), ...dashed(L([qm, 0, 0]), L([qm, 0, hp(pm)]), 10)], 'ochre', 1.4),
          points([[...L([qm, c, 0]), 1.1]], 'madder', 10),
          label('MR = MC', L([qm + 0.3, c + 0.6, 0.01]), 'tag madder')],
      };
    },
    steps: [
      { title: 'The monopolist’s diagram', cam: 'top', show: [],
        text: 'Demand, marginal revenue, marginal cost. The rule is to produce where marginal revenue equals marginal cost. The diagram does not show the thing being maximized.' },
      { title: 'Stand profit up', cam: 'three', show: ['profit', 'fill'], focus: 'profit',
        text: 'Profit depends only on quantity, so it can stand on the quantity axis as a curve in a vertical plane: π(q) = p(q)q − C(q).' },
      { title: 'Face it', cam: { az: 0, el: 4, zoom: 1.2, lift: 0.18, pb: -0.1 }, show: ['profit', 'fill', 'peak'], focus: 'peak',
        text: 'Seen from the front, the third axis becomes the vertical. The hump peaks exactly above the crossing of MR and MC, because MR − MC is the slope of the hump. The rule is the first-order condition.' },
      { title: 'Move marginal cost', cam: { az: -22, el: 16, zoom: 1.25, lift: 0.14 }, show: ['profit', 'fill', 'peak'], focus: 'peak', slider: 'c', sweep: true,
        text: 'Raise marginal cost. The hump shrinks and its peak slides left, and on the page the crossing of MR and MC slides with it.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- Solow

const solow = (() => {
  const dom = { x: [0, 12], y: [0, 2.6] };
  const L = toLocal(dom);
  const f = (k) => Math.pow(k, 0.35);
  const T = 60;
  const ht = (t) => (t / T) * 0.55;
  const kstar = (s) => Math.pow(s / 0.08, 1 / 0.65);
  const path = (k0, s) => {
    const pts = [];
    let k = k0;
    for (let t = 0; t <= T; t += 0.5) {
      pts.push([k, s * f(k), ht(t)]);
      for (let j = 0; j < 5; j++) k += 0.1 * (s * f(k) - 0.08 * k);
    }
    return pts;
  };
  const EQ = `${term('paths', 'k̇ = s f(k) − (n + δ)k')} &nbsp;&nbsp; ${term('steady', 's f(k*) = (n + δ)k*')}`;
  return {
    dom,
    figure: 'Figure 4.1',
    params: { s: { sym: 's', label: 'Saving rate', min: 0.15, max: 0.45, step: 0.001, value: 0.3 } },
    meshes: () => ({}),
    frame(p, st) {
      const s = p.s;
      const ks = kstar(s);
      const grow = st.step === 1 ? smooth(0.2, 2.6, st.t) : 1;
      const out = {};
      out.paths = [0.6, 2, 4, 11.5].map((k0) => {
        const pts = path(k0, s).filter((q) => q[2] <= 0.55 * grow + 1e-6).map(L);
        return lines(pts.slice(1).map((q, i) => [pts[i], q]), 'cobalt', 2.6);
      });
      out.paths.push(lines(curve(L, (k) => [k, s * f(k), 0], 0.05, 12), 'ochre', 2, true));
      out.steady = [lines([[L([ks, 0.08 * ks, 0]), L([ks, 0.08 * ks, 0.55])]], 'ochre', 3),
        label(`k* = ${ks.toFixed(2)}`, L([ks + 0.2, 0.08 * ks, 0.58]), 'xeq')];
      out.time = [lines([[L([0, 0, 0]), L([0, 0, 0.58])]], 'chalk', 1.4), label('t', L([0, 0, 0.6]), 'xeq')];
      return out;
    },
    steps: [
      { title: 'The diagram without time', cam: 'top', show: [],
        text: 'Saving per worker against the break-even line. Where saving is higher, capital per worker grows; the arrows on the page are the only hint that anything happens over time.' },
      { title: 'Stand time up', cam: 'three', show: ['paths', 'time'], focus: 'paths',
        text: 'Make time the third axis. Each starting stock of capital k₀ now traces a path that rises off the page and leans toward the same point.' },
      { title: 'Face the paths', cam: { az: 0, el: 3, zoom: 1.2, lift: 0.2, pb: -0.1 }, show: ['paths', 'steady', 'time'], focus: 'steady',
        text: 'Turn the diagram to face you. Now the vertical axis is time and each path is k(t). Whatever the start, every path bends toward the steady state k*, faster when it is far away.' },
      { title: 'Raise the saving rate', cam: { az: -22, el: 18, zoom: 1.25, lift: 0.18 }, show: ['paths', 'steady', 'time'], focus: 'steady', slider: 's', sweep: true,
        text: 'Change s. The saving curve on the page moves, k* moves with it, and every path re-aims. Saving raises the level of capital per worker, not its long-run growth rate.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- IS–LM → AD

const islm = (() => {
  const dom = { x: [0, 12], y: [0, 10] };
  const L = toLocal(dom);
  const lift = (P) => (P - 1) * 0.45;
  const Yad = (P) => (9 + 6 / P) / 1.65;
  const EQ = `${term('lm', 'LM: M/P = L(r, Y)')} &nbsp;&nbsp; ${term('is', 'IS: Y = C(Y − T) + I(r) + G')}<br>${term('ad', 'AD: Y = Y(P)')}`;
  return {
    dom,
    figure: 'Figure 4.2',
    params: { P: { sym: 'P', label: 'Price level', min: 1, max: 2, step: 0.002, value: 1.5 } },
    meshes: () => ({
      lm: { dep: 'static', c: 'madder', alpha: 1, freq: 0.5, build: () => surfaceVerts({ param: (Y, P) => [Y, 0.9 * Y - 6 / P, lift(P)], u: (P) => [Math.max(0, (6 / P) / 0.9), 12], v: [1, 2], contour: (Y, P) => P * 10 }, L) },
      is: { dep: 'static', c: 'cobalt', alpha: 0.6, freq: 1, build: () => surfaceVerts({ param: (Y, v) => [Y, 9 - 0.75 * Y, v * 0.45], u: [0, 12], v: [0, 1], contour: (Y, v) => v * 4 }, L, 30) },
    }),
    frame(p) {
      const P = p.P;
      const h = lift(P);
      const Y = Yad(P);
      const r = 9 - 0.75 * Y;
      return {
        slice: [...plane(h), lines(curve(L, (y) => [y, 0.9 * y - 6 / P, h], Math.max(0, (6 / P) / 0.9), 12), 'madder', 3.4),
          label(`LM at P = ${P.toFixed(2)}`, L([11.2, 0.9 * 11.2 - 6 / P, h + 0.03]), 'tag madder')],
        cross: [points([[...L([Y, r, h]), 1.4]], 'ochre', 12)],
        ad: [...wall(0.47), lines(curve(L, (P2) => [Yad(P2), 0, lift(P2)], 1, 2), 'ochre', 3.4),
          lines(dashed(L([Y, r, h]), L([Y, 0, h]), 16), 'ochre', 1.4), points([[...L([Y, 0, h]), 1.2]], 'ochre', 11),
          lines(curve(L, (P2) => [Yad(P2), 9 - 0.75 * Yad(P2), lift(P2)], 1, 2), 'ochre', 2.2),
          label('AD', L([Yad(2) - 0.3, 0, 0.5]), 'xeq'), label('P', [-0.03, 0, 0.45], 'xeq left')],
      };
    },
    steps: [
      { title: 'One price level', cam: 'top', show: [],
        text: 'IS and LM cross at the output and interest rate that clear the goods and money markets, for a price level the diagram holds fixed.' },
      { title: 'The price level is the hidden axis', cam: 'three', show: ['lm', 'is'], focus: 'lm',
        text: 'LM depends on real money balances M/P, so as P varies it sweeps out a surface. IS does not involve P, so across all price levels it stands as a wall.' },
      { title: 'Each price level is a slice', cam: { az: -28, el: 24, zoom: 1.2, lift: 0.14 }, show: ['lm', 'is', 'slice', 'cross'], focus: 'slice', slider: 'P', sweep: true,
        text: 'Fix P and cut: one LM curve, one crossing with IS. A higher price level shrinks real balances, lifts LM, and moves the crossing to lower output.' },
      { title: 'Face the front wall', cam: { az: 0, el: 6, zoom: 0.92, lift: 0.22, pa: 0.17, pb: -0.12 }, show: ['lm', 'is', 'cross', 'ad'], focus: 'ad', slider: 'P', sweep: true,
        text: 'Project every crossing onto the front wall, where the axes are output and the price level. The projections line up into a downward-sloping curve: aggregate demand, derived rather than assumed.' },
    ],
    eq: EQ,
  };
})();

// ---------------------------------------------------------------- regression

const regression = (() => {
  const dom = { x: [0, 10], y: [0, 14] };
  const L = toLocal(dom);
  const hx = (x2) => (x2 / 8) * 0.45;
  const EQ = `${term('plane', 'y = β<sub>0</sub> + β<sub>1</sub>x<sub>1</sub> + β<sub>2</sub>x<sub>2</sub> + ε')} &nbsp;&nbsp; ${term('bias', 'b<sub>1</sub> → β<sub>1</sub> + β<sub>2</sub>δ')}`;
  return {
    dom,
    figure: 'Figure 5.1',
    params: {},
    meshes: () => ({
      plane: { dep: 'static', c: 'olive', alpha: 0.9, freq: 1, build: () => surfaceVerts({ param: (x1, x2) => [x1, 1 + 0.5 * x1 + 0.8 * x2, hx(x2)], u: [0, 10], v: [0, 8], contour: (x1, x2) => x2 }, L, 24) },
    }),
    frame(p, s, ctx) {
      const rise = s.step === 1 ? smooth(0.3, 2.2, s.t) : 1;
      const pts = ctx.regData;
      const mx2 = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      return {
        cloud: [points(pts.map(([x1, x2, y]) => [...L([x1, y, hx(x2) * rise]), 1]), 'cobalt', 7),
          lines(pts.map(([x1, x2, y]) => [L([x1, y, 0]), L([x1, y, hx(x2) * rise])]), 'chalk', 1)],
        bias: [lines(curve(L, (x1) => [x1, 1 + 0.5 * x1 + 0.8 * mx2, hx(mx2)], 0, 10), 'ochre', 3.2),
          lines(curve(L, (x1) => [x1, ctx.regFit.a + ctx.regFit.b * x1, 0], 0, 10), 'madder', 3),
          label('slope in x₁ holding x₂ fixed: 0.50', L([9.5, 1 + 0.5 * 9.5 + 0.8 * mx2, hx(mx2) + 0.03]), 'tag ochre'),
          label(`the page’s line: ${ctx.regFit.b.toFixed(2)}`, L([9.5, ctx.regFit.a + ctx.regFit.b * 9.5 + 0.4, 0.01]), 'tag madder')],
      };
    },
    steps: [
      { title: 'A line through a cloud', cam: 'top', show: [],
        text: 'Least squares on the page: the line that minimizes squared vertical distances. Its slope, close to 1, is reported as the effect of x₁ on y.' },
      { title: 'Lift each point to its x₂', cam: 'three', show: ['cloud'], focus: 'cloud',
        text: 'Every observation also has a value of a second variable, x₂, which the regression left out. Raise each point to the height of its x₂.' },
      { title: 'The data lie on a tilted plane', cam: { az: -34, el: 26, zoom: 1.2, lift: 0.14 }, show: ['cloud', 'plane'], focus: 'plane',
        text: 'The points sit close to a plane that tilts in two directions: y = 1 + 0.5x₁ + 0.8x₂. Holding x₂ fixed, y rises by 0.5 per unit of x₁, half the slope on the page.' },
      { title: 'Look along x₁', cam: { az: 86, el: 8, zoom: 1.2, lift: 0.18 }, show: ['cloud', 'plane', 'bias'], focus: 'bias',
        text: 'From the side, the plane’s second tilt is visible. Because x₂ rises with x₁ (δ ≈ 0.6), the line on the page absorbed part of x₂’s effect: bias = β₂δ ≈ 0.8 × 0.6.' },
      { title: 'The page is a shadow', cam: 'top', show: ['cloud', 'plane', 'bias'], focus: 'bias',
        text: 'Back from above, the plane flattens into the page and the steep line returns. A regression is a view of a higher-dimensional cloud from one direction; omitted variables are the directions the view hides.' },
    ],
    eq: EQ,
  };
})();

export const DIVES = { consumer, sd, optim, cost, monopoly, solow, islm, regression };
