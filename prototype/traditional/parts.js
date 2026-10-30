// Parts: every graph and equation the course sequence builds, as a card that can
// stand in the unfolded space. A card's head says where the part was made, so
// when it is carried into a later course the reader sees what is being reused.
//
// Numbers match the page's figures, the bench instruments and the stage
// constructs (stage.js), so a part laid on a construct lines up with it.

import { plot, FIGURES } from './figures.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------- shared economics ----------

export const ECON = {
  // a straight demand, P = 10 − Q
  revenue: (q) => q * (10 - q),
  // twenty buyers and twenty sellers, one unit each
  wtp: (i) => 19.5 - i,
  cost: (i) => 0.5 + i,
  trades(t) {
    // with a per-unit tax t, buyers pay pb and sellers keep pb − t
    let n = 0;
    while (n < 20 && ECON.wtp(n) - ECON.cost(n) > t) n++;
    const pb = n > 0 ? Math.min(ECON.wtp(n - 1), ECON.cost(n - 1) + t + (ECON.wtp(n - 1) - ECON.cost(n - 1) - t) / 2) : 10;
    return { n, pb, ps: pb - t };
  },
  // three households with Cobb–Douglas tastes spend half their income on x
  incomes: [4, 6, 10],
  xi: (m, p) => (0.5 * m) / p,
  // long-run average cost and the short-run curves tangent to it (Viner's envelope)
  lrac: (q) => 2 + 0.06 * (q - 6) ** 2,
  dlrac: (q) => 0.12 * (q - 6),
  plants: [2, 4, 6, 8, 10],
  sratc: (q, qk) => ECON.lrac(qk) + ECON.dlrac(qk) * (q - qk) + 0.25 * (q - qk) ** 2,
  // Cournot with demand P = 12 − Q and marginal cost 2: n firms
  cournotP: (n) => (12 + 2 * n) / (n + 1),
  cournotQ: (n) => (10 * n) / (n + 1),
  // a firm's short-run costs (fixed cost 2)
  avc: (q) => 3 - 0.8 * q + 0.15 * q * q,
  mc: (q) => 3 - 1.6 * q + 0.45 * q * q,
  atc: (q) => 3 - 0.8 * q + 0.15 * q * q + 2 / q,
  // the goods market behind IS: AE = 0.6 Y + 4.8 − 0.533 r
  ae: (Y, r) => 0.6 * Y + 4.8 - 0.533 * r,
  yIS: (r) => 12 - (4 / 3) * r,
  // the money market behind LM: real balances demanded 0.9 Y − r
  rLM: (Y, m = 6) => 0.9 * Y - m,
};

// ---------- the catalogue ----------
// no: part number; src: where it was made; draw(host, s) draws the body.

const svgPart = (fig) => (host, s, ctx) => FIGURES[fig].draw(host, ctx);

