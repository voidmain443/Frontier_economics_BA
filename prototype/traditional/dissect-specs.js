// The three pilot dissections. Each concept is a stack of sheets drawn with the
// same plot box, so they register exactly when laid together; each step names
// which sheets are lit, where the camera stands, and what moves.

import { plot } from './figures.js';
import { mapper } from './dissect.js';

const GOLD = [0.66, 0.46, 0.11, 1];
const MADDER = [0.69, 0.23, 0.23, 1];
const COBALT = [0.16, 0.33, 0.63, 1];
const OLIVE = [0.35, 0.46, 0.13, 1];
const INK = [0.12, 0.14, 0.12, 0.85];
const front = { az: 0, el: 0, dist: 1 };
const apart = { az: -0.55, el: 0.26, dist: 1.12, tz: 0.4 };
const floorCam = { az: -0.55, el: 0.64, dist: 1.34, ty: -1.0, tz: -0.9 };
const f2 = (v) => v.toFixed(2);

// a sheet: an empty plot with the shared box, axes only on the axes sheet
const sheet = (dom, axes, labels = {}) => (host) => plot(host, { x: dom.x, y: dom.y, axes, ...labels, alt: '' });

// ======================================================================
// The market: two groups of agents, one price, and an adjustment
// ======================================================================
const MK = { x: [0, 12], y: [0, 12] };
const market = {
  id: 'market', after: 'figure[data-fig="sd"]', title: 'A market, taken apart',
  eq: '<span class="t cb">D(P, I)</span> = <span class="t md">S(P)</span>, &nbsp; dP/dt = κ[<span class="t cb">D</span> − <span class="t md">S</span>]',
  params: { I: 1, p: 5.5 },
  layers: [
    { id: 'axes', title: 'axes', draw: (h) => sheet(MK, true, { xl: 'Q', yl: 'P' })(h) },
    {
      id: 'demand', title: 'households: demand', tint: [0.16, 0.33, 0.63], live: ['I'],
      draw(h, s) {
        const p = sheet(MK, false)(h);
        if (s.I > 1.01) p.fn((q) => 10 - q, 0, 10, 'cb dash');
        p.fn((q) => 10 * s.I - q, 0, 12, 'cb thick');
        p.label(Math.min(11.6, 10 * s.I - 0.4), 0.9, s.I > 1.01 ? 'D′' : 'D', { cls: 'cb', anchor: 'end' });
      },
    },
    {
      id: 'supply', title: 'firms: supply', tint: [0.69, 0.23, 0.23],
      draw(h) {
        const p = sheet(MK, false)(h);
        p.fn((q) => 1 + q, 0, 11, 'md thick');
        p.label(10.6, 11.2, 'S', { cls: 'md' });
      },
    },
    {
      id: 'eq', title: 'the market: E', live: ['I'],
      draw(h, s) {
        const p = sheet(MK, false)(h);
        const P = (10 * s.I + 1) / 2;
        const Q = P - 1;
        p.guide(Q, P, Q, 0);
        p.guide(Q, P, 0, P);
        p.dot(Q, P, 'k', 5);
        p.label(Q + 0.3, P - 0.6, s.I > 1.01 ? 'E′' : 'E');
      },
    },
    {
      id: 'price', title: 'the price', tint: [0.66, 0.46, 0.11], live: ['p'],
      draw(h, s) {
        const p = sheet(MK, false)(h);
        p.line(0, s.p, 12, s.p, 'oc thick');
        p.note(0.3, s.p + 0.35, `P = ${f2(s.p)}`, { cls: 'oc' });
      },
    },
    {
      id: 'gap', title: 'excess demand', tint: [0.66, 0.46, 0.11], live: ['I', 'p'],
      draw(h, s) {
        const p = sheet(MK, false)(h);
        const qd = Math.max(0, 10 * s.I - s.p);
        const qs = Math.max(0, s.p - 1);
        if (Math.abs(qd - qs) > 0.15) {
          p.arrow(qs, s.p, qd, s.p, 'oc');
          p.note((qd + qs) / 2 - 1.2, s.p - 0.7, `excess demand ${f2(qd - qs)}`, { cls: 'oc' });
        }
      },
    },
    {
      id: 'buyers', title: 'ten buyers, by willingness to pay', tint: [0.16, 0.33, 0.63],
      draw(h) {
        const p = sheet(MK, false)(h);
        p.pathPts(Array.from({ length: 10 }, (_, i) => [[i, 9.5 - i], [i + 1, 9.5 - i]]).flat(), 'cb thick');
        p.note(6.6, 3.9, 'one step = one buyer', { cls: 'cb' });
      },
    },
    {
      id: 'sellers', title: 'ten sellers, by cost', tint: [0.69, 0.23, 0.23],
      draw(h) {
        const p = sheet(MK, false)(h);
        p.pathPts(Array.from({ length: 10 }, (_, i) => [[i, 1.5 + i], [i + 1, 1.5 + i]]).flat(), 'md thick');
        p.note(6.4, 9.2, 'one step = one seller', { cls: 'md' });
      },
    },
  ],
  steps: [
    { k: 'The figure', html: '<p>A market as the textbook draws it: a demand curve, a supply curve, and the equilibrium E where they cross. The price is 5.5 and 4.5 units change hands. Principles presents both curves as facts about the market.</p>', state: () => ({}) },
    { k: 'Who is in it', html: '<p>Every part of the figure belongs to an agent. The demand curve is the households’ side: each point is a buyer willing to pay that price. The supply curve is the firms’ side: each point is a seller’s cost of one more unit. E belongs to neither side. It is the market, the place where the two sides meet at one price.</p>', state: () => ({}) },
    { k: 'The curves are people', html: '<p>Lift the two sides and look closely. The demand curve is ten buyers lined up by how much they would pay. The supply curve is ten sellers lined up by cost. At a price of 5.5, the first five buyers and the first five sellers trade. Every curve in the courses that follow is, in the end, a list of agents.</p>', state: () => ({}) },
    { k: 'The hidden axis: income', html: '<p>The demand curve was drawn at one level of household income. Raise income and every buyer will pay more. Stack the demand curve at each income and the curves form a surface. The textbook’s shift from D to D′ is a move to another slice of that surface.</p>', state: () => ({}) },
    { k: 'Move it: the price is pushed', html: '<p>Income rises by a fifth. At the old price, buyers now want more than sellers offer: excess demand. That gap pushes the price up, <b>dP/dt = κ[D(P) − S(P)]</b>. As it rises, buyers drop out and sellers come in, until the gap closes at E′: a price of 6.5 and a quantity of 5.5. The book shows the two resting points. The market is the movement between them.</p>', state: () => ({}) },
    { k: 'Where it is used later', html: '<p>This market is a summary that later courses take apart. Demand is rebuilt from household choice (Micro 3–4). Supply is rebuilt from firms’ costs and entry (Micro 7–8). The equilibrium becomes one market among many, all clearing at once (Micro 11). The same logic applied to the whole economy’s output is the goods market of IS–LM (Macro 8).</p>', state: () => ({}) },
    { k: 'Put it back', html: '<p>Lay the sheets back on the page. A market is two groups of agents, one price, and an adjustment that makes their plans consistent.</p><p class="ds-next">In June 2022 Brent crude averaged about $123 a barrel (chapter 7’s data), when supply was expected to shrink while demand stayed strong: this figure with S moved left.</p>', state: () => ({}) },
  ],
};

