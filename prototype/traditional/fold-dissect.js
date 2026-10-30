// Concept anatomy, on the folding page.
//
// On the flat page a concept is an ordinary textbook figure with its reasoning.
// "Unfold and take apart" folds the page into space, flies to that figure, and
// lifts its components off the page as sheets, from exactly where they were
// printed. The variable the figure held fixed rises vertically off the page or
// stands as a wall behind it. At the end the sheets settle back into the print
// and the page folds flat again at the same place.

import { SPECS } from './dissect-specs.js';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const f2 = (v) => v.toFixed(2);

const TOP = 'top';
const APART = { az: -28, el: 36, zoom: 1.55, lift: 0.16 };
const LOW = { az: -34, el: 20, zoom: 1.42, lift: 0.14 };
const WALL = { az: -22, el: 22, zoom: 1.55, lift: 0.2, pb: 0.18 };
const GAP = 0.065;
const LIFT = 0.42;

// What each step does in the folded scene. heights: 'flat' | 'apart' | {focus: [...]} | custom map.
const FOLD = {
  market: {
    page: ['axes', 'demand', 'supply', 'eq'],
    dom: { x: [0, 12], y: [0, 12] },
    params: { I: { value: 1, min: 1, max: 1.4, step: 0.01, label: 'Income', sym: 'I' }, p: { value: 5.5, min: 1, max: 11, step: 0.05, label: 'Price', sym: 'P' } },
    steps: [
      { cam: TOP, sheets: 'page', fix: { I: 1, p: 5.5 } },
      // each side of the market on its own sheet, with its agents standing on it
      { cam: APART, sheets: { stack: { axes: 0, demand: 0.08, supply: 0.16, eq: 0.24 } }, fix: { I: 1, p: 5.5 } },
      { cam: APART, sheets: { stack: { axes: 0, buyers: 0.1, sellers: 0.2, eq: 0 } }, fix: { I: 1, p: 5.5 } },
      { cam: LOW, sheets: { flat: ['axes', 'demand', 'supply'] }, fix: { I: 1, p: 5.5 } },
      { cam: { az: -24, el: 40, zoom: 1.45, lift: 0.1 }, sheets: { flat: ['axes', 'demand', 'supply', 'price', 'gap', 'eq'] }, timed: true },
      {
        cam: { az: -26, el: 34, zoom: 1.7, lift: 0.08 }, sheets: { flat: [] },
        travel: [
          { sel: '#anat-demand .ds-fig', label: 'Demand, rebuilt from household choice (Micro 3–4)' },
          { sel: 'figure[data-fig="cost"]', label: 'Supply, rebuilt from firms’ costs (Micro 7–8)' },
          { sel: 'figure[data-fig="edgeworth"]', label: 'One market among many, all clearing at once (Micro 11)' },
          { sel: '#anat-islm .ds-fig', label: 'The goods market of a whole economy (Macro 8)' },
        ],
      },
      { cam: TOP, sheets: 'page', fix: { I: 1, p: 5.5 } },
    ],
    // income rises a fifth, then the price is pushed toward E′ by excess demand
    timed(t) {
      const I = t < 0.5 ? 1 : 1.2;
      const p = t < 0.9 ? 5.5 : 6.5 - Math.exp(-1.05 * (t - 0.9));
      return { I, p };
    },
    agents(step, p, h, L) {
      const out = {};
      if (step === 1) {
        [[1.5, 0], [3.2, 0.7], [6, 0.3], [8.2, -0.4]].forEach(([q, ry], i) => {
          out[`hh${i}`] = { type: 'agent', name: 'household', at: L(q, 10 - q, h.demand), scale: 0.032, ry };
        });
        [[2, 0], [5.6, 0.5], [9, -0.3]].forEach(([q, ry], i) => {
          out[`fm${i}`] = { type: 'agent', name: 'firm', at: L(q, 1 + q, h.supply), scale: 0.036, ry };
        });
        out.mk = { type: 'agent', name: 'market_hall', at: L(4.5, 5.5, h.eq), scale: 0.05, ry: 0.2 };
        out.lh = { type: 'label', at: L(8.2, 1.8, h.demand + 0.06), html: 'households: demand', cls: 'tag cobalt' };
        out.lf = { type: 'label', at: L(9, 10, h.supply + 0.07), html: 'firms: supply', cls: 'tag madder' };
        out.lm = { type: 'label', at: L(4.5, 5.5, h.eq + 0.08), html: 'the market: one price', cls: 'tag ochre' };
      }
      if (step === 2) {
        for (let i = 0; i < 10; i++) out[`b${i}`] = { type: 'agent', name: 'person', at: L(i + 0.5, 9.5 - i, h.buyers), scale: 0.016, ry: 0.3 * i };
        for (let i = 0; i < 10; i++) out[`s${i}`] = { type: 'agent', name: 'firm', at: L(i + 0.5, 1.5 + i, h.sellers), scale: 0.022, ry: 0.2 * i };
        out.lt = { type: 'label', at: L(2.5, 5.5, h.sellers + 0.08), html: 'at 5.5: five buyers and five sellers trade', cls: 'tag ochre' };
      }
      if (step === 4) {
        const qs = Math.max(0, p.p - 1);
        out.mk = { type: 'agent', name: 'market_hall', at: L(qs, p.p, 0), scale: 0.045, ry: 0.2 };
        out.law = { type: 'label', at: L(0.6, 11.4, 0.05), html: 'dP/dt = κ[D(P) − S(P)]', cls: 'xeq' };
      }
      return out;
    },
    geo(step, p, h, L) {
      const out = {};
      if (step === 3) {
        // demand at each income, stacked by income: a surface whose slices are the textbook curves
        const H = (I) => (I - 1) * 1.1;
        const segs = [];
        const ribs = [];
        for (let I = 1; I <= 1.4001; I += 0.05) {
          const q0 = Math.max(0, 10 * I - 12);
          const q1 = Math.min(12, 10 * I);
          segs.push([L(q0, 10 * I - q0, H(I)), L(q1, 10 * I - q1, H(I))]);
        }
        for (let P = 0; P <= 12; P += 1.5) {
          let prev = null;
          for (let I = 1; I <= 1.4001; I += 0.05) {
            const q = 10 * I - P;
            if (q < 0 || q > 12) { prev = null; continue; }
            const pt = L(q, P, H(I));
            if (prev) ribs.push([prev, pt]);
            prev = pt;
          }
        }
        out.surf = { type: 'lines', segs, c: 'cobalt', w: 1.4 };
        out.ribs = { type: 'lines', segs: ribs, c: 'cobalt', w: 1 };
        out.slice = { type: 'lines', segs: [[L(0, 12, H(1.2)), L(12, 0, H(1.2))]], c: 'ochre', w: 3.4 };
        out.shadow = { type: 'lines', segs: [[L(0, 12, 0.002), L(12, 0, 0.002)]], c: 'ochre', w: 1.6, dash: true };
        out.ls = { type: 'label', at: L(11, 1, H(1.2) + 0.04), html: 'income 1.2: the slice D′', cls: 'tag ochre' };
        out.ld = { type: 'label', at: L(9.6, 0.4, 0.04), html: 'income 1: D', cls: 'tag cobalt' };
      }
      return out;
    },
  },
  elasticity: {
    page: ['axes', 'demand', 'point'],
    dom: { x: [0, 10], y: [0, 10] },
    params: { q: { value: 3, min: 0.8, max: 9.2, step: 0.05, label: 'Point A at', sym: 'Q' } },
    steps: [
      { cam: TOP, sheets: 'page' },
      { cam: APART, sheets: 'apart' },
      { cam: APART, sheets: { focus: ['slope', 'demand'] } },
      { cam: APART, sheets: { focus: ['ray', 'point', 'demand'] }, slider: 'q', sweep: true, text: 'The second ingredient is <b>where</b> the point is: the ratio P/Q, the slope of the ray from the origin to A. Watch A slide down the line, or move it with the slider: the ray flattens from steep to shallow, and P/Q falls.' },
      { cam: APART, sheets: { focus: ['slope', 'ray', 'point', 'zones'] }, slider: 'q', sweep: true },
      { cam: LOW, sheets: { flat: ['axes', 'demand', 'point', 'revenue', 'zones'] }, slider: 'q', sweep: true, text: 'Revenue is the area P·Q under A. Stand that area up off the page as a height above A. As A slides down the line the height rises, peaks at the midpoint and falls. Revenue is largest exactly where |ε| = 1, because <b>dR/dP = Q(1 + ε)</b> is zero there.' },
      { cam: TOP, sheets: 'page', fix: { q: 3 } },
    ],
    geo(step, p, h, L) {
      const out = {};
      const q = p.q;
      if (step === 4) out.eps = { type: 'label', at: L(q, 10 - q, h.point + 0.03), html: `ε = −${f2((10 - q) / q)}`, cls: 'tag ochre' };
      if (step === 5) {
        const H = (x) => ((x * (10 - x)) / 25) * 0.42;
        const segs = [];
        for (let x = 0.25; x < q; x += 0.25) segs.push([L(x, 10 - x, H(x)), L(Math.min(q, x + 0.25), 10 - Math.min(q, x + 0.25), H(Math.min(q, x + 0.25)))]);
        out.arch = { type: 'lines', segs, c: 'ochre', w: 3.4 };
        out.drop = { type: 'lines', segs: [[L(q, 10 - q, 0), L(q, 10 - q, H(q))]], c: 'ochre', w: 1.4, dash: true };
        out.top = { type: 'points', pts: [[...L(q, 10 - q, H(q)), 1.2], ...(q > 5 ? [[...L(5, 5, H(5)), 1.5]] : [])], c: 'ochre', size: 9 };
        out.rv = { type: 'label', at: L(q, 10 - q, H(q) + 0.02), html: `R = ${(q * (10 - q)).toFixed(1)}`, cls: 'tag ochre' };
        if (q > 5) out.pk = { type: 'label', at: L(5, 5, H(5) + 0.05), html: 'the top: |ε| = 1', cls: 'tag madder' };
      }
      return out;
    },
  },
  demand: {
    page: ['axes', 'indiff', 'budget', 'optimum'],
    dom: { x: [0, 12], y: [0, 12] },
    params: { px: { value: 1, min: 1, max: 3, step: 0.05, label: 'Price of x', sym: 'p<sub>x</sub>' } },
    wall: { layer: 'floor', b: 1, height: 0.45, ymax: 3.2 },
    steps: [
      { cam: TOP, sheets: 'page', fix: { px: 1 } },
      { cam: APART, sheets: { apart: ['axes', 'indiff', 'budget', 'optimum'] }, fix: { px: 1 } },
      { cam: LOW, sheets: { flat: ['axes', 'indiff'] }, fix: { px: 1 }, text: 'Each curve joins bundles of equal utility. Lift each one off the page to the height of its utility, and the sheet becomes the hill whose contour lines they are. The household wants to climb as high as its budget allows.' },
      { cam: { az: -18, el: 52, zoom: 1.35 }, sheets: { flat: ['axes', 'indiff', 'budget', 'optimum'] }, slider: 'px', sweep: true, text: 'The budget line’s slope is −p<sub>x</sub>/p<sub>y</sub>. As the price of x rises (watch, or use the slider), the line turns inward about its intercept on the y axis, where only y is bought, and the chosen bundle moves left.' },
      { cam: WALL, sheets: { flat: ['axes', 'indiff', 'budget', 'optimum'], wall: true }, slider: 'px', sweep: true, text: 'The flat figure held the price fixed. Stand the price up as a wall behind the figure. At each price, carry the chosen x back to the wall and up to that price. The points trace one household’s demand curve, <b>x = 6/p<sub>x</sub></b>: the curve Principles took as given is a list of optima.' },
      { cam: { az: -16, el: 50, zoom: 1.35 }, sheets: { flat: ['axes', 'indiff', 'budget', 'optimum'], raise: ['comp', 'arrows'] }, fix: { px: 2 } },
      { cam: TOP, sheets: 'page', fix: { px: 1 } },
    ],
    geo(step, p, h, L) {
      const out = {};
      if (step === 2) {
        const segs = [];
        for (const u of [3, Math.sqrt(18), 6, 8, 10]) {
          for (let x = (u * u) / 12; x + 0.2 <= 12; x += 0.2) segs.push([L(x, (u * u) / x, u * 0.035), L(x + 0.2, (u * u) / (x + 0.2), u * 0.035)]);
        }
        out.hill = { type: 'lines', segs, c: 'cobalt', w: 2 };
      }
      if (step === 4) {
        const px = p.px;
        const x = 6 / px;
        const hw = (pp) => (pp / 3.2) * 0.45;
        out.carry = { type: 'lines', segs: [[L(x, 6, 0.002), L(x, 12, 0.002)], [L(x, 12, 0), L(x, 12, hw(px))]], c: 'chalk', w: 1.4, dash: true };
        const segs = [];
        for (let pp = 1; pp < px; pp += 0.05) segs.push([L(6 / pp, 12, hw(pp)), L(6 / Math.min(px, pp + 0.05), 12, hw(Math.min(px, pp + 0.05)))]);
        out.trace = { type: 'lines', segs, c: 'ochre', w: 3.4 };
        out.now = { type: 'points', pts: [[...L(x, 12, hw(px)), 1.2]], c: 'ochre', size: 9 };
        out.pv = { type: 'label', at: L(x, 12, hw(px) + 0.03), html: `p<sub>x</sub> = ${f2(px)}, x = ${f2(x)}`, cls: 'tag ochre' };
      }
      return out;
    },
  },
  islm: {
    page: ['axes', 'line45', 'G', 'eq'],
    dom: { x: [0, 14], y: [0, 14] },
    params: { r: { value: 1, min: 1, max: 4, step: 0.05, label: 'Interest rate', sym: 'r' } },
    wall: { layer: 'floor', b: 1, height: 0.45, ymax: 5 },
    steps: [
      { cam: TOP, sheets: 'page', fix: { r: 1 } },
      { cam: APART, sheets: { apart: ['axes', 'line45', 'C', 'I', 'G', 'eq'] }, fix: { r: 1 } },
      { cam: APART, sheets: { focus: ['C', 'line45'] }, fix: { r: 1 } },
      // the sum, literally stacked: consumption, then investment on it, then government on top
      { cam: LOW, sheets: { stack: { axes: 0, line45: 0, C: 0.07, I: 0.14, G: 0.21, eq: 0 } }, fix: { r: 1 }, text: 'Investment sits on top of consumption, and it depends on the interest rate: firms invest until the marginal product of capital equals r + δ (Micro 7). Government spending is a fixed layer on top. Stacked off the page, the three sheets are the sum <b>AE = C(Y) + I(r) + G</b>.' },
      { cam: { az: -16, el: 50, zoom: 1.35 }, sheets: { flat: ['axes', 'line45', 'G', 'eq'] }, fix: { r: 1 } },
      { cam: WALL, sheets: { flat: ['axes', 'line45', 'C', 'I', 'G', 'eq'], wall: true }, slider: 'r', sweep: true, text: 'The cross held the interest rate fixed. Stand r up as a wall behind the figure. As r rises (watch, or use the slider), only the investment sheet moves: AE drops and Y* moves left. Carry each equilibrium back to the wall and up to its r. The points trace <b>the IS curve</b>: every pair of output and interest rate at which the goods market clears.' },
      { cam: TOP, sheets: 'page', fix: { r: 1 } },
    ],
    geo(step, p, h, L) {
      const out = {};
      if (step === 5) {
        const Yst = (r) => (0.8 + 2.5 - 0.533 * r + 1.5) / 0.4;
        const hw = (r) => (r / 5) * 0.45;
        const Y = Yst(p.r);
        out.carry = { type: 'lines', segs: [[L(Y, Y, 0.002), L(Y, 14, 0.002)], [L(Y, 14, 0), L(Y, 14, hw(p.r))]], c: 'chalk', w: 1.4, dash: true };
        const segs = [];
        for (let r = 1; r < p.r; r += 0.05) segs.push([L(Yst(r), 14, hw(r)), L(Yst(Math.min(p.r, r + 0.05)), 14, hw(Math.min(p.r, r + 0.05)))]);
        out.trace = { type: 'lines', segs, c: 'ochre', w: 3.4 };
        out.now = { type: 'points', pts: [[...L(Y, 14, hw(p.r)), 1.2]], c: 'ochre', size: 9 };
        out.rv = { type: 'label', at: L(Y, 14, hw(p.r) + 0.03), html: `r = ${f2(p.r)}, Y* = ${Y.toFixed(1)}`, cls: 'tag ochre' };
      }
      return out;
    },
  },
};

