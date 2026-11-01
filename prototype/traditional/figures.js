// The SVG plot that every figure is drawn on, and the regression data of
// Figure 7.1. A figure's 2D drawing and its folded construct share one data
// domain, so the construct rises exactly out of the drawn curves.

import { t as tr } from './i18n.js';

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
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot', role: 'img', 'aria-label': tr(o.alt ?? '') });
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
      rich(t, tr(s));
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