// ======================================================================
// Elasticity: one slope, a changing position
// ======================================================================
const E = { x: [0, 10], y: [0, 10] };
const eM = mapper(E);
const elasticity = {
  id: 'elasticity', after: '#principles-4', title: 'Elasticity, taken apart',
  eq: 'ε = <span class="t ol">dQ/dP</span> · <span class="t md">P/Q</span>',
  params: { q: 3 },
  layers: [
    { id: 'axes', title: 'axes', draw: (h) => sheet(E, true, { xl: 'Q', yl: 'P' })(h) },
    {
      id: 'demand', title: 'the demand curve',
      draw(h) {
        const p = sheet(E, false)(h);
        p.fn((q) => 10 - q, 0, 10, 'cb thick');
        p.label(9.3, 1.4, 'D: P = 10 − Q', { cls: 'cb', anchor: 'end' });
      },
    },
    {
      id: 'slope', title: 'slope dQ/dP', tint: [0.35, 0.46, 0.13],
      draw(h) {
        const p = sheet(E, false)(h);
        for (const q0 of [1.5, 4.5, 7.5]) {
          p.line(q0, 10 - q0, q0 + 1.5, 10 - q0, 'ol thick');
          p.line(q0 + 1.5, 10 - q0, q0 + 1.5, 10 - q0 - 1.5, 'ol thick');
        }
        p.note(6.2, 4.6, 'ΔQ = 1.5, ΔP = −1.5', { cls: 'ol' });
        p.note(6.2, 3.9, 'dQ/dP = −1 at every point', { cls: 'ol' });
      },
    },
    {
      id: 'ray', title: 'position P/Q', tint: [0.69, 0.23, 0.23], live: ['q'],
      draw(h, s) {
        const p = sheet(E, false)(h);
        const P = 10 - s.q;
        p.line(0, 0, s.q, P, 'md thick');
        p.note(s.q * 0.5 + 0.3, P * 0.5 - 0.2, `P/Q = ${f2(P / s.q)}`, { cls: 'md' });
      },
    },
    {
      id: 'point', title: 'the point A', live: ['q'],
      draw(h, s) {
        const p = sheet(E, false)(h);
        const P = 10 - s.q;
        p.guide(s.q, P, s.q, 0);
        p.guide(s.q, P, 0, P);
        p.dot(s.q, P, 'k', 5);
        p.label(s.q + 0.25, P + 0.35, 'A');
      },
    },
    {
      id: 'revenue', title: 'revenue P·Q', tint: [0.66, 0.46, 0.11], live: ['q'],
      draw(h, s) {
        const p = sheet(E, false)(h);
        const P = 10 - s.q;
        p.area([[0, 0], [s.q, 0], [s.q, P], [0, P]], 'f-ochre');
        p.note(0.3, 0.5, `R = P·Q = ${(P * s.q).toFixed(1)}`, { cls: 'oc' });
      },
    },
    {
      id: 'zones', title: 'elastic and inelastic halves',
      draw(h) {
        const p = sheet(E, false)(h);
        p.dot(5, 5, 'oc', 5);
        p.label(5.3, 5.4, '|ε| = 1', { cls: 'oc' });
        p.note(1.1, 9.4, '|ε| > 1: elastic', { cls: 'oc' });
        p.note(7.0, 2.3, '|ε| < 1: inelastic', { cls: 'oc' });
      },
    },
  ],
  steps: [
    {
      k: 'The figure',
      html: '<p>A straight demand curve and a point A on it. The textbook says that demand is elastic near the top and inelastic near the bottom. But a straight line has the same slope everywhere, so elasticity must be made of something besides the slope.</p>',
      state: () => ({ explode: 0, show: ['axes', 'demand', 'point'], cam: front, params: { q: 3 } }),
    },
    {
      k: 'Take it apart',
      html: '<p>The figure is a stack of transparent sheets: the axes, the demand curve, a slope triangle, a ray from the origin, the point, the revenue rectangle, and the two halves. Lift them apart.</p>',
      state: () => ({ explode: 1, cam: apart, params: { q: 3 } }),
    },
    {
      k: 'The slope sheet: dQ/dP',
      html: '<p>Wherever you measure it, moving 1.5 along Q moves the price by −1.5: <b>dQ/dP = −1 at every point</b>. On its own the slope cannot explain why the top and the bottom of the line differ.</p>',
      state: () => ({ explode: 1, focus: ['slope', 'demand'], cam: apart, params: { q: 3 } }),
    },
    {
      k: 'The position sheet: P/Q',
      html: '<p>The second ingredient is <b>where</b> the point is: the ratio P/Q, which is the slope of the ray from the origin to A. Keep scrolling and A slides down the line. The ray flattens from steep to shallow, so P/Q falls.</p>',
      state: (t) => ({ explode: 1, focus: ['ray', 'point', 'demand'], cam: apart, params: { q: 1.2 + 7.6 * t } }),
    },
    {
      k: 'Multiply the two sheets',
      html: '<p>Elasticity is the product of the two sheets: <b>ε = (dQ/dP)(P/Q)</b>, a constant slope times a position that shrinks as A moves down. Above the midpoint P/Q &gt; 1, so |ε| &gt; 1. At the midpoint P/Q = 1 and ε = −1. Below it, demand is inelastic.</p>',
      state: (t) => ({
        explode: 1, focus: ['slope', 'ray', 'point', 'zones'], cam: apart, params: { q: 1.5 + 7 * t },
        geo(g, s) {
          const [x, y] = eM(s.q, 10 - s.q);
          g.tag('eps', [x, y, g.z('point')], `ε = −${f2((10 - s.q) / s.q)}`, 'val');
        },
      }),
    },
    {
      k: 'The hidden dimension: revenue',
      html: '<p>Revenue is the area P·Q under A. Stand that area on end, as a height out of the page above A. As A slides down the line the height rises, peaks at the midpoint and falls. Revenue is largest exactly where |ε| = 1, because <b>dR/dP = Q(1 + ε)</b> is zero there.</p>',
      state: (t) => ({
        explode: 0, tilt: 1, show: ['axes', 'demand', 'point', 'revenue', 'zones'],
        cam: { az: -0.42, el: 0.5, dist: 1.2, ty: -1.0, tz: -1.5 }, params: { q: 0.5 + 9 * t },
        geo(g, s) {
          const H = (q) => (q * (10 - q)) / 25 * 2.6;
          const z0 = g.z('demand');
          let prev = null;
          for (let q = 0.25; q <= s.q + 1e-6; q += 0.25) {
            const [x, y] = eM(q, 10 - q);
            const p = [x, y, z0 + H(q)];
            if (prev) g.line(prev, p, GOLD, 3);
            prev = p;
          }
          const [x, y] = eM(s.q, 10 - s.q);
          g.line([x, y, z0], [x, y, z0 + H(s.q)], GOLD, 1.5, true);
          g.dot([x, y, z0 + H(s.q)], GOLD, 5);
          g.tag('rev', [x, y, z0 + H(s.q)], `R = ${(s.q * (10 - s.q)).toFixed(1)}`, 'val');
          if (s.q > 5) {
            const [mx, my] = eM(5, 5);
            g.dot([mx, my, z0 + H(5)], MADDER, 6);
            g.tag('top', [mx, my, z0 + H(5)], 'the top: |ε| = 1', 'key');
          }
        },
      }),
    },
    {
      k: 'Put it back',
      html: '<p>Lay the sheets back down. The same straight line now reads differently: one slope, a changing position, and so a changing elasticity. <i>A common mistake is to read elasticity off the slope; two parallel demand curves have the same slope and different elasticities at the same price.</i></p><p class="ds-next">Next: a seller with market power never prices on the inelastic half (Micro 9).</p>',
      state: () => ({ explode: 0, show: ['axes', 'demand', 'point', 'zones'], cam: front, params: { q: 3 } }),
    },
  ],
};

