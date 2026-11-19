// The landing page (index.html): the drawing that states the site's claim,
// and the shelf of Part 3's twenty-two books.
//
// Figure 0 is section A–A of a drafting sheet. The demand surface p(q, I)
// stands in axonometric view; a cutting plane holds income at I₀, and the
// curve it leaves is drawn flat beside it, as the textbook draws it. A shift
// of the curve is a move to another section (the faint curve at I₁).

import { BOOKS, WORKS, chaptersOf } from './books.js';
import { t, localHref } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent = null, text = null) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
};
// "I_0" → I with a subscript 0
const label = (attrs, parent, s) => {
  const e = el('text', attrs, parent);
  let last = 0;
  for (const m of s.matchAll(/_(\w)/g)) {
    if (m.index > last) e.appendChild(document.createTextNode(s.slice(last, m.index)));
    el('tspan', { 'font-size': '0.7em', dy: '0.3em' }, e, m[1]);
    el('tspan', { dy: '-0.3em' }, e, '\u200a');
    last = m.index + m[0].length;
  }
  if (last < s.length) e.appendChild(document.createTextNode(s.slice(last)));
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- Figure 0

const Q0 = 0.4, Q1 = 8, I1 = 8, I0 = 4, IHI = 6.5;
const price = (q, I) => ((4 + 0.3 * I) * 1.5) / (q + 1.1);

function sectionDrawing(host) {
  const W = 940, H = 440;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'plot hero-plot', role: 'img', 'aria-label': t('The demand surface p(q, I), cut at income I₀; the cut is the textbook demand curve, drawn flat beside it.') });
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: 'hero-ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0,1 L10,5 L0,9 z', class: 'ahead' }, mk);

  // axonometric: q runs right, income I recedes up and to the right, p rises
  const O = { x: 74, y: 392 };
  const S = (q, I, p) => [O.x + q * 40 + I * 21, O.y - p * 37 - I * 12.5];
  const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const curve = (I, n = 40) => Array.from({ length: n + 1 }, (_, k) => {
    const q = Q0 + ((Q1 - Q0) * k) / n;
    return S(q, I, price(q, I));
  });

  const g = el('g', {}, svg);
  // the floor: the (q, I) plane at p = 0
  el('polygon', { points: pts([S(0, 0, 0), S(Q1 + 0.6, 0, 0), S(Q1 + 0.6, I1, 0), S(0, I1, 0)]), class: 'hero-floor' }, g);
  for (let I = 1; I < I1; I++) el('line', { x1: S(0, I, 0)[0], y1: S(0, I, 0)[1], x2: S(Q1 + 0.6, I, 0)[0], y2: S(Q1 + 0.6, I, 0)[1], class: 'ln guide' }, g);

  // the axes
  const axis = (a, b, label, cls, dx, dy) => {
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'ln axis', 'marker-end': 'url(#hero-ah)' }, g);
    el('text', { x: b[0] + dx, y: b[1] + dy, class: `lb it ${cls}` }, g, label);
  };
  axis(S(0, 0, 0), S(Q1 + 1.1, 0, 0), 'q', '', 6, 6);
  axis(S(0, 0, 0), S(0, I1 + 1, 0), 'I', 'cb', 6, 2);
  axis(S(0, 0, 0), S(0, 0, 7.6), 'p', '', -6, -8);
  el('text', { x: S(0, I1 + 1, 0)[0] + 18, y: S(0, I1 + 1, 0)[1] + 2, class: 'lb note cb' }, g, t('income'));

  // the surface, strip by strip from the back, so near strips hide far ones;
  // the cutting plane goes in between, at I₀
  const strip = (j) => {
    const back = curve(j + 1), front = curve(j).reverse();
    // opaque, so the floor and the axes under the surface stay hidden
    const tint = 5 + 9 * (1 - j / I1);
    el('polygon', { points: pts([...back, ...front]), class: 'hero-strip', style: `fill: color-mix(in srgb, #2a55a0 ${tint.toFixed(1)}%, #fbfbf8)` }, g);
    for (let q = 1; q <= Q1; q++) {
      el('line', { x1: S(q, j, price(q, j))[0], y1: S(q, j, price(q, j))[1], x2: S(q, j + 1, price(q, j + 1))[0], y2: S(q, j + 1, price(q, j + 1))[1], class: 'ln thin hero-mesh' }, g);
    }
    el('polyline', { points: pts(curve(j + 1)), class: 'ln thin hero-mesh' }, g);
  };
  for (let j = I1 - 1; j >= I0; j--) strip(j);

  // the cutting plane, section A–A
  const PL = [S(-0.3, I0, -0.25), S(Q1 + 0.6, I0, -0.25), S(Q1 + 0.6, I0, 7.1), S(-0.3, I0, 7.1)];
  el('polygon', { points: pts(PL), class: 'hero-plane' }, g);
  // the section's cut line and arrows, as a drawing marks a section
  const cutA = S(-0.9, I0, -0.25), cutB = S(Q1 + 1.2, I0, -0.25);
  el('line', { x1: cutA[0], y1: cutA[1], x2: cutB[0], y2: cutB[1], class: 'hero-cut' }, g);
  for (const [c, side] of [[cutA, -1], [cutB, 1]]) {
    el('line', { x1: c[0], y1: c[1], x2: c[0] - 13, y2: c[1] + 22, class: 'ln md', 'marker-end': 'url(#hero-ah)' }, g);
    el('text', { x: c[0] + (side < 0 ? -26 : 4), y: c[1] + 8, class: 'lb hero-sec' }, g, 'A');
  }
  const sl = curve(I0, 60);
  el('polyline', { points: pts(sl), class: 'ln thick md' }, g);
  const tag = S(0.1, I0, 6.55);
  label({ x: tag[0], y: tag[1], class: 'lb note cb' }, g, t('held: I = I_0'));

  for (let j = I0 - 1; j >= 0; j--) strip(j);
  el('polyline', { points: pts(curve(0)), class: 'ln thin hero-mesh' }, g);
  const top = S(Q0, I1, price(Q0, I1));
  el('text', { x: top[0] + 12, y: top[1] - 6, class: 'lb it' }, g, 'p(q, I)');

  // the section, laid flat: what the textbook draws
  const P = { x: 646, y: 392, w: 262, h: 270 };
  const X = (q) => P.x + (q / (Q1 + 0.6)) * P.w;
  const Y = (p) => P.y - (p / 7.4) * P.h;
  const f = el('g', {}, svg);
  el('rect', { x: P.x - 34, y: P.y - P.h - 54, width: P.w + 60, height: P.h + 96, class: 'hero-sheet' }, f);
  el('text', { x: P.x - 22, y: P.y - P.h - 30, class: 'lb hero-sec' }, f, t('Section A–A'));
  el('line', { x1: P.x, y1: P.y, x2: P.x + P.w + 8, y2: P.y, class: 'ln axis', 'marker-end': 'url(#hero-ah)' }, f);
  el('line', { x1: P.x, y1: P.y, x2: P.x, y2: P.y - P.h - 8, class: 'ln axis', 'marker-end': 'url(#hero-ah)' }, f);
  el('text', { x: P.x + P.w + 12, y: P.y + 6, class: 'lb it' }, f, 'q');
  el('text', { x: P.x - 6, y: P.y - P.h - 14, class: 'lb it' }, f, 'p');
  const line2 = (I, n = 60) => Array.from({ length: n + 1 }, (_, k) => {
    const q = Q0 + ((Q1 - Q0) * k) / n;
    return [X(q), Y(price(q, I))];
  });
  el('polyline', { points: pts(line2(IHI)), class: 'ln dash cb' }, f);
  el('polyline', { points: pts(line2(I0)), class: 'ln thick md' }, f);
  label({ x: X(Q1) - 4, y: Y(price(Q1, I0)) + 26, class: 'lb it md', 'text-anchor': 'end' }, f, 'D(p; I_0)');
  label({ x: X(2.1) + 6, y: Y(price(2.1, IHI)) - 8, class: 'lb note cb' }, f, t('I_1 > I_0: another section'));
  el('text', { x: P.x + 4, y: P.y + 30, class: 'lb note' }, f, t('the textbook keeps only this'));

  // a leader from the plane to its section, as a drawing refers a view
  const from = S(Q1 + 0.6, I0, 3.4);
  el('path', { d: `M${from[0] + 4},${from[1]} C${from[0] + 40},${from[1] - 30} ${P.x - 70},${P.y - 210} ${P.x - 38},${P.y - 200}`, class: 'ln guide', 'marker-end': 'url(#hero-ah)' }, svg);

  host.appendChild(svg);
}