// Heights of every sheet for one step: where it stands and how lit it is.
function targets(F, spec, step) {
  const ids = spec.layers.map((L) => L.id).filter((id) => !F.wall || id !== F.wall.layer);
  const S = F.steps[step].sheets;
  const out = {};
  for (const id of ids) out[id] = { h: 0, op: 0 };
  if (S === 'page') {
    // on the page itself: the printed figure shows, the sheets lie in it unseen
    for (const id of F.page) out[id] = { h: 0, op: 0 };
  } else if (S === 'apart') {
    ids.forEach((id, i) => { out[id] = { h: i * GAP, op: 1 }; });
  } else if (S.apart) {
    S.apart.forEach((id, i) => { out[id] = { h: i * GAP, op: 1 }; });
  } else if (S.focus) {
    // the sheets in focus rise together above the rest, so their parts register
    ids.forEach((id, i) => { out[id] = S.focus.includes(id) ? { h: LIFT, op: 1 } : { h: i * GAP, op: 0.14 }; });
  } else if (S.stack) {
    for (const id in S.stack) out[id] = { h: S.stack[id], op: 1 };
  } else {
    for (const id of S.flat ?? []) out[id] = { h: 0, op: 1 };
    for (const id of S.raise ?? []) out[id] = { h: 0.06, op: 1 };
  }
  return out;
}