// ======================================================================
// Demand from choice: the optimum traced as the price turns, and the
// Slutsky decomposition of one move
// ======================================================================
const D = { x: [0, 12], y: [0, 12] };
const dM = mapper(D);
const FLOOR_D = { x: [0, 12], y: [0, 3.2] };
const fD = mapper(FLOOR_D);
const floorPt = (m, x, y) => {
  const [lx, ly] = m(x, y);
  return [lx, -1.6, -1.6 - ly];
};
const demand = {
  id: 'demand', after: '#micro-3', title: 'Demand, taken apart',
  eq: '∂x/∂p<sub>x</sub> = <span class="t oc">∂h/∂p<sub>x</sub></span> − <span class="t md">x ∂x/∂m</span>',
  params: { px: 1 },
  layers: [
    { id: 'axes', title: 'axes', draw: (h) => sheet(D, true, { xl: 'x', yl: 'y' })(h) },
    {
      id: 'indiff', title: 'indifference curves', tint: [0.16, 0.33, 0.63],
      draw(h) {
        const p = sheet(D, false)(h);
        [[18, 'u₁'], [36, 'u₀'], [64, '']].forEach(([u2, nm], i) => {
          p.fn((x) => u2 / x, u2 / 12, 12, i === 1 ? 'cb thick' : 'cb');
          if (nm) p.label(11.4, u2 / 11.4 + 0.5, nm, { cls: 'cb', anchor: 'end' });
        });
      },
    },
    {
      id: 'budget', title: 'the budget line', tint: [0.69, 0.23, 0.23], live: ['px'],
      draw(h, s) {
        const p = sheet(D, false)(h);
        if (s.px > 1.02) p.fn((x) => 12 - x, 0, 12, 'md dash');
        p.fn((x) => 12 - s.px * x, 0, 12 / s.px, 'md thick');
        p.note(12 / s.px * 0.55, 12 - s.px * (12 / s.px) * 0.55 + 0.6, `slope −p_x/p_y = −${f2(s.px)}`, { cls: 'md' });
      },
    },
    {
      id: 'optimum', title: 'the chosen bundle', live: ['px'],
      draw(h, s) {
        const p = sheet(D, false)(h);
        const x = 6 / s.px;
        p.guide(x, 6, x, 0);
        p.dot(x, 6, 'k', 5);
        p.label(x + 0.25, 6.45, s.px > 1.9 ? 'B' : 'A');
      },
    },
    {
      id: 'comp', title: 'the compensated budget', tint: [0.66, 0.46, 0.11],
      draw(h) {
        const p = sheet(D, false)(h);
        const c = 2 * Math.sqrt(18) * 2;
        p.fn((x) => c - 2 * x, c / 2 - 6, c / 2, 'oc dash');
        p.dot(Math.sqrt(18), 2 * Math.sqrt(18), 'oc', 5);
        p.label(Math.sqrt(18) + 0.25, 2 * Math.sqrt(18) + 0.4, 'C', { cls: 'oc' });
      },
    },
    {
      id: 'arrows', title: 'substitution and income effects',
      draw(h) {
        const p = sheet(D, false)(h);
        p.arrow(6, 6, Math.sqrt(18) + 0.12, 2 * Math.sqrt(18) - 0.2, 'oc');
        p.arrow(Math.sqrt(18), 2 * Math.sqrt(18), 3.1, 6.15, 'md');
        p.note(6.2, 7.6, 'substitution −1.76', { cls: 'oc' });
        p.note(0.5, 7.6, 'income −1.24', { cls: 'md' });
      },
    },
    {
      id: 'floor', title: 'the price, laid on the floor: demand', floor: true, tint: [0.66, 0.46, 0.11],
      draw(h) {
        const p = plot(h, { x: FLOOR_D.x, y: FLOOR_D.y, xl: 'x', yl: 'p_x', alt: '' });
        p.param((pp) => [6 / pp, pp], 0.55, 3.2, 'oc');
        p.note(7.2, 2.9, 'x(p_x) = 6 / p_x', { cls: 'oc' });
      },
    },
  ],
  steps: [
    {
      k: 'The figure',
      html: '<p>One household with income 12 chooses between x and y (whose price is 1). It picks the bundle A where the budget line touches the highest indifference curve: x = 6, y = 6.</p>',
      state: () => ({ explode: 0, show: ['axes', 'indiff', 'budget', 'optimum'], cam: front, params: { px: 1 } }),
    },
    {
      k: 'Take it apart',
      html: '<p>Four sheets make the figure: the axes, the indifference curves, the budget line and the chosen bundle. Each answers one question: what is wanted, what is affordable, what is chosen.</p>',
      state: () => ({ explode: 1, show: ['axes', 'indiff', 'budget', 'optimum'], cam: apart, params: { px: 1 } }),
    },
    {
      k: 'The indifference sheet is a hill',
      html: '<p>Each curve joins bundles of equal utility. Lift each one to its own height and the sheet becomes the utility hill they are the contour lines of. The household wants to climb as high as its budget allows.</p>',
      state: () => ({
        explode: 0, tilt: 1, show: ['axes', 'indiff'], cam: { az: -0.5, el: 0.42, dist: 1.25, ty: -0.8, tz: -1.5 }, params: { px: 1 },
        geo(g) {
          const z0 = g.z('indiff');
          for (const u of [3, Math.sqrt(18), 6, 8, 10]) {
            let prev = null;
            for (let x = (u * u) / 12; x <= 12; x += 0.2) {
              const [lx, ly] = dM(x, (u * u) / x);
              const p = [lx, ly, z0 + u * 0.2];
              if (prev) g.line(prev, p, COBALT, u === 6 ? 2.6 : 1.6);
              prev = p;
            }
          }
        },
      }),
    },
    {
      k: 'The budget sheet: the price is its slope',
      html: '<p>The budget line’s slope is −p<sub>x</sub>/p<sub>y</sub>. Keep scrolling: the price of x doubles and the line turns inward about its intercept on the y axis, where only y is bought.</p>',
      state: (t) => ({ explode: 1, show: ['axes', 'indiff', 'budget', 'optimum'], focus: ['budget', 'indiff'], cam: apart, params: { px: 1 + t } }),
    },
    {
      k: 'Trace the optimum: demand on a wall',
      html: '<p>The flat figure held the price fixed. Lay the price out as a third axis, on the floor. At each price, drop the chosen x onto the floor at that price. The points trace one household’s demand curve, <b>x = 6/p<sub>x</sub></b>: the curve Principles took as given is a list of optima.</p>',
      state: (t) => ({
        explode: 0.3, show: ['axes', 'indiff', 'budget', 'optimum', 'floor'], focus: ['budget', 'optimum', 'floor', 'axes'], cam: floorCam, params: { px: 1 + 2 * t },
        geo(g, s) {
          const z0 = g.z('optimum');
          const x = 6 / s.px;
          const [lx, ly] = dM(x, 6);
          const fp = floorPt(fD, x, s.px);
          g.line([lx, ly, z0], [lx, -1.6, z0], INK, 1.2, true);
          g.line([lx, -1.6, z0], fp, INK, 1.2, true, true);
          g.dot(fp, GOLD, 5, true);
          let prev = null;
          for (let pp = 1; pp <= s.px + 1e-6; pp += 0.05) {
            const q = floorPt(fD, 6 / pp, pp);
            if (prev) g.line(prev, q, GOLD, 3, false, true);
            prev = q;
          }
          g.tag('px', fp, `p<sub>x</sub> = ${f2(s.px)}, x = ${f2(x)}`, 'val', true);
        },
      }),
    },
    {
      k: 'Split one move in two',
      html: '<p>When p<sub>x</sub> goes from 1 to 2, x falls from 6 to 3. Shift the new budget line out until it just touches the old indifference curve, at C: the compensated budget.</p><p><b>A → C</b> is the substitution effect, −1.76. It is always negative: along the same curve, the bundle slides toward the good that became relatively cheaper. <b>C → B</b> is the income effect, −1.24: the same prices, less purchasing power. Together they are the Slutsky equation above.</p>',
      state: () => ({ explode: 0.45, show: ['axes', 'indiff', 'budget', 'optimum', 'comp', 'arrows'], focus: ['comp', 'arrows', 'optimum', 'indiff'], cam: { az: -0.35, el: 0.18, dist: 1.12 }, params: { px: 2 } }),
    },
    {
      k: 'Put it back',
      html: '<p>Lay the sheets back. Demand slopes down because the substitution effect always works against the price, and for a normal good the income effect works the same way. If the income effect ran the other way and outweighed it (a Giffen good), the curve would slope up.</p><p class="ds-next">Next: add the quantities of many households at each price to get market demand (Micro 4).</p>',
      state: () => ({ explode: 0, show: ['axes', 'indiff', 'budget', 'optimum', 'comp', 'arrows'], cam: front, params: { px: 2 } }),
    },
  ],
};