export const PARTS = {
  ppf: { no: 'P1', title: 'The frontier', src: 'Principles 1', draw: svgPart('ppf') },
  sd: { no: 'P3', title: 'One market', src: 'Principles 3', draw: svgPart('sd') },
  elastic: {
    no: 'P4', title: 'Elasticity along one demand', src: 'Principles 4',
    draw(host, s = {}) {
      const q0 = s.q ?? 3;
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'Q', yl: 'P', alt: 'Elasticity changes along a straight demand curve' });
      p.area([[0, 0], [0, 10 - q0], [q0, 10 - q0], [q0, 0]], 'f-ochre');
      p.fn((q) => 10 - q, 0, 10, 'cb thick');
      p.dot(5, 5, 'k');
      p.label(5.3, 5.4, '|ε| = 1');
      p.note(1.2, 9.2, '|ε| > 1: elastic', { cls: 'cb' });
      p.note(6.6, 2.6, '|ε| < 1: inelastic', { cls: 'cb' });
      p.dot(q0, 10 - q0, 'oc');
      const e = (10 - q0) / Math.max(q0, 0.05);
      p.note(q0 + 0.3, 10 - q0 + 0.4, `ε = −${e.toFixed(2)}`, { cls: 'oc' });
      p.note(0.3, 0.6, `revenue P·Q = ${ECON.revenue(q0).toFixed(1)}`, { cls: 'oc' });
    },
  },
  surplus: {
    no: 'P5', title: 'Surplus, a tax, and the trades it stops', src: 'Principles 5',
    draw(host, s = {}) {
      const t = s.t ?? 0;
      const { n, pb, ps } = ECON.trades(t);
      const p = plot(host, { x: [0, 20], y: [0, 20], xl: 'Q', yl: 'P', alt: 'Buyers and sellers as steps; a tax wedge' });
      for (let i = 0; i < 20; i++) {
        const traded = i < n;
        if (traded) {
          p.area([[i, pb], [i + 1, pb], [i + 1, ECON.wtp(i)], [i, ECON.wtp(i)]], 'f-cobalt');
          p.area([[i, ECON.cost(i)], [i + 1, ECON.cost(i)], [i + 1, ps], [i, ps]], 'f-madder');
          if (t > 0) p.area([[i, ps], [i + 1, ps], [i + 1, pb], [i, pb]], 'f-ochre');
        } else if (ECON.wtp(i) > ECON.cost(i)) {
          p.area([[i, ECON.cost(i)], [i + 1, ECON.cost(i)], [i + 1, ECON.wtp(i)], [i, ECON.wtp(i)]], 'f-hatch');
        }
      }
      p.pathPts(Array.from({ length: 20 }, (_, i) => [[i, ECON.wtp(i)], [i + 1, ECON.wtp(i)]]).flat(), 'cb thick');
      p.pathPts(Array.from({ length: 20 }, (_, i) => [[i, ECON.cost(i)], [i + 1, ECON.cost(i)]]).flat(), 'md thick');
      p.line(0, pb, 20, pb, t > 0 ? 'oc' : 'k thin');
      if (t > 0) p.line(0, ps, 20, ps, 'oc');
      p.note(0.4, 19, t > 0 ? `tax ${t.toFixed(1)}: ${n} of 10 trades remain` : 'each step is one buyer or one seller', { cls: t > 0 ? 'oc' : '' });
      if (t > 0 && n < 10) p.note(n + 0.3, 11.2, 'trades that no longer happen', { cls: 'md' });
    },
  },
  externality: { no: 'P6', title: 'A cost outside the market', src: 'Principles 6', draw: svgPart('externality') },
  optim: { no: 'X5', title: 'The best point allowed', src: 'Math 5', draw: svgPart('optim') },
  consumer: { no: 'M2', title: 'One consumer’s choice', src: 'Micro 2', draw: svgPart('consumer') },
  consumerB: {
    no: 'M2′', title: 'A second consumer, in her own axes', src: 'Micro 2',
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'x_B', yl: 'y_B', alt: 'Household B’s indifference curves' });
      [9, 16, 25].forEach((u2, i) => p.fn((x) => u2 / x, u2 / 10, 10, i === 2 ? 'md thick' : 'md'));
      p.dot(2, 8, 'k');
      p.label(2.2, 8.4, 'ω_B');
    },
  },
  consumerA: {
    no: 'M2', title: 'Household A', src: 'Micro 2',
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'x_A', yl: 'y_A', alt: 'Household A’s indifference curves' });
      [9, 16, 25].forEach((u2, i) => p.fn((x) => u2 / x, u2 / 10, 10, i === 2 ? 'cb thick' : 'cb'));
      p.dot(8, 2, 'k');
      p.label(8.2, 1.4, 'ω_A');
    },
  },
  demandI: {
    no: 'M3', title: 'Demand, traced from choice', src: 'Micro 3',
    draw(host, s = {}) {
      const k = s.k ?? 1;
      const p = plot(host, { x: [0, 12], y: [0, 6], xl: 'x', yl: 'p_x', alt: 'Individual demand curves of three households' });
      ECON.incomes.forEach((m, i) => p.fn((x) => (0.5 * m) / x, (0.5 * m) / 6, 12, ['cb', 'ol', 'md'][i] + (i === 2 ? ' thick' : '')));
      ECON.incomes.forEach((m, i) => p.label(Math.min(11.5, (0.5 * m) / 0.7), 0.85 + i * 0.45, `x_${i + 1}(p)`, { cls: ['cb', 'ol', 'md'][i], anchor: 'end' }));
      p.note(0.4, 5.6, `x_i = ½ m_i / p_x   m = ${ECON.incomes.join(', ')}`);
      if (k < 1) p.note(0.4, 5.0, 'each point is an optimum at one price');
    },
  },
  market: {
    no: 'M4', title: 'Market demand: the horizontal sum', src: 'Micro 4',
    draw(host) {
      const p = plot(host, { x: [0, 24], y: [0, 6], xl: 'X', yl: 'p_x', alt: 'Market demand as the sum of three individual demands' });
      let acc = 0;
      ECON.incomes.forEach((m, i) => {
        acc += m;
        const a = acc;
        p.fn((x) => (0.5 * a) / x, (0.5 * a) / 6, 24, i === 2 ? 'k thick' : 'k thin');
      });
      p.line(0, 2, 24, 2, 'oc thin');
      ECON.incomes.reduce((a, m, i) => {
        p.dot(a + ECON.xi(m, 2), 2, ['cb', 'ol', 'md'][i] === 'md' ? 'k' : ['cb', 'ol', 'k'][i]);
        return a + ECON.xi(m, 2);
      }, 0);
      p.note(0.4, 5.6, 'at each price, add the quantities: X(p) = Σ x_i(p)');
    },
  },
  intertemporal: {
    no: 'M5', title: 'Choice over time', src: 'Micro 5',
    draw(host) {
      const r = 0.25;
      const m1 = 6;
      const m2 = 4.5;
      const c1 = (m1 + m2 / (1 + r)) / 2;
      const c2 = (1 + r) * c1;
      const p = plot(host, { x: [0, 12], y: [0, 14], xl: 'c_1', yl: 'c_2', alt: 'Two-period consumption choice' });
      p.fn((x) => (1 + r) * (m1 - x) + m2, 0, m1 + m2 / (1 + r), 'md thick');
      p.fn((x) => (c1 * c2) / x, 1.6, 12, 'cb thick');
      p.dot(m1, m2, 'k');
      p.label(m1 + 0.2, m2 + 0.5, 'endowment');
      p.dot(c1, c2, 'oc');
      p.guide(c1, c2, c1, 0);
      p.note(c1 + 0.3, c2 + 0.6, 'u′(c₁) = β(1 + r) u′(c₂)', { cls: 'oc' });
      p.note(0.4, 13.2, `slope −(1 + r), r = ${r}; saving = ${(m1 - c1).toFixed(1)}`);
    },
  },
  isoquant: {
    no: 'M7', title: 'The cheapest way to produce', src: 'Micro 7',
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'L', yl: 'K', alt: 'Isoquants and an isocost line' });
      [3, 4, 5].forEach((q, i) => p.fn((L) => (q * q) / L, (q * q) / 10, 10, i === 1 ? 'cb thick' : 'cb'));
      p.fn((L) => 8 - L, 0, 8, 'md thick');
      p.line(0, 0, 10, 10, 'oc');
      p.dot(4, 4, 'k');
      p.note(4.3, 3.6, 'MRTS = w/r');
      p.note(6.6, 9.3, 'expansion path', { cls: 'oc' });
    },
  },
  cost: { no: 'M7′', title: 'Short-run costs for one plant', src: 'Micro 7', draw: svgPart('cost') },
  envelope: {
    no: 'M7″', title: 'Plants of every size, and their envelope', src: 'Micro 7–8',
    draw(host, s = {}) {
      const p = plot(host, { x: [0, 12], y: [0, 6], xl: 'Q', yl: 'average cost', alt: 'Short-run average cost curves and the long-run envelope' });
      ECON.plants.forEach((qk) => p.fn((q) => ECON.sratc(q, qk), Math.max(0.2, qk - 3.4), Math.min(12, qk + 3.4), 'cb'));
      if ((s.k ?? 1) > 0.5) p.fn(ECON.lrac, 0, 12, 'oc thick');
      ECON.plants.forEach((qk) => p.dot(qk, ECON.lrac(qk), 'oc'));
      p.guide(6, 2, 6, 0);
      p.label(6.2, 1.55, 'min LRAC');
      p.note(0.4, 5.6, 'economies of scale ← → diseconomies');
      p.note(0.4, 5.0, 'each plant touches the envelope once, at its minimum only at the bottom', { cls: 'oc' });
    },
  },
  supply: {
    no: 'M8', title: 'A firm’s supply: MC above AVC', src: 'Micro 8',
    draw(host) {
      const p = plot(host, { x: [0, 6], y: [0, 8], xl: 'q', yl: 'P', alt: 'Marginal and average cost; the supply curve' });
      p.fn(ECON.atc, 0.4, 6, 'cb');
      p.fn(ECON.avc, 0, 6, 'ol');
      p.fn(ECON.mc, 0.5, 6, 'md');
      p.fn(ECON.mc, 8 / 3, 6, 'md thick');
      p.dot(8 / 3, ECON.avc(8 / 3), 'k');
      p.label(8 / 3 + 0.1, ECON.avc(8 / 3) - 0.5, 'shut down below');
      p.label(5.8, ECON.atc(5.8) + 0.3, 'ATC', { roman: true, anchor: 'end', cls: 'cb' });
      p.label(5.8, ECON.avc(5.8) - 0.5, 'AVC', { roman: true, anchor: 'end', cls: 'ol' });
      p.label(5.2, 7.6, 'supply = MC', { roman: true, anchor: 'end', cls: 'md' });
    },
  },
  longrun: {
    no: 'M8′', title: 'Entry until price is the minimum of cost', src: 'Micro 8',
    draw(host, s = {}) {
      const N = s.n ?? 3;
      const p = plot(host, { x: [0, 60], y: [0, 8], xl: 'Q', yl: 'P', alt: 'Short-run industry supply shifting as firms enter' });
      p.fn((q) => (60 - q) / 8, 0, 60, 'cb thick');
      p.fn((q) => 2 + (q / N - 6) / 2, 6 * N - 0.1, 60, 'md thick');
      p.line(0, 2, 60, 2, 'oc');
      const P = (60 - 2 * N) / (2 * N + 8);
      p.dot(60 - 8 * P, P, 'k');
      p.label(59, 2.3, 'long-run supply: P = min LRAC', { anchor: 'end', cls: 'oc' });
      p.note(0.8, 7.6, `${N.toFixed(1)} firms, P = ${P.toFixed(2)}${P > 2.02 ? ': profits attract entry' : ''}`);
    },
  },
  monopoly: { no: 'M9', title: 'One seller', src: 'Micro 9', draw: svgPart('monopoly') },
  cournot: { no: 'M10', title: 'Two sellers', src: 'Micro 10', draw: svgPart('cournot') },
  nfirms: {
    no: 'M10′', title: 'From one seller to many', src: 'Micro 8–10',
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 8], xl: 'n firms', yl: 'P', alt: 'Cournot price falls toward marginal cost as firms are added' });
      p.line(0, 2, 12, 2, 'md');
      p.fn(ECON.cournotP, 1, 12, 'cb');
      for (let n = 1; n <= 12; n++) p.dot(n, ECON.cournotP(n), n === 1 ? 'k' : 'cb');
      p.label(1.25, ECON.cournotP(1) + 0.2, 'monopoly');
      p.label(2.2, ECON.cournotP(2) + 0.2, 'duopoly');
      p.label(11.8, 2.35, 'P = MC: perfect competition', { anchor: 'end', cls: 'md' });
      p.note(4, 6.8, 'P = (a + n c) / (n + 1)');
    },
  },
  edgeworth: { no: 'M11', title: 'All markets at once', src: 'Micro 11', draw: svgPart('edgeworth') },
  labor: {
    no: 'X2', title: 'The labor market: firms meet households', src: 'Macro 2',
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'L', yl: 'w', alt: 'Labor demand from firms and labor supply from households' });
      const wd = (L) => 2 + 16 / (L + 1);
      const ws = (L) => 0.9 * L;
      let L = 4;
      for (let i = 0; i < 40; i++) L -= (wd(L) - ws(L)) / (-16 / (L + 1) ** 2 - 0.9);
      p.fn(wd, 0, 10, 'cb thick');
      p.fn(ws, 0, 10, 'md thick');
      p.dot(L, ws(L), 'k');
      p.label(9.6, wd(9.6) + 0.4, 'MPL: firms (Micro 7)', { anchor: 'end', cls: 'cb' });
      p.label(9.6, ws(9.6) - 0.8, 'households (Micro 3)', { anchor: 'end', cls: 'md' });
      p.note(0.4, 9.4, 'flexible wages: employment and output are pinned down');
    },
  },
  loanable: {
    no: 'X2′', title: 'Saving meets investment', src: 'Macro 2',
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'S, I', yl: 'r', alt: 'Loanable funds' });
      p.param((r) => [2 + 0.6 * r, r], 0, 10, 'md thick');
      p.param((r) => [8 - 0.8 * r, r], 0, 10, 'cb thick');
      const r = 6 / 1.4;
      p.dot(2 + 0.6 * r, r, 'k');
      p.label(8.6, 9.2, 'S(r): Euler (Micro 5)', { anchor: 'end', cls: 'md' });
      p.label(8.6, 0.8, 'I(r): MPK = r + δ (Micro 7)', { anchor: 'end', cls: 'cb' });
    },
  },
  solow: { no: 'X3', title: 'Capital accumulates', src: 'Macro 3', draw: svgPart('solow') },
  cross: {
    no: 'X8', title: 'The goods market at one interest rate', src: 'Macro 8',
    draw(host, s = {}) {
      const r0 = s.r ?? 2;
      const p = plot(host, { x: [0, 14], y: [0, 14], xl: 'Y', yl: 'AE', alt: 'Keynesian cross' });
      p.line(0, 0, 14, 14, 'k thin');
      [1, 2, 3, 4].forEach((r) => p.fn((Y) => ECON.ae(Y, r), 0, 14, r === Math.round(r0) ? 'cb thick' : 'cb'));
      [1, 2, 3, 4].forEach((r) => p.dot(ECON.yIS(r), ECON.yIS(r), r === Math.round(r0) ? 'oc' : 'k'));
      p.note(0.4, 13.2, 'AE = C(Y) + I(r) + G;  C from Micro 5, I from Micro 7');
      p.note(0.4, 12.4, 'a higher r lowers I: the line drops, Y falls');
    },
  },
  is: {
    no: 'X8′', title: 'IS: every goods-market equilibrium', src: 'Macro 8',
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'Y', yl: 'r', alt: 'IS curve traced from Keynesian crosses' });
      p.fn((Y) => (12 - Y) * 0.75, 0, 12, 'cb thick');
      [1, 2, 3, 4].forEach((r) => p.dot(ECON.yIS(r), r, 'oc'));
      p.label(11.6, 0.6, 'IS', { roman: true, anchor: 'end', cls: 'cb' });
    },
  },
  money: {
    no: 'X6', title: 'The money market at one income', src: 'Macro 6',
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'M/P', yl: 'r', alt: 'Money demand and supply' });
      p.line(6, 0, 6, 10, 'md thick');
      [7, 9, 11].forEach((Y) => p.fn((m) => 0.9 * Y - m, 0, 12, Y === 9 ? 'cb thick' : 'cb'));
      [7, 9, 11].forEach((Y) => p.dot(6, ECON.rLM(Y), 'oc'));
      p.note(6.3, 9.3, 'supply M/P', { cls: 'md' });
      p.note(0.4, 1, 'demand L(r, Y) shifts out as income rises', { cls: 'cb' });
    },
  },
  lm: {
    no: 'X6′', title: 'LM: every money-market equilibrium', src: 'Macro 6',
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'Y', yl: 'r', alt: 'LM curve traced from money markets' });
      p.fn((Y) => ECON.rLM(Y), 0, 12, 'md thick');
      [7, 9, 11].forEach((Y) => p.dot(Y, ECON.rLM(Y), 'oc'));
      p.label(11.6, ECON.rLM(11.6) - 0.9, 'LM', { roman: true, anchor: 'end', cls: 'md' });
    },
  },
  islm: { no: 'X8″', title: 'IS–LM', src: 'Macro 8', draw: svgPart('islm') },
  adas: { no: 'X9', title: 'AD–AS', src: 'Macro 9', draw: svgPart('adas') },
  phillips: { no: 'X10', title: 'Phillips curves', src: 'Macro 10', draw: svgPart('phillips') },
  mf: {
    no: 'X13', title: 'The open economy: a world interest rate', src: 'Macro 13',
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'Y', yl: 'r', alt: 'IS, LM and the world interest rate' });
      p.fn((Y) => 9 - 0.75 * Y, 0, 12, 'cb thick');
      p.fn((Y) => 0.9 * Y - 6, 0, 12, 'md thick');
      p.line(0, 2.18, 12, 2.18, 'oc thick');
      p.label(11.6, 2.5, 'r = r*: capital moves freely', { anchor: 'end', cls: 'oc' });
      p.note(0.4, 9.3, 'fix the exchange rate and LM must follow; float it and IS moves with NX');
    },
  },
  regression: { no: 'E2', title: 'Least squares', src: 'Metrics 2', draw: svgPart('regression') },
};