// ---------------------------------------------------------------- the shelf

function shelf(host) {
  const works = (b) => Object.keys(b.read).map(Number).sort((x, y) => x - y);
  const groups = [
    ['core', 'The core: ten books', 'Books 1–10 build the core: each method at the hub of the wheel has a book.'],
    ['field', 'The field courses', 'Books 11–21 each add one thing to the core, and are read after building the economy and measuring it.'],
    ['last', 'The last book', 'Book 22 reads economics again, after three fields or more, and ends in a first paper.'],
  ];
  const archive = localHref('archive.html');
  host.innerHTML = groups.map(([side, name, note]) => {
    const items = BOOKS.filter((b) => b.side === side).map((b) => {
      const ws = works(b).map((w) => `<span class="wk" title="${esc(t(WORKS[w - 1].name))}">${w}</span>`).join('');
      return `<li><a href="${archive}#b-${b.id}"><span class="bk-no">${b.no}</span><span class="bk-name">${esc(t(b.name))}</span><span class="bk-q">${esc(t(b.question))}</span><span class="bk-meta"><span>${esc(t(`${chaptersOf(b).length} chapters`))}</span><span class="bk-works" aria-label="${esc(t('read in works'))} ${works(b).join(', ')}">${ws}</span></span></a></li>`;
    }).join('');
    return `<section class="shelf-group shelf-${side}"><h3>${esc(t(name))}</h3><p class="shelf-note">${esc(t(note))}</p><ol class="shelf">${items}</ol></section>`;
  }).join('');
}

// the eight works, in the order their hand-ins are due
function legend(host) {
  host.innerHTML = WORKS.map((w) => `<li><span class="wk">${w.no}</span><b>${esc(t(w.name))}</b><i>${esc(t(w.hands))}</i></li>`).join('');
}

const fig = document.querySelector('#hero-fig');
if (fig) sectionDrawing(fig);
const works = document.querySelector('#works-legend');
if (works) legend(works);
const books = document.querySelector('#book-shelf');
if (books) shelf(books);