export function foldScript(id) {
  const spec = SPECS.find((s) => s.id === id);
  const F = FOLD[id];
  const L = (x, y, h = 0) => [(x - F.dom.x[0]) / (F.dom.x[1] - F.dom.x[0]), (y - F.dom.y[0]) / (F.dom.y[1] - F.dom.y[0]), h];
  const layers = Object.fromEntries(spec.layers.map((Ly) => [Ly.id, Ly]));
  return {
    dissect: true,
    figure: 'Anatomy',
    eq: spec.eq,
    params: F.params,
    meshes: () => ({}),
    steps: spec.steps.map((s, i) => ({
      title: s.k,
      text: F.steps[i].text ?? s.html,
      cam: F.steps[i].cam,
      show: ['*'],
      slider: F.steps[i].slider,
      sweep: F.steps[i].sweep,
      travel: F.steps[i].travel,
    })),
    frame(p, s) {
      const st = F.steps[s.step];
      const params = { ...p, ...(st.fix ?? {}), ...(st.timed ? F.timed(s.t) : {}) };
      const mem = s.mem;
      // ease each sheet from where it was when the step began to where this step puts it
      if (mem.step !== s.step) {
        mem.from = { ...(mem.cur ?? {}) };
        mem.step = s.step;
      }
      const tgt = targets(F, spec, s.step);
      const k = ease(clamp(s.t / 1.1, 0, 1));
      mem.cur = {};
      const out = {};
      const h = {};
      for (const id in tgt) {
        const a = mem.from[id] ?? { h: 0, op: 0 };
        const c = { h: lerp(a.h, tgt[id].h, k), op: lerp(a.op, tgt[id].op, k) };
        mem.cur[id] = c;
        h[id] = c.h;
        if (c.op < 0.01) continue;
        const Ly = layers[id];
        const key = JSON.stringify((Ly.live ?? []).map((q) => Math.round(params[q] * 100) / 100));
        out[`sheet-${id}`] = { type: 'sheet', key, draw: (host) => Ly.draw(host, params), h: c.h, op: c.op, acetate: clamp(c.h / 0.04, 0, 1) * 0.9, tint: Ly.tint };
      }
      // the wall that holds the variable the figure kept fixed
      if (F.wall) {
        if (mem.wallStep !== s.step) {
          mem.wallFrom = mem.wallA ?? 0;
          mem.wallStep = s.step;
        }
        const w = lerp(mem.wallFrom, st.sheets.wall ? 1 : 0, k);
        mem.wallA = w;
        if (w > 0.01) {
          const Ly = layers[F.wall.layer];
          out['sheet-wall'] = { type: 'sheet', key: 'wall', draw: (host) => Ly.draw(host, params), h: 0, op: w, acetate: 0.8, wall: { b: F.wall.b, height: F.wall.height * w }, tint: Ly.tint };
        }
      }
      if (k > 0.6) Object.assign(out, F.geo(s.step, params, h, L));
      if (F.agents && k > 0.3) Object.assign(out, F.agents(s.step, params, h, L));
      // on the way to a later course: name the place where this market is taken apart
      if (s.travel) out.dest = { type: 'label', at: [0.5, 1.08, 0.04], box: s.travel.box, html: s.travel.label, cls: 'tag ochre' };
      return out;
    },
  };
}

