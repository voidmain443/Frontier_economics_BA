// Textbook diagrams (SVG) and the 3D "unfold" spec for each.
// A figure's 2D drawing and its 3D construct share one data domain, so the
// construct rises exactly out of the drawn curves.

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// "q_1", "p_{x}", "x^2" → text with sub/superscripts
function rich(textEl, s) {
  const re = /([_^])(\{[^}]*\}|.)/g;
  let last = 0;
  let m;
  while ((m = re.exec(s))) {
    if (m.index > last) textEl.appendChild(document.createTextNode(s.slice(last, m.index)));
    const body = m[2].startsWith('{') ? m[2].slice(1, -1) : m[2];
    const t = el('tspan', { 'font-size': '0.68em', dy: m[1] === '_' ? '0.32em' : '-0.5em' }, textEl);
    t.textContent = body;
    el('tspan', { dy: m[1] === '_' ? '-0.32em' : '0.5em', 'font-size': '1em' }, textEl).textContent = ' ';
    last = re.lastIndex;
  }
  if (last < s.length) textEl.appendChild(document.createTextNode(s.slice(last)));
}

let uid = 0;

export function plot(host, o) {
  const W = o.w ?? 640;
  const H = o.h ?? 420;
  const P = { l: 58, r: 34, t: 26, b: 50, ...(o.pad ?? {}) };
  const [x0, x1] = o.x;
  const [y0, y1] = o.y;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot', role: 'img', 'aria-label': o.alt ?? '' });
  const id = `ah${uid++}`;
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0,1 L10,5 L0,9 z', class: 'ahead' }, mk);

  const X = (v) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v) => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
  el('rect', { class: 'plotbox', x: P.l, y: P.t, width: W - P.l - P.r, height: H - P.t - P.b, fill: 'none', stroke: 'none' }, svg);
  const layers = { fill: el('g', {}, svg), guide: el('g', {}, svg), curve: el('g', {}, svg), mark: el('g', {}, svg), text: el('g', {}, svg) };

  const d = (pts) => 'M' + pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join('L');
  const inY = (y) => y >= y0 - 1e-9 && y <= y1 + 1e-9;

  const api = {
    svg, X, Y,
    pathPts(pts, cls = 'k') {
      return el('path', { d: d(pts), class: `ln ${cls}` }, layers.curve);
    },
    fn(f, a, b, cls = 'k', n = 180) {
      let run = [];
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        const y = f(x);
        if (Number.isFinite(y) && inY(y)) run.push([x, y]);
        else if (run.length > 1) { api.pathPts(run, cls); run = []; } else run = [];
      }
      if (run.length > 1) api.pathPts(run, cls);
    },
    param(f, a, b, cls = 'k', n = 180) {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(f(a + ((b - a) * i) / n));
      return api.pathPts(pts.filter(([x, y]) => x >= x0 - 1e-9 && x <= x1 + 1e-9 && inY(y)), cls);
    },
    line(xa, ya, xb, yb, cls = 'k') {
      return el('line', { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), class: `ln ${cls}` }, layers.curve);
    },
    guide(xa, ya, xb, yb) {
      return el('line', { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), class: 'ln guide' }, layers.guide);
    },
    area(pts, cls) {
      return el('path', { d: d(pts) + 'Z', class: `area ${cls}` }, layers.fill);
    },
    arrow(xa, ya, xb, yb, cls = 'k') {
      return el('line', { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), class: `ln arr ${cls}`, 'marker-end': `url(#${id})` }, layers.mark);
    },
    dot(x, y, cls = 'k', r = 4) {
      return el('circle', { cx: X(x), cy: Y(y), r, class: `dot ${cls}` }, layers.mark);
    },
    ring(x, y, cls = 'k', r = 4.5) {
      return el('circle', { cx: X(x), cy: Y(y), r, class: `ring ${cls}` }, layers.mark);
    },
    label(x, y, s, { cls = '', dx = 0, dy = 0, anchor = 'start', roman = false } = {}) {
      const t = el('text', { x: X(x) + dx, y: Y(y) + dy, 'text-anchor': anchor, class: `lb ${roman ? 'rm' : 'it'} ${cls}` }, layers.text);
      rich(t, s);
      return t;
    },
    note(x, y, s, opts = {}) {
      return api.label(x, y, s, { ...opts, roman: true, cls: `note ${opts.cls ?? ''}` });
    },
  };

  if (o.axes !== false) {
    el('line', { x1: X(x0), y1: Y(y0), x2: X(x1) + 14, y2: Y(y0), class: 'ln axis', 'marker-end': `url(#${id})` }, layers.curve);
    el('line', { x1: X(x0), y1: Y(y0), x2: X(x0), y2: Y(y1) - 14, class: 'ln axis', 'marker-end': `url(#${id})` }, layers.curve);
    if (o.xl) api.label(x1, y0, o.xl, { dx: 6, dy: 28, anchor: 'end' });
    if (o.yl) api.label(x0, y1, o.yl, { dx: -14, dy: -6, anchor: 'end' });
    if (o.zero !== false) el('text', { x: X(x0) - 10, y: Y(y0) + 18, class: 'lb it', 'text-anchor': 'end' }, layers.text).textContent = '0';
  }
  host.appendChild(svg);
  return api;
}

// A free-form diagram (no axes) whose plot box is the whole drawing.
function canvas(host, w, h, alt) {
  return plot(host, { w, h, x: [0, w], y: [h, 0], axes: false, alt, pad: { l: 0, r: 0, t: 0, b: 0 } });
}

// ---------- the diagrams ----------

const cd = (x, y) => Math.sqrt(Math.max(x, 0) * Math.max(y, 0));

