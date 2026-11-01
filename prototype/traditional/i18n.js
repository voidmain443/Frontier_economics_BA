// The site in two languages (docs/i18n.md). Each page has a Korean twin
// (classical.ko.html for classical.html) whose static prose is translated in
// place. What the scripts draw (figure labels, story captions, the wheel's
// signs, course pages) is translated here, keyed by its English: t(s) looks s
// up in the Korean dictionary, and if a string carries numbers it is looked up
// with each number replaced by {0}, {1}, … in order, and the numbers are put
// back. A string built around words (a sector's name) is matched against the
// keys as patterns, and its words translated in turn; a caption of several
// sentences is translated sentence by sentence. Missing strings stay English.

export const LANG = document.documentElement.lang?.startsWith('ko') ? 'ko' : 'en';

const DICT = LANG === 'ko' ? (await import('./i18n/ko.js')).default : {};

const NUM = /\d+(?:[.,]\d+)*/g;
// the key a string is filed under: its numbers as {0}, {1}, …
export const keyOf = (s) => {
  let i = 0;
  return s.replace(NUM, () => `{${i++}}`);
};

// keys with places for words, as patterns, built once when first needed
let PATTERNS = null;
const patterns = () => (PATTERNS ??= Object.keys(DICT)
  .filter((k) => k.length > 24 && /\{\d+\}/.test(k) && !/\{\d+\}\{\d+\}/.test(k))
  .map((k) => {
    const order = [...k.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    const src = k.split(/\{\d+\}/).map((p) => p.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('([^]+?)');
    return { k, re: new RegExp(`^${src}$`), order };
  }));
const memo = new Map();

function lookup(s, depth) {
  const hit = DICT[s];
  if (hit != null) return hit;
  const nums = s.match(NUM) ?? [];
  if (nums.length) {
    const tpl = DICT[keyOf(s)];
    if (tpl != null) return tpl.replace(/\{(\d+)\}/g, (m, i) => nums[Number(i)] ?? m);
  }
  if (depth > 2 || s.length < 25) return null;
  // a key whose places hold words: translate the words too
  for (const P of patterns()) {
    const m = s.match(P.re);
    if (!m) continue;
    const parts = {};
    P.order.forEach((n, j) => { parts[n] = translate(m[j + 1], depth + 1); });
    return DICT[P.k].replace(/\{(\d+)\}/g, (x, i) => parts[i] ?? x);
  }
  // several sentences: one at a time
  const sentences = s.split(/(?<=[.?!])\s+(?=[A-Z“"(])/);
  if (sentences.length > 1) {
    const out = sentences.map((x) => translate(x, depth + 1));
    if (out.some((x, i) => x !== sentences[i])) return out.join(' ');
  }
  return null;
}

function translate(s, depth = 0) {
  if (memo.has(s)) return memo.get(s);
  const out = lookup(s, depth) ?? s;
  memo.set(s, out);
  return out;
}

export function t(s) {
  if (LANG === 'en' || typeof s !== 'string' || !s) return s;
  return translate(s);
}

// a link to another page of the site, in this page's language
export function localHref(href) {
  if (LANG === 'en' || typeof href !== 'string') return href;
  return href.replace(/^(index|classical|beyond|archive|course)\.html/, '$1.ko.html');
}

// The language switch in the nav: the language being read stays put, and the
// other opens its twin at the same place (the twins share their ids, so the
// section or figure nearest the top of the window is carried as the #).
for (const a of document.querySelectorAll('.langs a')) {
  a.addEventListener('click', (e) => {
    if (a.getAttribute('aria-current') === 'true') { e.preventDefault(); return; }
    let place = location.hash;
    if (scrollY > 40) {
      const marks = [...document.querySelectorAll('section[id], figure[id], li.week[id]')];
      // where each would land is its scroll margin from the top; take the last at or above it
      const above = marks.filter((m) => m.getBoundingClientRect().top - parseFloat(getComputedStyle(m).scrollMarginTop) <= innerHeight * 0.2);
      if (above.length) place = `#${above.at(-1).id}`;
    }
    a.href = a.getAttribute('href').split(/[?#]/)[0] + location.search + place;
  });
}