// ---------- the flat page ----------
export function renderFoldDissections(root) {
  for (const spec of SPECS) {
    const F = FOLD[spec.id];
    const anchor = root.querySelector(spec.after);
    if (!anchor || !F) continue;
    const el = document.createElement(anchor.tagName === 'LI' ? 'li' : 'section');
    el.className = 'dissect';
    el.id = `anat-${spec.id}`;
    const steps = spec.steps.map((s, i) => `<li><b>${s.k}.</b> ${(F.steps[i].text ?? s.html).replace(/<\/?p[^>]*>/g, ' ')}</li>`).join('');
    el.innerHTML = `<p class="an-title"><span>Anatomy</span>${spec.title}</p>` +
      `<p class="ds-eq">${spec.eq}</p>` +
      '<div class="ds-cols">' +
      `<figure class="fig ds-fig" data-dissect="${spec.id}"><div class="fig-art"></div><figcaption><span class="fig-no">Anatomy</span>The textbook figure. Unfold it to take it apart into its components, one sheet each.</figcaption></figure>` +
      `<ol class="ds-list">${steps}</ol></div>`;
    const art = el.querySelector('.fig-art');
    const params = Object.fromEntries(Object.entries(F.params).map(([k, v]) => [k, v.value]));
    for (const id of F.page) {
      const Ly = spec.layers.find((x) => x.id === id);
      const d = document.createElement('div');
      d.className = 'ds-print';
      Ly.draw(d, params);
      art.appendChild(d);
    }
    anchor.after(el);
  }
}
