// Part 3, section 9: the textbooks and the eight works (books.js). Figure
// 3.12 draws the works in the order they wait for one another, each with what
// it hands in and the chapters it reads, one tick a chapter; a pale tick is a
// chapter of the same book read in another work. Below it, the twenty-two
// books, each with its question and the works it is read in.

import { WORKS, BOOKS, chaptersOf, runs } from './books.js';
import { t, localHref, LANG } from './i18n.js';

const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const list = (ns) => ns.join(', ');
// "chapters 1–10, 13, 14", or in Korean "1~10, 13, 14장"
const chapters = (chs) => (LANG === 'ko' ? `${runs(chs, '~')}장` : `chapters ${runs(chs)}`);

export function drawWorks(host) {
  host.innerHTML = '';
  for (const w of WORKS) {
    const sec = document.createElement('section');
    sec.className = 'work';
    sec.id = `w-${w.no}`;
    sec.style.setProperty('--c', w.col);
    sec.style.setProperty('--r', w.row ? `${w.row}` : '1 / span 2');
    if (!w.row) sec.classList.add('mid');
    const rows = BOOKS.filter((b) => b.read[w.no]).map((b) => {
      const mine = new Set(b.read[w.no]);
      const ticks = chaptersOf(b).map((c) => `<i${mine.has(c) ? '' : ' class="off"'}></i>`).join('');
      const which = mine.size === chaptersOf(b).length ? '' : ` ${chapters(b.read[w.no])}`;
      return `<li><a href="#b-${b.id}"><span class="bk">${esc(t(b.short))}<span class="vh">${which}</span></span><span class="ticks" aria-hidden="true">${ticks}</span></a></li>`;
    }).join('');
    const after = w.waits.length ? t(`after ${list(w.waits)}`) : t('waits for nothing');
    sec.innerHTML = `<h3><span class="wno">${w.no}</span>${esc(t(w.name))}</h3><p class="hands">${esc(t(w.hands))}</p><p class="after">${esc(after)}</p><ul class="reads">${rows}</ul>`;
    host.appendChild(sec);
  }
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'wires');
  svg.setAttribute('aria-hidden', 'true');
  host.appendChild(svg);
  const draw = () => wires(host, svg);
  new ResizeObserver(draw).observe(host);
  document.fonts?.ready.then(draw);
  draw();
}

// An arrow from each work to the works that wait for it, drawn only where no
// longer path already gives the order (Work 6 waits for 3 through 4). Each
// leaves its work beside the heading, or at the middle of a work that spans
// both rows, and turns in the gap before the work it reaches; the two that
// cross between 4, 5 and 6, 7 turn at different places in that gap. A work
// that stands over the one it waits for (8 over 7) is reached straight up.
function wires(host, svg) {
  const box = host.getBoundingClientRect();
  svg.setAttribute('width', box.width);
  svg.setAttribute('height', box.height);
  svg.innerHTML = '<defs><marker id="wire-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,1 L10,5 L0,9 z"/></marker></defs>';
  if (getComputedStyle(svg).display === 'none') return;
  const at = {};
  for (const w of WORKS) {
    const r = host.querySelector(`#w-${w.no}`).getBoundingClientRect();
    const h = host.querySelector(`#w-${w.no} h3`).getBoundingClientRect();
    const y = w.row ? h.top + 11 : (r.top + r.bottom) / 2;
    at[w.no] = { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, y: y - box.top };
  }
  const reach = (a, b, seen = new Set()) => WORKS[b - 1].waits.some((p) => p === a || (!seen.has(p) && (seen.add(p), reach(a, p, seen))));
  const turn = { '4-7': 0.3, '5-6': 0.7 };
  for (const w of WORKS) {
    for (const p of w.waits) {
      if (w.waits.some((q) => q !== p && reach(p, q))) continue;
      const A = at[p];
      const B = at[w.no];
      const gap = B.l - A.r;
      const x = B.l - Math.min(gap, 24) * (turn[`${p}-${w.no}`] ?? 0.5);
      const over = (Math.max(A.l, B.l) + Math.min(A.r, B.r)) / 2;
      const d = gap < 0 ? `M${over},${A.t}V${B.b + 1}`
        : Math.abs(A.y - B.y) < 1 ? `M${A.r},${A.y}H${B.l - 1}` : `M${A.r},${A.y}H${x}V${B.y}H${B.l - 1}`;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('marker-end', 'url(#wire-head)');
      svg.appendChild(path);
    }
  }
}

// the twenty-two books, by the core, the field books and the last
export function bookIndex(host) {
  const head = `<thead><tr><th>${t('Book')}</th><th>${t('The question it answers')}</th><th>${t('Chapters')}</th><th>${t('Read in work')}</th><th>${t('At the hub, or the one thing it changes')}</th></tr></thead>`;
  const groups = [['core', 'The core: ten books'], ['field', 'The field books: three or more of eleven'], ['last', 'The last book']];
  const body = groups.map(([side, name]) => {
    const rows = BOOKS.filter((b) => b.side === side).map((b) => {
      const title = b.course ? `<a href="${localHref('course.html')}?c=${b.course}">${esc(t(b.name))}</a>` : esc(t(b.name));
      const works = Object.entries(b.read).map(([w, chs]) => (chs.length === chaptersOf(b).length ? `<a href="#w-${w}">${w}</a>` : `<a href="#w-${w}">${w}</a> (${chapters(chs)})`)).join(', ');
      return `<tr id="b-${b.id}"><td><span class="bno">${b.no}</span>${title}</td><td>${esc(t(b.question))}</td><td>${chaptersOf(b).length}</td><td>${works}</td><td>${esc(t(b.takes))}</td></tr>`;
    }).join('');
    return `<tbody><tr class="grp"><th colspan="5">${esc(t(name))}</th></tr>${rows}</tbody>`;
  }).join('');
  host.innerHTML = `<div class="partslist books"><table><caption>${t('The twenty-two books')}</caption>${head}${body}</table></div>`;
}