// ======================================================================
// IS: a list of goods-market equilibria
// ======================================================================
const K = { x: [0, 14], y: [0, 14] };
const kM = mapper(K);
const FLOOR_K = { x: [0, 14], y: [0, 5] };
const fK = mapper(FLOOR_K);
const Cf = (Y) => 0.8 + 0.6 * Y;
const If = (r) => 2.5 - 0.533 * r;
const G0 = 1.5;
const Ystar = (r) => (0.8 + If(r) + G0) / 0.4;
const is = {
  id: 'islm', after: '#macro-8', title: 'The IS curve, taken apart',
  eq: 'AE = <span class="t md">C(Y)</span> + <span class="t ol">I(r)</span> + <span class="t cb">G</span>, &nbsp; Y* = AE(Y*)',
  params: { r: 1 },
  layers: [
    { id: 'axes', title: 'axes', draw: (h) => sheet(K, true, { xl: 'Y', yl: 'AE' })(h) },
    {
      id: 'line45', title: 'the 45° line',
      draw(h) {
        const p = sheet(K, false)(h);
        p.line(0, 0, 14, 14, 'k');
        p.note(10.4, 12.6, 'output = spending', { anchor: 'end' });
      },
    },
    {
      id: 'C', title: 'consumption C(Y)', tint: [0.69, 0.23, 0.23],
      draw(h) {
        const p = sheet(K, false)(h);
        p.fn(Cf, 0, 14, 'md thick');
        p.note(13.6, Cf(13.6) - 0.9, 'C = 0.8 + 0.6 Y', { cls: 'md', anchor: 'end' });
      },
    },
    {
      id: 'I', title: 'investment I(r)', tint: [0.35, 0.46, 0.13], live: ['r'],
      draw(h, s) {
        const p = sheet(K, false)(h);
        const pts = [];
        for (let Y = 0; Y <= 14; Y += 0.5) pts.push([Y, Cf(Y)]);
        for (let Y = 14; Y >= 0; Y -= 0.5) pts.push([Y, Cf(Y) + If(s.r)]);
        p.area(pts, 'f-olive');
        p.fn((Y) => Cf(Y) + If(s.r), 0, 14, 'ol');
        p.note(0.4, Cf(0.4) + If(s.r) + 0.3, `I(r) = ${f2(If(s.r))} at r = ${f2(s.r)}`, { cls: 'ol' });
      },
    },
    {
      id: 'G', title: 'government G and total AE', tint: [0.16, 0.33, 0.63], live: ['r'],
      draw(h, s) {
        const p = sheet(K, false)(h);
        const pts = [];
        for (let Y = 0; Y <= 14; Y += 0.5) pts.push([Y, Cf(Y) + If(s.r)]);
        for (let Y = 14; Y >= 0; Y -= 0.5) pts.push([Y, Cf(Y) + If(s.r) + G0]);
        p.area(pts, 'f-cobalt');
        p.fn((Y) => Cf(Y) + If(s.r) + G0, 0, 14, 'cb thick');
        p.label(13.6, Cf(13.6) + If(s.r) + G0 + 0.5, 'AE', { roman: true, cls: 'cb', anchor: 'end' });
      },
    },
    {
      id: 'eq', title: 'the equilibrium Y*', live: ['r'],
      draw(h, s) {
        const p = sheet(K, false)(h);
        const Y = Ystar(s.r);
        p.guide(Y, Y, Y, 0);
        p.dot(Y, Y, 'k', 5);
        p.label(Y + 0.3, Y - 0.8, `Y* = ${Y.toFixed(1)}`);
      },
    },
    {
      id: 'floor', title: 'the interest rate, laid on the floor: IS', floor: true, tint: [0.66, 0.46, 0.11],
      draw(h) {
        const p = plot(h, { x: FLOOR_K.x, y: FLOOR_K.y, xl: 'Y', yl: 'r', alt: '' });
        p.fn((Y) => (12 - Y) * 0.75, 6.6, 12, 'oc');
        p.label(11.6, 0.5, 'IS', { roman: true, cls: 'oc', anchor: 'end' });
      },
    },
  ],
  steps: [
    {
      k: 'The figure',
      html: '<p>The goods market at one interest rate. Planned spending AE rises with income Y. Output settles where AE meets the 45° line, the point where everything produced is bought.</p>',
      state: () => ({ explode: 0, show: ['axes', 'line45', 'G', 'eq'], cam: front, params: { r: 1 } }),
    },
    {
      k: 'Take it apart',
      html: '<p>The one AE line is three sheets stacked: consumption, investment and government spending. With the 45° line, the equilibrium point and the axes, the figure has six sheets.</p>',
      state: () => ({ explode: 1, show: ['axes', 'line45', 'C', 'I', 'G', 'eq'], cam: apart, params: { r: 1 } }),
    },
    {
      k: 'Consumption, against the 45° line',
      html: '<p>Along the 45° line output equals spending. Consumption rises 0.6 for each unit of income: the marginal propensity to consume. That slope is the household’s choice over time from Micro 5, added up.</p>',
      state: () => ({ explode: 1, show: ['axes', 'line45', 'C', 'I', 'G', 'eq'], focus: ['C', 'line45'], cam: apart, params: { r: 1 } }),
    },
    {
      k: 'Investment and government, stacked',
      html: '<p>Investment sits on top of consumption, and it depends on the interest rate: firms invest until the marginal product of capital equals r + δ (Micro 7). Government spending is a fixed layer on top. Together, <b>AE = C(Y) + I(r) + G</b>.</p>',
      state: () => ({ explode: 1, show: ['axes', 'line45', 'C', 'I', 'G', 'eq'], focus: ['I', 'G', 'C'], cam: apart, params: { r: 1 } }),
    },
    {
      k: 'The equilibrium, and the multiplier',
      html: '<p>Output settles where AE crosses the 45° line: <b>Y* = (0.8 + I(r) + G)/(1 − 0.6)</b>. Each unit of spending becomes income, and 0.6 of that is spent again, so a change in I or G moves Y* by 1/(1 − 0.6) = 2.5 times as much.</p>',
      state: () => ({ explode: 0.6, show: ['axes', 'line45', 'C', 'I', 'G', 'eq'], focus: ['G', 'line45', 'eq'], cam: { az: -0.4, el: 0.2, dist: 1.15 }, params: { r: 1 } }),
    },
    {
      k: 'Raise r: IS appears on a wall',
      html: '<p>The cross held the interest rate fixed. Lay r out as a third axis, on the floor. Keep scrolling to raise it: only the investment sheet sinks, AE drops, and Y* moves left. Drop each equilibrium onto the floor at its r. The points trace <b>the IS curve</b>: every pair of output and interest rate at which the goods market clears.</p>',
      state: (t) => ({
        explode: 0.3, show: ['axes', 'line45', 'C', 'I', 'G', 'eq', 'floor'], focus: ['I', 'G', 'eq', 'floor', 'axes', 'line45'], cam: floorCam, params: { r: 1 + 3 * t },
        geo(g, s) {
          const z0 = g.z('eq');
          const Y = Ystar(s.r);
          const [lx, ly] = kM(Y, Y);
          const fp = floorPt(fK, Y, s.r);
          g.line([lx, ly, z0], [lx, -1.6, z0], INK, 1.2, true);
          g.line([lx, -1.6, z0], fp, INK, 1.2, true, true);
          g.dot(fp, GOLD, 5, true);
          let prev = null;
          for (let r = 1; r <= s.r + 1e-6; r += 0.05) {
            const q = floorPt(fK, Ystar(r), r);
            if (prev) g.line(prev, q, GOLD, 3, false, true);
            prev = q;
          }
          g.tag('r', fp, `r = ${f2(s.r)}, Y* = ${Y.toFixed(1)}`, 'val', true);
        },
      }),
    },
    {
      k: 'Put it back',
      html: '<p>IS is not a curve that anyone chooses on. It is a list of equilibria of one market, one for each interest rate. LM is built the same way from the money market (Macro 6). Where the two lists share a point, both markets clear at once: IS–LM.</p><p class="ds-next">Next: stack IS–LM at each price level and the output points trace aggregate demand (Macro 9).</p>',
      state: () => ({ explode: 0, show: ['axes', 'line45', 'C', 'I', 'G', 'eq'], cam: front, params: { r: 1 } }),
    },
  ],
};

// the flat figure, for a reader without WebGPU
for (const S of [market, elasticity, demand, is]) {
  S.flat = (host) => {
    const first = S.steps[0].state(0);
    for (const L of S.layers) {
      if (!first.show.includes(L.id)) continue;
      const d = document.createElement('div');
      d.className = 'ds-flat-layer';
      L.draw(d, { ...S.params });
      host.appendChild(d);
    }
  };
}

export const SPECS = [market, elasticity, demand, is];