// Equation cards: a short derivation in the book's type.
export const EQS = {
  'eq-elastic': { no: 'P4', title: 'Why revenue peaks where |ε| = 1', src: 'Principles 4 · Math 2', html: 'R = P·Q(P)<br>dR/dP = Q (1 + ε)<br><span class="em">dR/dP = 0 ⇔ ε = −1</span>' },
  'eq-surplus': { no: 'P5', title: 'Surplus is a sum over people', src: 'Principles 5', html: 'CS = Σ<sub>buyers</sub> (wtp<sub>i</sub> − p<sub>b</sub>)<br>PS = Σ<sub>sellers</sub> (p<sub>s</sub> − c<sub>i</sub>)<br><span class="em">DWL = Σ<sub>lost trades</sub> (wtp<sub>i</sub> − c<sub>i</sub>)</span>' },
  'eq-lagrange': { no: 'X5', title: 'The tangency, as a rule', src: 'Math 5', html: 'max f(x) s.t. g(x) = c<br>∇f = λ ∇g<br><span class="em">λ = dV/dc: a shadow price</span>' },
  'eq-slutsky': { no: 'M3', title: 'A price change, taken apart', src: 'Micro 3', html: '∂x/∂p = ∂h/∂p − x ∂x/∂m<br><span class="em">substitution + income</span>' },
  'eq-envelope': { no: 'M7', title: 'The envelope', src: 'Micro 7 · Math 6', html: 'LRAC(Q) = min<sub>K</sub> SRATC(Q; K)<br>∂SRATC/∂K = 0 at the tangency<br><span class="em">free entry: P = min LRAC</span>' },
  'eq-monopoly': { no: 'M9', title: 'The top of the profit hill', src: 'Micro 9', html: 'π(Q) = P(Q)Q − C(Q)<br>π′(Q) = 0 ⇔ MR = MC<br><span class="em">(P − MC)/P = 1/|ε|</span>' },
  'eq-welfare': { no: 'M11', title: 'The two welfare theorems', src: 'Micro 11', html: 'Walrasian equilibrium ⇒ Pareto efficient<br>Pareto efficient ⇒ equilibrium after transfers<br><span class="em">MRS<sub>A</sub> = MRS<sub>B</sub> = p<sub>x</sub>/p<sub>y</sub></span>' },
  'eq-euler': { no: 'M5', title: 'The Euler equation', src: 'Micro 5 → Macro 5', html: 'u′(c<sub>t</sub>) = β(1 + r) E u′(c<sub>t+1</sub>)<br><span class="em">reused: IS curve, asset prices, the current account</span>' },
  'eq-aggregate': { no: 'X1', title: 'From many households to one', src: 'Micro 4 → Macro', html: 'C = Σ<sub>i</sub> c<sub>i</sub>(y<sub>i</sub>, r)<br>one consumption function only if Engel curves are linear and parallel (Gorman)' },
  'eq-ad': { no: 'X9', title: 'Where AD and AS come from', src: 'Macro 9', html: 'AD: (Y, P) with IS = LM at M/P<br>AS: the labor market with sticky wages<br><span class="em">vertical in the long run: Macro 2</span>' },
  'eq-nk': { no: 'X11', title: 'The three-equation model', src: 'Macro 11', html: 'x<sub>t</sub> = E x<sub>t+1</sub> − σ(i<sub>t</sub> − Eπ<sub>t+1</sub> − r*) <span class="from">← Micro 5, Euler</span><br>π<sub>t</sub> = β Eπ<sub>t+1</sub> + κ x<sub>t</sub> <span class="from">← Micro 9, markup pricing</span><br>i<sub>t</sub> = r* + π<sub>t</sub> + φ(π<sub>t</sub> − π*) <span class="from">← Macro 11, a rule</span>' },
  'eq-trilemma': { no: 'X13', title: 'The trilemma', src: 'Macro 13', html: 'i = i* + E[Δe]<br>fixed e and free capital ⇒ i = i*<br><span class="em">pick two of three</span>' },
  'eq-ols': { no: 'E3', title: 'Least squares as a projection', src: 'Metrics 3 · Math 7', html: 'β̂ = (XᵀX)<sup>−1</sup>Xᵀy<br>E[b<sub>1</sub>] = β<sub>1</sub> + β<sub>2</sub>δ<br><span class="em">the omitted x₂ biases the slope</span>' },
  'eq-iv': { no: 'E8', title: 'An instrument', src: 'Metrics 8', html: 'β = Cov(z, y) / Cov(z, x)<br><span class="em">z moves x, and reaches y only through x</span>' },
};

// The card around a part: a title block like a drawing sheet.
export function cardHTML(id) {
  const P = PARTS[id] ?? EQS[id];
  return `<div class="card-head"><span class="card-no">${P.no}</span><span class="card-title">${P.title}</span><span class="card-src">${P.src}</span></div><div class="card-body${EQS[id] ? ' eqs' : ''}"></div>`;
}

export function drawCard(host, id, s, ctx) {
  if (!host.firstChild) host.innerHTML = cardHTML(id);
  const body = host.querySelector('.card-body');
  body.replaceChildren();
  if (EQS[id]) body.innerHTML = `<p>${EQS[id].html}</p>`;
  else PARTS[id].draw(body, s, ctx);
}

export const isEq = (id) => Boolean(EQS[id]);
export { clamp };