export const FIGURES = {
  // Hero: the sequence as a staircase, drawn like a section through a building.
  stairs: {
    draw(host) {
      const W = 980;
      const H = 380;
      const p = canvas(host, W, H, 'The undergraduate sequence drawn as a staircase of six courses.');
      const steps = [
        ['Principles', 'scarcity, prices, the circular flow'],
        ['Mathematics', 'optimization, matrices, dynamics'],
        ['Microeconomics', 'choice, firms, markets, failure'],
        ['Macroeconomics', 'aggregates, time, policy'],
        ['Econometrics', 'measurement, causality'],
        ['Field courses', 'money, trade, labor, public, IO'],
      ];
      const sw = 150;
      const sh = 46;
      const bx = 40;
      const by = 340;
      const prof = [[bx, by]];
      steps.forEach((_, i) => {
        prof.push([bx + i * sw, by - (i + 1) * sh]);
        prof.push([bx + (i + 1) * sw, by - (i + 1) * sh]);
      });
      prof.push([bx + steps.length * sw, by]);
      p.area(prof.map(([x, y]) => [x, y]), 'f-hatch');
      p.pathPts(prof, 'k thick');
      steps.forEach(([name, what], i) => {
        const x = bx + i * sw;
        const y = by - (i + 1) * sh;
        p.label(x + 8, y - 30, name, { roman: true, cls: 'step' });
        p.note(x + 8, y - 12, what, { cls: 'stepnote' });
        p.label(x + sw / 2, by + 26, String(i + 1), { roman: true, anchor: 'middle', cls: 'stepno' });
      });
      // dimension line: "each step keeps the last one"
      p.arrow(bx + 6 * sw + 34, by, bx + 6 * sw + 34, by - 6 * sh, 'thin');
      p.note(bx + 6 * sw + 44, by - 3 * sh, 'each course keeps', { cls: 'dimnote' });
      p.note(bx + 6 * sw + 44, by - 3 * sh + 17, 'the one below', { cls: 'dimnote' });
      return {};
    },
  },

  ppf: {
    dom: { x: [0, 10], y: [0, 10] },
    axes: ['x', 'y'],
    draw(host) {
      const f = (x) => 9 * Math.sqrt(Math.max(0, 1 - (x / 8.6) ** 2));
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'good x', yl: 'good y', alt: 'Production possibilities frontier' });
      p.area([[0, 0], ...Array.from({ length: 60 }, (_, i) => [(8.6 * i) / 59, f((8.6 * i) / 59)]), [8.6, 0]], 'f-olive');
      p.fn(f, 0, 8.6, 'cb thick');
      const ax = 5.2;
      const ay = f(ax);
      const slope = (-9 * (ax / 8.6 ** 2)) / Math.sqrt(1 - (ax / 8.6) ** 2);
      p.line(ax - 2.4, ay - 2.4 * slope, ax + 2.4, ay + 2.4 * slope, 'oc dash');
      p.dot(ax, ay, 'cb');
      p.label(ax + 0.2, ay + 0.25, 'A');
      p.dot(3.2, 4.2, 'k');
      p.label(3.4, 4.0, 'B');
      p.ring(7.2, 7.4, 'md');
      p.label(7.45, 7.3, 'C');
      p.note(3.4, 3.1, 'inside: resources idle');
      p.note(7.45, 6.55, 'outside: unattainable');
      p.note(ax + 2.5, ay + 2.4 * slope - 0.2, 'slope = opportunity cost', { cls: 'oc' });
      return {};
    },
  },

  flow: {
    dom: { x: [0, 640], y: [400, 0] },
    expo: () => ({
      agents: [
        { name: 'Households', at: [89, 200, 0.22], first: true },
        { name: 'Firms', at: [551, 200, 0.22], first: true },
      ],
      flows: [
        { pts: [[60, 150, 0.2], [70, 40, 0.3], [320, 40, 0.34], [570, 40, 0.3], [580, 150, 0.2]], c: 'cobalt', n: 28, speed: 0.12 },
        { pts: [[580, 250, 0.2], [570, 364, 0.3], [320, 364, 0.34], [70, 364, 0.3], [60, 250, 0.2]], c: 'cobalt', n: 28, speed: 0.12 },
        { pts: [[540, 150, 0.16], [530, 72, 0.22], [320, 72, 0.25], [120, 72, 0.22], [110, 150, 0.16]], c: 'madder', n: 22, speed: 0.1 },
        { pts: [[154, 220, 0.16], [180, 330, 0.22], [320, 330, 0.25], [462, 330, 0.22], [486, 220, 0.16]], c: 'madder', n: 22, speed: 0.1 },
      ],
      eqs: [{ html: 'spending = income = output', at: [320, 190, 0.5] }],
      tags: [{ text: 'money flows one way, goods and labor the other', at: [320, 150, 0.06], c: 'chalk' }],
      axes: [],
    }),
    draw(host) {
      const W = 640;
      const H = 400;
      const p = canvas(host, W, H, 'The circular flow between households and firms');
      const box = (x, y, w, h, title, sub) => {
        p.area([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], 'f-paper');
        p.pathPts([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], 'k');
        p.label(x + w / 2, y + h / 2 - 2, title, { roman: true, anchor: 'middle', cls: 'boxt' });
        if (sub) p.note(x + w / 2, y + h / 2 + 16, sub, { anchor: 'middle' });
      };
      box(24, 150, 130, 100, 'Households', 'own labor, capital');
      box(486, 150, 130, 100, 'Firms', 'own technology');
      box(250, 26, 140, 70, 'Goods market', '');
      box(250, 304, 140, 70, 'Factor market', '');
      const arc = (pts, cls) => p.pathPts(pts, cls);
      // real flows (inner): goods to households, labor to firms
      arc([[250, 72], [120, 72], [110, 150]], 'md');
      p.arrow(112, 128, 110, 150, 'md');
      arc([[154, 220], [180, 330], [250, 330]], 'md');
      p.arrow(232, 330, 250, 330, 'md');
      arc([[390, 330], [462, 330], [486, 220]], 'md');
      p.arrow(480, 236, 486, 220, 'md');
      arc([[540, 150], [530, 72], [390, 72]], 'md');
      p.arrow(410, 72, 390, 72, 'md');
      // money flows (outer): spending to firms, income to households
      arc([[60, 150], [70, 40], [250, 40]], 'cb');
      p.arrow(232, 40, 250, 40, 'cb');
      arc([[390, 40], [570, 40], [580, 150]], 'cb');
      p.arrow(579, 132, 580, 150, 'cb');
      arc([[580, 250], [570, 364], [390, 364]], 'cb');
      p.arrow(408, 364, 390, 364, 'cb');
      arc([[250, 364], [70, 364], [60, 250]], 'cb');
      p.arrow(61, 268, 60, 250, 'cb');
      p.note(320, 132, 'goods and services', { anchor: 'middle', cls: 'md' });
      p.note(320, 15, 'spending  =  revenue', { anchor: 'middle', cls: 'cb' });
      p.note(320, 292, 'labor, land, capital', { anchor: 'middle', cls: 'md' });
      p.note(320, 392, 'wages, rent, profit  =  income', { anchor: 'middle', cls: 'cb' });
      return {};
    },
  },

  sd: {
    dom: { x: [0, 12], y: [0, 12] },
    axes: ['Q', 'P'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Supply and demand with a demand shift' });
      p.area([[0, 10], [0, 5.5], [4.5, 5.5]], 'f-cobalt');
      p.area([[0, 1], [0, 5.5], [4.5, 5.5]], 'f-madder');
      p.fn((q) => 10 - q, 0, 10, 'cb thick');
      p.fn((q) => 12 - q, 0, 12, 'cb dash');
      p.fn((q) => 1 + q, 0, 11, 'md thick');
      p.arrow(7.2, 2.8, 8.6, 3.4, 'cb thin');
      p.guide(4.5, 5.5, 4.5, 0);
      p.guide(4.5, 5.5, 0, 5.5);
      p.guide(5.5, 6.5, 5.5, 0);
      p.guide(5.5, 6.5, 0, 6.5);
      p.dot(4.5, 5.5, 'k');
      p.dot(5.5, 6.5, 'k');
      p.label(4.25, 5.0, 'E', { anchor: 'end' });
      p.label(5.75, 6.15, 'E′');
      p.label(9.4, 0.95, 'D');
      p.label(11.3, 1.0, 'D′');
      p.label(10.6, 11.2, 'S');
      p.note(0.4, 7.1, 'consumer surplus', { cls: 'cb' });
      p.note(0.4, 3.9, 'producer surplus', { cls: 'md' });
      return {};
    },
    expo: (S) => {
      const lift = (I) => (I - 1) * 0.9;
      return {
        surfaces: [
          { param: (u, v) => [10 * v - u, u, lift(v)], u: (v) => [Math.max(0, 10 * v - 12), 10 * v], v: [1, 1.5], c: 'cobalt', contour: (u, v) => v * 10, freq: 1 },
          { param: (u, v) => [u - 1, u, v * 0.45], u: [1, 12], v: [0, 1], c: 'madder', alpha: 0.5, contour: (u) => u, freq: 1 },
        ],
        curves: [
          { param: (q) => [q, 12 - q, lift(1.2)], t: [0, 12], c: 'cobalt', w: 2.6 },
          { param: (I) => { const P = (10 * I + 1) / 2; return [P - 1, P, lift(I)]; }, t: [1, 1.5], c: 'ochre', w: 3 },
        ],
        eqs: [
          { html: 'Q<sub>d</sub> = D(P, I)', at: [9, 4, 0.5] },
          { html: '∂P*/∂I = D<sub>I</sub> / (S<sub>P</sub> − D<sub>P</sub>)', at: [2, 11, 0.36] },
        ],
        tags: [
          { text: 'the shift is a lift: D′ sits higher on the surface', at: [11.5, 0.5, 0.2], c: 'cobalt' },
          { text: 'income', at: [0.3, 0.3, 0.48], c: 'chalk' },
        ],
        axes: ['I'],
      };
    },
  },

  optim: {
    dom: { x: [0, 10], y: [0, 10] },
    axes: ['x', 'y', 'f'],
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'x', yl: 'y', alt: 'Contour lines of an objective and a linear constraint' });
      const ell = (r, cls) => p.param((t) => [7 + Math.sqrt(6 * r) * Math.cos(t), 6 + Math.sqrt(10 * r) * Math.sin(t)], 0, Math.PI * 2, cls, 160);
      [0.5, 1.6, 3.2, 5].forEach((r) => ell(r, 'ol'));
      const xs = 5.125;
      const ys = 2.875;
      const fs = 10 - (xs - 7) ** 2 / 6 - (ys - 6) ** 2 / 10;
      ell(10 - fs, 'ol thick');
      p.fn((x) => 8 - x, 0, 8, 'md thick');
      p.dot(7, 6, 'ol');
      p.label(7.2, 6.2, 'max f');
      p.dot(xs, ys, 'k');
      p.label(xs - 0.25, ys - 0.55, 'x*', { anchor: 'end' });
      p.arrow(xs, ys, xs + 0.62 * 1.4, ys + 0.62 * 1.4, 'md');
      p.arrow(xs, ys, xs + 0.625 * 1.5, ys + 0.625 * 1.5 * 0.999, 'ol thin');
      p.label(xs + 1.2, ys + 1.0, '∇f = λ∇g');
      p.label(7.6, 0.6, 'g(x, y) = c', { cls: 'md' });
      return {};
    },
    expo: () => {
      const f = (x, y) => 10 - (x - 7) ** 2 / 6 - (y - 6) ** 2 / 10;
      const h = (x, y) => Math.max(0, f(x, y) - 2) / 8 * 0.55;
      return {
        surfaces: [
          { param: (x, y) => [x, y, h(x, y)], u: [0, 10], v: [0, 10], c: 'olive', contour: (x, y) => f(x, y), freq: 1 },
          { param: (u, v) => [u, 8 - u, v * h(u, 8 - u)], u: [0, 8], v: [0, 1], c: 'madder', alpha: 0.55, contour: (u, v) => v * 4, freq: 1 },
        ],
        curves: [{ param: (u) => [u, 8 - u, h(u, 8 - u)], t: [0, 8], c: 'madder', w: 3 }],
        points: [{ at: [5.125, 2.875, h(5.125, 2.875)], c: 'ochre', size: 11 }, { at: [7, 6, h(7, 6)], c: 'olive', size: 8 }],
        eqs: [
          { html: 'ℒ = f(x, y) + λ(c − g(x, y))', at: [9.5, 9.5, 0.5] },
          { html: '∇f = λ∇g', at: [4.2, 1.2, 0.36] },
        ],
        tags: [{ text: 'the constraint cuts a one-dimensional problem out of the hill', at: [0.3, 9.2, 0.12], c: 'madder' }],
        axes: ['f'],
      };
    },
  },

  consumer: {
    dom: { x: [0, 12], y: [0, 18] },
    axes: ['x', 'y', 'u'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 18], xl: 'x', yl: 'y', alt: 'Budget line and indifference curves' });
      p.area([[0, 0], [0, 16], [8, 0]], 'f-madder');
      p.fn((x) => 16 - 2 * x, 0, 8, 'md thick');
      [16, 32, 56].forEach((u2, i) => p.fn((x) => u2 / x, 0.8, 12, i === 1 ? 'cb thick' : 'cb'));
      p.guide(4, 8, 4, 0);
      p.guide(4, 8, 0, 8);
      p.dot(4, 8, 'k');
      p.label(4.25, 8.6, 'x*');
      p.label(11.2, 16 / 11.2 + 0.7, 'u₁');
      p.label(11.2, 32 / 11.2 + 0.7, 'u₂');
      p.label(11.2, 56 / 11.2 + 0.7, 'u₃');
      p.note(0.5, 3.0, 'affordable', { cls: 'md' });
      p.label(6.2, 4.6, 'p_x x + p_y y = m', { cls: 'md' });
      return {};
    },
    expo: () => {
      const umax = cd(12, 18);
      const h = (x, y) => (cd(x, y) / umax) * 0.55;
      return {
        surfaces: [
          { param: (x, y) => [x, y, h(x, y)], u: [0, 12], v: [0, 18], c: 'cobalt', contour: (x, y) => cd(x, y), freq: 0.5 },
          { param: (u, v) => [u, 16 - 2 * u, v * h(u, 16 - 2 * u)], u: [0, 8], v: [0, 1], c: 'madder', alpha: 0.5, contour: (u, v) => v * 4, freq: 1 },
        ],
        curves: [
          ...[16, 32, 56].map((u2) => ({ param: (x) => [x, u2 / x, h(x, u2 / x)], t: [Math.max(0.8, u2 / 18), 12], c: 'cobalt', w: 2.2 })),
          { param: (u) => [u, 16 - 2 * u, h(u, 16 - 2 * u)], t: [0, 8], c: 'madder', w: 3 },
        ],
        points: [{ at: [4, 8, h(4, 8)], c: 'ochre', size: 11 }],
        eqs: [
          { html: 'max u(x, y)  s.t.  p<sub>x</sub>x + p<sub>y</sub>y = m', at: [11, 17, 0.55] },
          { html: 'MRS = p<sub>x</sub> / p<sub>y</sub>', at: [4.6, 9.4, 0.3] },
        ],
        tags: [{ text: 'indifference curves are contour lines of a utility hill', at: [9, 3.5, 0.3], c: 'cobalt' }],
        axes: ['u'],
      };
    },
  },

  cost: {
    dom: { x: [0, 12], y: [0, 6] },
    axes: ['q', 'C/q'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 6], xl: 'q', yl: 'cost per unit', alt: 'Short-run cost curves' });
      p.fn((q) => 4 / q + q / 4, 0.6, 12, 'cb thick');
      p.fn((q) => q / 4, 0, 12, 'ol');
      p.fn((q) => q / 2, 0, 12, 'md thick');
      p.guide(4, 2, 4, 0);
      p.dot(4, 2, 'k');
      p.label(11.3, 4 / 11.3 + 11.3 / 4 + 0.25, 'ATC', { roman: true, anchor: 'end', cls: 'cb' });
      p.label(11.5, 11.5 / 4 - 0.45, 'AVC', { roman: true, anchor: 'end', cls: 'ol' });
      p.label(10.8, 5.6, 'MC', { roman: true, anchor: 'end', cls: 'md' });
      p.note(4.2, 1.55, 'MC = ATC at the minimum');
      p.note(0.4, 5.6, 'capital fixed at K = 4');
      return {};
    },
    expo: () => {
      const lift = (K) => ((K - 4) / 6) * 0.5;
      return {
        surfaces: [
          {
            param: (u, K) => [u, K / u + u / K, lift(K)],
            u: (K) => [0.172 * K, Math.min(12, 5.83 * K)], v: [4, 10], c: 'cobalt',
            contour: (u, K) => K, freq: 1,
          },
        ],
        curves: [{ param: (K) => [K, 2, lift(K)], t: [4, 10], c: 'ochre', w: 3.2 }],
        eqs: [
          { html: 'C(q, K) = rK + w·L(q, K)', at: [1, 5.6, 0.45] },
          { html: 'LRAC(q) = min<sub>K</sub> ATC(q; K)', at: [9.5, 2.4, 0.42] },
        ],
        tags: [{ text: 'long-run cost is the floor of the short-run surface', at: [6.5, 1.2, 0.22], c: 'ochre' }],
        axes: ['K'],
      };
    },
  },

  monopoly: {
    dom: { x: [0, 12], y: [0, 12] },
    axes: ['Q', 'P'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Monopoly: marginal revenue equals marginal cost' });
      p.area([[0, 6], [4, 6], [4, 2], [0, 2]], 'f-ochre');
      p.area([[4, 6], [8, 2], [4, 2]], 'f-madder');
      p.fn((q) => 10 - q, 0, 10, 'cb thick');
      p.fn((q) => 10 - 2 * q, 0, 5, 'cb dash');
      p.line(0, 2, 12, 2, 'md thick');
      p.guide(4, 6, 4, 0);
      p.dot(4, 6, 'k');
      p.dot(8, 2, 'k');
      p.label(9.4, 1.0, 'D');
      p.label(5.1, 0.6, 'MR', { roman: true });
      p.label(11.6, 2.4, 'MC', { roman: true, anchor: 'end', cls: 'md' });
      p.label(4.2, 6.35, 'monopoly');
      p.label(8.2, 2.5, 'competitive');
      p.note(4.4, 3.4, 'deadweight loss', { cls: 'md' });
      p.note(0.3, 4.2, 'profit', { cls: 'oc' });
      return {};
    },
    expo: () => {
      const pi = (q) => ((8 * q - q * q) / 16) * 0.42;
      return {
        surfaces: [{ param: (q, v) => [q, 0, v * pi(q)], u: [0, 8], v: [0, 1], c: 'ochre', alpha: 0.55, contour: (q, v) => v * 4, freq: 1 }],
        curves: [{ param: (q) => [q, 0, pi(q)], t: [0, 8], c: 'ochre', w: 3 }],
        points: [{ at: [4, 0, pi(4)], c: 'ochre', size: 11 }],
        eqs: [
          { html: 'π(q) = p(q)·q − C(q)', at: [6, 0, 0.5] },
          { html: 'π′(q) = 0  ⇔  MR = MC', at: [1, 9, 0.3] },
        ],
        tags: [{ text: 'profit, standing on the quantity axis, peaks where MR = MC', at: [8.4, 0.6, 0.12], c: 'ochre' }],
        axes: ['π'],
      };
    },
  },

  cournot: {
    dom: { x: [0, 12], y: [0, 12] },
    axes: ['q₁', 'q₂'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'q_1', yl: 'q_2', alt: 'Cournot reaction functions' });
      p.fn((q1) => 12 - 2 * q1, 0, 6, 'cb thick');
      p.fn((q1) => 6 - q1 / 2, 0, 12, 'md thick');
      p.guide(4, 4, 4, 0);
      p.guide(4, 4, 0, 4);
      p.dot(4, 4, 'k');
      p.label(4.3, 4.45, 'Nash equilibrium', { roman: true });
      p.label(1.1, 10.6, 'R_1(q_2)', { cls: 'cb' });
      p.label(10.2, 1.4, 'R_2(q_1)', { cls: 'md' });
      p.note(6.4, 9.4, 'each curve: one firm’s best reply');
      return {};
    },
    expo: () => {
      const h = (q1, q2) => Math.max(0, (q1 * (12 - q1 - q2)) / 36) * 0.45;
      return {
        surfaces: [{ param: (q1, q2) => [q1, q2, h(q1, q2)], u: [0, 12], v: [0, 12], c: 'cobalt', contour: (q1, q2) => q1 * (12 - q1 - q2), freq: 0.2 }],
        curves: [{ param: (q2) => [6 - q2 / 2, q2, h(6 - q2 / 2, q2)], t: [0, 12], c: 'cobalt', w: 3 }],
        points: [{ at: [4, 4, h(4, 4)], c: 'ochre', size: 11 }],
        eqs: [{ html: 'q<sub>1</sub>* = argmax π<sub>1</sub>(q<sub>1</sub>, q<sub>2</sub>)', at: [10, 11, 0.4] }],
        tags: [{ text: 'firm 1’s profit hill: the reaction curve is its ridge', at: [6.5, 7.5, 0.25], c: 'cobalt' }],
        axes: ['π₁'],
      };
    },
  },

  edgeworth: {
    dom: { x: [0, 10], y: [0, 10] },
    axes: ['x_A', 'y_A'],
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [0, 10], xl: 'x_A', yl: 'y_A', alt: 'Edgeworth box with the contract curve' });
      p.pathPts([[0, 10], [10, 10], [10, 0]], 'k');
      const lens = [];
      for (let i = 0; i <= 40; i++) { const x = 2 + (6 * i) / 40; lens.push([x, 16 / x]); }
      for (let i = 40; i >= 0; i--) { const x = 2 + (6 * i) / 40; lens.push([x, 10 - 16 / (10 - x)]); }
      p.area(lens.filter(([, y]) => y >= 0 && y <= 10), 'f-ochre');
      p.line(0, 0, 10, 10, 'oc thick');
      p.fn((x) => 25 / x, 2.5, 10, 'cb');
      p.fn((x) => 10 - 25 / (10 - x), 0, 7.5, 'md');
      p.fn((x) => 16 / x, 1.6, 10, 'cb dash');
      p.fn((x) => 10 - 16 / (10 - x), 0, 8.4, 'md dash');
      p.line(8, 2, 2, 8, 'k thin');
      p.dot(8, 2, 'k');
      p.dot(5, 5, 'oc');
      p.label(8.2, 1.6, 'ω (endowment)');
      p.label(5.25, 4.8, 'E');
      p.label(0.25, 0.4, 'A', { roman: true, cls: 'cb' });
      p.label(9.7, 9.5, 'B', { roman: true, anchor: 'end', cls: 'md' });
      p.note(6.6, 7.4, 'contract curve', { cls: 'oc' });
      return {};
    },
    expo: () => {
      const hA = (x, y) => (cd(x, y) / 10) * 0.42;
      const hB = (x, y) => (cd(10 - x, 10 - y) / 10) * 0.42;
      return {
        surfaces: [
          { param: (x, y) => [x, y, hA(x, y)], u: [0, 10], v: [0, 10], c: 'cobalt', contour: (x, y) => cd(x, y), freq: 1 },
          { param: (x, y) => [x, y, hB(x, y)], u: [0, 10], v: [0, 10], c: 'madder', alpha: 0.7, contour: (x, y) => cd(10 - x, 10 - y), freq: 1 },
        ],
        curves: [
          { param: (t) => [t, t, hA(t, t)], t: [0, 10], c: 'ochre', w: 3 },
          { param: (t) => [t, t, hB(t, t)], t: [0, 10], c: 'ochre', w: 3 },
          { param: (t) => [t, t, 0], t: [0, 10], c: 'ochre', w: 2, dash: true },
        ],
        eqs: [{ html: 'MRS<sub>A</sub> = MRS<sub>B</sub>', at: [5, 5, 0.5] }],
        tags: [{ text: 'two utility hills, one from each corner', at: [1, 9, 0.3], c: 'chalk' }],
        axes: ['u_A', 'u_B'],
      };
    },
  },

  externality: {
    dom: { x: [0, 12], y: [0, 12] },
    axes: ['Q', 'P'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'Q', yl: 'P', alt: 'Negative externality' });
      const qm = 20 / 3;
      const qs = 14 / 3;
      p.area([[qs, 11 - qs], [qm, 4 + qm / 2], [qm, 11 - qm]], 'f-madder');
      p.fn((q) => 11 - q, 0, 11, 'cb thick');
      p.fn((q) => 1 + q / 2, 0, 12, 'md thick');
      p.fn((q) => 4 + q / 2, 0, 12, 'md dash');
      p.arrow(9.5, 1 + 9.5 / 2, 9.5, 4 + 9.5 / 2, 'oc thin');
      p.guide(qm, 11 - qm, qm, 0);
      p.guide(qs, 11 - qs, qs, 0);
      p.dot(qm, 11 - qm, 'k');
      p.dot(qs, 11 - qs, 'k');
      p.label(qm + 0.2, 0.5, 'market');
      p.label(qs - 0.2, 0.5, 'efficient', { anchor: 'end' });
      p.label(10.6, 0.9, 'D = MB');
      p.label(11.8, 7.3, 'MPC', { roman: true, anchor: 'end', cls: 'md' });
      p.label(11.8, 10.3, 'MSC', { roman: true, anchor: 'end', cls: 'md' });
      p.note(9.7, 8.3, 'external cost', { cls: 'oc' });
      return {};
    },
    expo: () => ({
      agents: [{ name: 'Government', at: [3, 10.5, 0.24] }],
      segs: [[[9.5, 5.75, 0], [9.5, 5.75, 0.22]], [[9.5, 8.75, 0], [9.5, 8.75, 0.22]]],
      eqs: [
        { html: 'MSC = MPC + MEC', at: [10, 10.5, 0.3] },
        { html: 'tax t = MEC  ⇒  Q = Q<sub>efficient</sub>', at: [2, 11, 0.42] },
      ],
      axes: [],
    }),
  },

  solow: {
    dom: { x: [0, 12], y: [0, 2.6] },
    axes: ['k', 'y'],
    draw(host) {
      const f = (k) => Math.pow(k, 0.35);
      const p = plot(host, { x: [0, 12], y: [0, 2.6], xl: 'k', yl: 'y', alt: 'Solow diagram' });
      p.fn(f, 0, 12, 'k');
      p.fn((k) => 0.3 * f(k), 0, 12, 'cb thick');
      p.fn((k) => 0.08 * k, 0, 12, 'md thick');
      const ks = Math.pow(0.3 / 0.08, 1 / 0.65);
      p.guide(ks, 0.08 * ks, ks, 0);
      p.dot(ks, 0.08 * ks, 'k');
      p.label(ks + 0.15, -0.12, 'k*');
      p.label(11.4, f(11.4) + 0.08, 'f(k)', { anchor: 'end' });
      p.label(11.4, 0.3 * f(11.4) - 0.17, 's f(k)', { anchor: 'end', cls: 'cb' });
      p.label(11.4, 0.08 * 11.4 + 0.1, '(n + δ) k', { anchor: 'end', cls: 'md' });
      p.arrow(2.5, 0.05, 4.5, 0.05, 'oc thin');
      p.arrow(11.5, 0.05, 9.5, 0.05, 'oc thin');
      return {};
    },
    expo: () => {
      const f = (k) => Math.pow(k, 0.35);
      const T = 60;
      const traj = (k0) => {
        const pts = [];
        let k = k0;
        for (let t = 0; t <= T; t += 0.5) {
          pts.push([k, 0.3 * f(k), (t / T) * 0.55]);
          for (let j = 0; j < 5; j++) k += 0.1 * (0.3 * f(k) - 0.08 * k);
        }
        return pts;
      };
      const ks = Math.pow(0.3 / 0.08, 1 / 0.65);
      return {
        curves: [0.6, 2, 4, 11.5].map((k0) => ({ pts: traj(k0), c: 'cobalt', w: 2.4 }))
          .concat([{ pts: [[ks, 0.08 * ks, 0], [ks, 0.08 * ks, 0.55]], c: 'ochre', w: 2.6 }]),
        eqs: [{ html: 'k̇ = s f(k) − (n + δ) k', at: [6, 2.4, 0.5] }],
        tags: [{ text: 'time rises off the page; every path ends at k*', at: [ks + 0.3, 0.6, 0.45], c: 'ochre' }],
        axes: ['t'],
      };
    },
  },

  islm: {
    dom: { x: [0, 12], y: [0, 10] },
    axes: ['Y', 'r'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 10], xl: 'Y', yl: 'r', alt: 'IS–LM' });
      p.fn((Y) => 9 - 0.75 * Y, 0, 12, 'cb thick');
      p.fn((Y) => 0.9 * Y - 6, 0, 12, 'md thick');
      p.fn((Y) => 0.9 * Y - 3, 0, 12, 'md dash');
      const Y1 = 15 / 1.65;
      const Y2 = 12 / 1.65;
      p.guide(Y1, 9 - 0.75 * Y1, Y1, 0);
      p.dot(Y1, 9 - 0.75 * Y1, 'k');
      p.dot(Y2, 9 - 0.75 * Y2, 'k');
      p.label(11.6, 0.6, 'IS', { roman: true, anchor: 'end', cls: 'cb' });
      p.label(11.6, 0.9 * 11.6 - 6 - 0.9, 'LM (P = 1)', { roman: true, anchor: 'end', cls: 'md' });
      p.label(10.4, 0.9 * 10.4 - 3 + 0.35, 'LM (P = 2)', { roman: true, anchor: 'end', cls: 'md' });
      p.note(0.4, 9.3, 'the price level is held fixed');
      return {};
    },
    expo: () => {
      const lift = (P) => (P - 1) * 0.45;
      const Yad = (P) => (9 + 6 / P) / 1.65;
      return {
        surfaces: [
          { param: (Y, P) => [Y, 0.9 * Y - 6 / P, lift(P)], u: [0, 12], v: [1, 2], c: 'madder', contour: (Y, P) => P * 10, freq: 0.5 },
          { param: (Y, v) => [Y, 9 - 0.75 * Y, v * 0.45], u: [0, 12], v: [0, 1], c: 'cobalt', alpha: 0.55, contour: (Y, v) => v * 4, freq: 1 },
        ],
        curves: [
          { param: (P) => [Yad(P), 9 - 0.75 * Yad(P), lift(P)], t: [1, 2], c: 'ochre', w: 3.2 },
          { param: (P) => [Yad(P), 0, lift(P)], t: [1, 2], c: 'ochre', w: 2, dash: true },
        ],
        eqs: [
          { html: 'IS: Y = C(Y − T) + I(r) + G', at: [1, 9.5, 0.45] },
          { html: 'LM: M/P = L(r, Y)', at: [11, 6, 0.45] },
          { html: 'AD: Y = Y(P)', at: [Yad(2), 0, 0.5] },
        ],
        tags: [{ text: 'let P vary: the IS–LM crossings trace aggregate demand', at: [5, 1.4, 0.3], c: 'ochre' }],
        axes: ['P'],
      };
    },
  },

  adas: {
    dom: { x: [0, 12], y: [0, 12] },
    axes: ['Y', 'P'],
    draw(host) {
      const p = plot(host, { x: [0, 12], y: [0, 12], xl: 'Y', yl: 'P', alt: 'AD–AS with a demand shock' });
      const Yn = 48 / 7;
      p.line(Yn, 0, Yn, 11.5, 'k thick');
      p.fn((Y) => 13 - Y, 1, 12, 'cb thick');
      p.fn((Y) => 15 - Y, 3, 12, 'cb dash');
      p.fn((Y) => 1 + 0.75 * Y, 0, 12, 'md thick');
      p.fn((Y) => 3 + 0.75 * Y, 0, 11.5, 'md dash');
      p.dot(Yn, 13 - Yn, 'k');
      p.dot(8, 7, 'k');
      p.dot(Yn, 15 - Yn, 'k');
      p.label(Yn + 0.15, 11.6, 'LRAS', { roman: true });
      p.label(11.8, 0.6, 'AD', { roman: true, anchor: 'end', cls: 'cb' });
      p.label(11.8, 2.6, 'AD′', { roman: true, anchor: 'end', cls: 'cb' });
      p.label(11.8, 10.4, 'SRAS', { roman: true, anchor: 'end', cls: 'md' });
      p.note(8.2, 6.4, 'short run');
      p.note(Yn + 0.2, 15 - Yn + 0.3, 'long run');
      return {};
    },
    expo: () => {
      const Yn = 48 / 7;
      const path = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        // SRAS: P = 1 + shift + 0.75Y meets AD′: P = 15 − Y
        const shift = 2 * (1 - Math.exp(-4 * t));
        const Yt = (14 - shift) / 1.75;
        path.push([Yt, 15 - Yt, t * 0.5]);
      }
      return {
        curves: [{ pts: [[Yn, 13 - Yn, 0], [8, 7, 0.02], ...path], c: 'ochre', w: 3 }],
        eqs: [{ html: 'SRAS shifts as P<sup>e</sup> catches up with P', at: [9, 11, 0.45] }],
        tags: [{ text: 'time: output returns to Yₙ, prices stay higher', at: [Yn + 0.3, 8.5, 0.35], c: 'ochre' }],
        axes: ['t'],
      };
    },
  },

  phillips: {
    dom: { x: [0, 10], y: [-2, 10] },
    axes: ['u', 'π'],
    draw(host) {
      const p = plot(host, { x: [0, 10], y: [-2, 10], xl: 'u', yl: 'π', alt: 'Short- and long-run Phillips curves' });
      [2, 5, 8].forEach((pe, i) => p.fn((u) => pe - 1.2 * (u - 5), 0.5, 10, i === 0 ? 'cb thick' : 'cb'));
      p.line(5, -2, 5, 9.6, 'k thick');
      p.label(5.15, 9.3, 'long run', { roman: true });
      p.label(9.8, 2 - 1.2 * 4.8 + 0.5, 'πᵉ = 2%', { anchor: 'end', cls: 'cb' });
      p.label(9.8, 5 - 1.2 * 4.8 + 0.5, 'πᵉ = 5%', { anchor: 'end', cls: 'cb' });
      p.label(9.8, 8 - 1.2 * 4.8 + 0.5, 'πᵉ = 8%', { anchor: 'end', cls: 'cb' });
      p.label(5.15, -1.6, 'u_n');
      return {};
    },
    expo: () => ({
      surfaces: [{ param: (u, pe) => [u, pe - 1.2 * (u - 5), (pe / 8) * 0.45], u: [0.5, 10], v: [0, 8], c: 'cobalt', contour: (u, pe) => pe, freq: 1 }],
      curves: [{ param: (pe) => [5, pe, (pe / 8) * 0.45], t: [0, 8], c: 'ochre', w: 3 }],
      eqs: [{ html: 'π = π<sup>e</sup> − β(u − u<sub>n</sub>)', at: [8, 8, 0.45] }],
      tags: [{ text: 'expected inflation is the hidden axis; each curve is a slice', at: [1, 9, 0.35], c: 'cobalt' }],
      axes: ['πᵉ'],
    }),
  },

  transmission: {
    dom: { x: [0, 760], y: [360, 0] },
    draw(host) {
      const W = 760;
      const H = 360;
      const p = canvas(host, W, H, 'Monetary policy transmission');
      const node = (x, y, t, cls = 'k') => {
        p.area([[x - 62, y - 17], [x + 62, y - 17], [x + 62, y + 17], [x - 62, y + 17]], 'f-paper');
        p.pathPts([[x - 62, y - 17], [x + 62, y - 17], [x + 62, y + 17], [x - 62, y + 17], [x - 62, y - 17]], cls);
        p.label(x, y + 5, t, { roman: true, anchor: 'middle', cls: 'nodet' });
      };
      const col = [80, 230, 385, 540, 690];
      node(col[0], 180, 'Policy rate', 'oc');
      node(col[1], 180, 'Market rates');
      const mid = [['Lending rates', 60], ['Asset prices', 130], ['Exchange rate', 200], ['Expectations', 270]];
      mid.forEach(([t, y]) => node(col[2], y, t));
      [['Consumption', 95], ['Investment', 180], ['Net exports', 265]].forEach(([t, y]) => node(col[3], y, t));
      node(col[4], 120, 'Employment', 'ol');
      node(col[4], 240, 'Inflation', 'md');
      const link = (xa, ya, xb, yb) => p.arrow(xa + 62, ya, xb - 64, yb, 'thin');
      link(col[0], 180, col[1], 180);
      mid.forEach(([, y]) => link(col[1], 180, col[2], y));
      mid.forEach(([, ya]) => [95, 180, 265].forEach((yb) => { if (Math.abs(ya - yb) < 120) link(col[2], ya, col[3], yb); }));
      [95, 180, 265].forEach((ya) => { link(col[3], ya, col[4], 120); link(col[3], ya, col[4], 240); });
      p.note(col[0], 222, 'set by the', { anchor: 'middle' });
      p.note(col[0], 238, 'central bank', { anchor: 'middle' });
      p.note(col[2], 330, 'financial markets: days', { anchor: 'middle' });
      p.note(col[3], 330, 'spending: quarters', { anchor: 'middle' });
      p.note(col[4], 330, 'prices: years', { anchor: 'middle' });
      return {};
    },
    expo: () => ({
      agents: [{ name: 'Central bank', at: [80, 180, 0.2] }],
      rects: [
        { name: 'Financial markets', x: [160, 460], y: [30, 300], h: 0.12, c: 'cobalt' },
        { name: 'Goods market', x: [470, 610], y: [50, 310], h: 0.24, c: 'madder' },
        { name: 'Labor market', x: [620, 755], y: [60, 300], h: 0.36, c: 'olive' },
      ],
      flows: [60, 130, 200, 270].map((y, i) => ({
        pts: [[80, 180, 0.04], [230, 180, 0.12], [385, y, 0.12], [540, [95, 180, 265][i % 3], 0.24], [690, i % 2 ? 240 : 120, 0.36]],
        c: ['cobalt', 'ochre', 'madder', 'olive'][i], n: 16, speed: 0.07,
      })),
      eqs: [
        { html: 'i<sub>t</sub> = r* + π<sub>t</sub> + ½(π<sub>t</sub> − π*) + ½x<sub>t</sub>', at: [20, 330, 0.3] },
        { html: 'x<sub>t</sub> = E<sub>t</sub>x<sub>t+1</sub> − σ(i<sub>t</sub> − E<sub>t</sub>π<sub>t+1</sub> − r*)', at: [300, 360, 0.5] },
        { html: 'π<sub>t</sub> = βE<sub>t</sub>π<sub>t+1</sub> + κx<sub>t</sub>', at: [560, 330, 0.62] },
      ],
      axes: ['E_t'],
    }),
  },

  regression: {
    dom: { x: [0, 10], y: [0, 14] },
    axes: ['x₁', 'y'],
    draw(host, ctx) {
      const pts = ctx.regData;
      const p = plot(host, { x: [0, 10], y: [0, 14], xl: 'x_1', yl: 'y', alt: 'Scatter with a least-squares line' });
      const { a, b } = ctx.regFit;
      pts.forEach(([x1, , y]) => p.guide(x1, y, x1, a + b * x1));
      pts.forEach(([x1, , y]) => p.dot(x1, y, 'cb', 3.2));
      p.fn((x) => a + b * x, 0, 10, 'md thick');
      p.label(9.6, a + b * 9.6 + 0.6, `slope ${b.toFixed(2)}`, { roman: true, anchor: 'end', cls: 'md' });
      p.note(0.4, 13.2, 'true effect of x₁ on y: 0.50');
      return {};
    },
    expo: (S, ctx) => {
      const h = (x2) => (x2 / 8) * 0.45;
      return {
        surfaces: [{ param: (x1, x2) => [x1, 1 + 0.5 * x1 + 0.8 * x2, h(x2)], u: [0, 10], v: [0, 8], c: 'olive', contour: (x1, x2) => x2, freq: 1, alpha: 0.7 }],
        points: ctx.regData.map(([x1, x2, y]) => ({ at: [x1, y, h(x2)], c: 'cobalt', size: 5 })),
        segs: ctx.regData.map(([x1, x2, y]) => [[x1, y, 0], [x1, y, h(x2)]]),
        eqs: [
          { html: 'y = β<sub>0</sub> + β<sub>1</sub>x<sub>1</sub> + β<sub>2</sub>x<sub>2</sub> + ε', at: [8, 13, 0.5] },
          { html: 'β̂ = (XᵀX)<sup>−1</sup>Xᵀy', at: [9.6, 2.5, 0.22] },
        ],
        tags: [{ text: 'the omitted x₂ rises off the page; the plane’s slope in x₁ is 0.5', at: [5, 2, 0.4], c: 'olive' }],
        axes: ['x₂'],
      };
    },
  },
};

// Deterministic data for the regression figure (x₂ rises with x₁).
export function regressionData() {
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const pts = [];
  for (let i = 0; i < 46; i++) {
    const x1 = 0.6 + rnd() * 8.8;
    const x2 = Math.max(0, Math.min(8, 0.62 * x1 + gauss() * 0.9 + 0.4));
    const y = 1 + 0.5 * x1 + 0.8 * x2 + gauss() * 0.55;
    pts.push([x1, x2, y]);
  }
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[2], 0) / n;
  const b = pts.reduce((a, p) => a + (p[0] - mx) * (p[2] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0);
  return { pts, fit: { a: my - b * mx, b } };
}

export function drawAll(root = document) {
  const reg = regressionData();
  const ctx = { regData: reg.pts, regFit: reg.fit };
  for (const fig of root.querySelectorAll('figure[data-fig]')) {
    const spec = FIGURES[fig.dataset.fig];
    const art = fig.querySelector('.fig-art');
    if (!spec || !art || art.firstChild) continue;
    spec.draw(art, ctx);
  }
  return ctx;
}
