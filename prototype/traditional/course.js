// One textbook page per course: its question, its path of units through the
// wheel, its weeks, where it meets other courses, and what to read next. The
// path comes from the ontology (ontology.js, COURSE_UNITS); folded, the wheel
// lies beside the page and takes the state of each unit in turn (fold.js).

import { COURSES, JUNCTIONS } from './curriculum.js';
import { renderCurriculum } from './ladder.js';
import { plot } from './figures.js';
import { LAYERS } from './p3-figs.js';
import { COURSE_UNITS, RELATIONS, unitOf, unitName, stateOf } from './ontology.js';
import { PLACE_P1, PLACE_P2, BUILD_ALL, stopIndex } from './wheel.js';
import { setupPage } from './page.js';
import { t, localHref, LANG } from './i18n.js';

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('c') ?? 'micro';
const c = COURSES.find((x) => x.id === id) ?? COURSES[0];

// Syllabi and books behind each sequence (Part 1’s research), and open material to read next.
const READ = {
  principles: [['MIT 14.01, Principles of Microeconomics (Fall 2023)', 'https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2023/'], ['MIT 14.02, Principles of Macroeconomics (Spring 2023)', 'https://ocw.mit.edu/courses/14-02-principles-of-macroeconomics-spring-2023/'], ['CORE Econ, The Economy 2.0', 'https://www.core-econ.org/'], ['Marginal Revolution University', 'https://mru.org/']],
  math: [['QuantEcon lectures', 'https://quantecon.org/'], ['Chiang and Wainwright, Fundamental Methods of Mathematical Economics (book)', null]],
  micro: [['MIT 14.04, Intermediate Microeconomic Theory (Fall 2020)', 'https://ocw.mit.edu/courses/14-04-intermediate-microeconomic-theory-fall-2020/'], ['EconGraphs: interactive intermediate micro', 'https://www.econgraphs.org/'], ['CORE Econ', 'https://www.core-econ.org/']],
  games: [['MIT 14.12, Economic Applications of Game Theory (Fall 2025)', 'https://ocw.mit.edu/courses/14-12-economic-applications-of-game-theory-fall-2025/'], ['The Evolution of Trust (Nicky Case)', 'https://ncase.me/trust/']],
  macro: [['MIT 14.05, Intermediate Macroeconomics (Spring 2013)', 'https://ocw.mit.edu/courses/14-05-intermediate-macroeconomics-spring-2013/'], ['QuantEcon lectures', 'https://quantecon.org/'], ['CORE Econ', 'https://www.core-econ.org/']],
  metrics: [['MIT 14.32 syllabus (Spring 2022, Angrist)', 'https://economics.mit.edu/sites/default/files/inline-files/Syl32SP22r3_0.pdf'], ['Causal Inference: The Mixtape', 'https://mixtape.scunning.com/'], ['The Effect', 'https://theeffectbook.net/']],
  trade: [['MIT 14.54, International Trade (Fall 2016)', 'https://ocw.mit.edu/courses/14-54-international-trade-fall-2016/']],
  intlfin: [['Berkeley Econ 182, International Monetary Economics (Obstfeld)', 'https://eml.berkeley.edu/~obstfeld/182_sp06/182_s06.shtml']],
  banking: [['Mishkin, The Economics of Money, Banking, and Financial Markets (book)', 'https://pearson.com/en-us/subject-catalog/p/economics-of-money-banking-and-financial-markets-the/P200000005989/9780136893929']],
  public: [['MIT 14.41, Public Finance and Public Policy (Fall 2024)', 'https://ocw.mit.edu/courses/14-41-public-finance-and-public-policy-fall-2024/']],
  labor: [['MIT 14.64, Labor Economics (Fall 2021, outline)', 'https://economics.mit.edu/sites/default/files/inline-files/1464_Fall2021_combined.pdf']],
  io: [['MIT 14.20, Industrial Organization and Public Policy (Spring 2003)', 'https://ocw.mit.edu/courses/14-20-industrial-organization-and-public-policy-spring-2003/']],
  development: [['MIT 14.73, The Challenge of World Poverty (Spring 2011)', 'https://ocw.mit.edu/courses/14-73-the-challenge-of-world-poverty-spring-2011/'], ['MIT 14.74, Foundations of Development Policy (Spring 2009)', 'https://ocw.mit.edu/courses/14-74-foundations-of-development-policy-spring-2009/'], ['Our World in Data', 'https://ourworldindata.org/']],
  environmental: [['MIT 14.42, Environmental Policy and Economics (Spring 2011)', 'https://ocw.mit.edu/courses/14-42-environmental-policy-and-economics-spring-2011/'], ['Our World in Data', 'https://ourworldindata.org/']],
  finance: [['MIT 15.401, Finance Theory I (Fall 2008)', 'https://ocw.mit.edu/courses/15-401-finance-theory-i-fall-2008/'], ['Yale ECON 252, Financial Markets (Shiller)', 'https://oyc.yale.edu/economics/econ-252']],
  behavioral: [['MIT 14.13, Psychology and Economics (Spring 2020)', 'https://ocw.mit.edu/courses/14-13-psychology-and-economics-spring-2020/']],
  history: [['UC Davis ECN 110A, World Economic History (Gregory Clark)', 'https://faculty.econ.ucdavis.edu/faculty/gclark/ecn110a/110a-syllabus%202013-1.html'], ['Our World in Data', 'https://ourworldindata.org/']],
};

document.title = `${t(c.name)} — ${t('Cross-Section')}`;
const root = $('#sheet');
const intro = c.side === 'field'
  ? `<p class="lede">${t(c.question)}</p><p><b>${t('Built from')}</b> ${t(c.from)}${c.adds ? ` <b>${t('It adds')}</b> ${t(c.adds)}` : ''}</p>${c.source ? `<p class="field-src">${t('Sequence after')} ${t(c.source)}.</p>` : ''}`
  : `<p class="lede">${t('A core course: every field course is assembled from its parts.')}</p>`;
// the course's units, and where each is read on the wheel
const units = (COURSE_UNITS[c.id] ?? []).map((key) => ({ key, m: unitOf(key) })).filter((u) => u.m);
const placeOfUnit = (u) => (u.m.part === 2 ? PLACE_P2[u.m.id] : PLACE_P1[u.m.id]);
const relName = Object.fromEntries(RELATIONS.map((r) => [r.id, r.name]));
// the label before what a unit changes; Korean names it as a noun phrase
// (드러내는 것, …) where the English uses the relation's verb
const relKo = { start: '출발점', open: '드러내는 것', add: '더하는 것', relax: '완화하는 가정', measure: '측정하는 것', return: '다시 나오는 것' };
const relLabel = (rel) => (LANG === 'ko' ? relKo[rel] : rel === 'start' ? 'Starts' : relName[rel]);
const held = (m) => m.held.map(([, v]) => t(v)).filter(Boolean).join('; ') || t('nothing named');
root.innerHTML = `<header class="opening"><p class="kicker">${t(c.side === 'field' ? 'Field course' : 'Core course')}</p><h1>${t(c.name)}</h1>${intro}</header>` +
  `<section class="chapter" id="c-path"><h2>${t('Its path through the wheel')}</h2>
    <p>${t('A course is a path of units, and each unit is one model: what it moves, what it holds still, and the one thing it changes')} (<a href="${localHref('archive.html#a7')}">${t('Part 3, section 7')}</a>). ${t(`This course teaches ${units.length} of the units of Parts 1 and 2, in this order.`)}</p>
    <p class="needs-fold" hidden>${t('Folded, the wheel lies beside the page, and the path is drawn through it unit by unit, each unit putting the wheel in its state.')}</p>
    <figure class="fig wide dense" data-fig="route" id="c-route">
      <div class="fig-art"></div>
      <figcaption><span class="fig-no">${t('The path')}</span>${t('The plan of the wheel')} (<a href="${localHref('archive.html#f3-1')}">${t('Figure 3.1')}</a>), ${t('with the cell each unit is read in, numbered in the order the course teaches them.')}</figcaption>
    </figure>
    <ol class="units-path">${units.map((u) => `<li><a href="${localHref(u.m.href)}"><b>${t(unitName(u.m))}</b> ${t(u.m.title)}</a><span><i>${t('Moves')}</i> ${u.m.moving.map(t).join(', ')}. <i>${t('Holds')}</i> ${held(u.m)}. <i>${relLabel(u.m.rel)}</i> ${t(u.m.what)}. <i>${t('Method')}</i> ${t(u.m.method)}.</span></li>`).join('')}</ol>
  </section>` +
  `<section class="chapter"><h2>${t('Week by week')}</h2><div data-ladder="${c.id}"></div></section>` +
  `<section class="chapter" id="c-jx"><h2>${t('Where it meets other courses')}</h2><ul class="course-links" id="c-junctions"></ul></section>` +
  `<section class="chapter" id="c-read"><h2>${t('Read next')}</h2><ul class="course-links" id="c-reading"></ul></section>`;
renderCurriculum(root);

// links between weeks go to the course page that owns them
for (const a of root.querySelectorAll('.wk-links a[href^="#"]')) {
  const ref = a.getAttribute('href').slice(1);
  const owner = ref.replace(/-\d+$/, '');
  if (owner !== c.id) a.href = `${localHref('course.html')}?c=${owner}#${ref}`;
}

// junctions that pass through this course, each other week named by its course
const weekName = (l) => {
  const [, owner, n] = l.match(/^(.*)-(\d+)$/);
  return `${t(COURSES.find((x) => x.id === owner)?.short ?? owner)} ${n}`;
};
const jx = JUNCTIONS.filter((j) => j.links.some((l) => l.startsWith(`${c.id}-`)));
$('#c-junctions').innerHTML = jx.length
  ? jx.map((j) => {
    const others = j.links.filter((l) => !l.startsWith(`${c.id}-`));
    const first = others[0] ?? j.links[0];
    return `<li><a href="${localHref('course.html')}?c=${first.replace(/-\d+$/, '')}#${first}"><b>${t(j.title)}</b><span>${others.map(weekName).join(', ')}</span></a></li>`;
  }).join('')
  : `<li>${t('No junction passes through this course yet.')}</li>`;

$('#c-reading').innerHTML = (READ[c.id] ?? []).map(([title, href]) => (href ? `<li><a href="${href}"><b>${title}</b></a></li>` : `<li><b>${title}</b></li>`)).join('');

// The path, flat: the plan of Figure 3.1 with each unit's cell numbered. A
// unit read where two cells meet stands on their shared wall or arc.
const places = units.map(placeOfUnit);
const stops = stopIndex(places);
const FILL = { chalk: 'f-hatch', olive: 'f-olive', ochre: 'f-ochre', cobalt: 'f-cobalt' };
const cellAt = Object.fromEntries(LAYERS.flatMap((L, ring) => L.rooms.map(([name], i) => [name, { x: i + 0.5, y: ring + 0.5 }])));
function drawPath(art) {
  const p = plot(art, { w: 940, h: 420, x: [-1.5, 6], y: [0, 4], axes: false, pad: { l: 10, r: 10, t: 14, b: 14 }, alt: `${t('The plan of the wheel')}: ${units.map((u, i) => `${i + 1}, ${t(unitName(u.m))}`).join('; ')}.` });
  const on = new Set(places.flat());
  LAYERS.forEach((layer, L) => {
    p.label(-1.45, L + 0.5, layer.name, { dy: 6, roman: true, cls: 'step' });
    layer.rooms.forEach(([name], i) => {
      const q = [[i + 0.06, L + 0.1], [i + 0.94, L + 0.1], [i + 0.94, L + 0.9], [i + 0.06, L + 0.9]];
      if (on.has(name)) p.area(q, FILL[layer.c]);
      p.pathPts([...q, q[0]], on.has(name) ? 'k thin' : 'k thin dash faint');
      p.label(i + 0.5, L + 0.74, name, { anchor: 'middle', dy: 4, roman: true, cls: `room small${on.has(name) ? '' : ' out'}` });
    });
  });
  const at = places.map((pl) => {
    const cs = (Array.isArray(pl) ? pl : [pl]).map((n) => cellAt[n]);
    return [cs.reduce((a, q) => a + q.x, 0) / cs.length, cs.reduce((a, q) => a + q.y, 0) / cs.length - 0.1];
  });
  p.pathPts(at, 'oc thick');
  // one numbered mark per place; units read in the same place share it
  const label = new Map();
  at.forEach(([x, y], i) => {
    const k = `${x.toFixed(3)} ${y.toFixed(3)}`;
    label.set(k, { x, y, text: label.has(k) ? `${label.get(k).text}, ${i + 1}` : String(i + 1) });
  });
  for (const { x, y, text } of label.values()) {
    p.ring(x, y, 'oc', 7 + 4 * text.length);
    p.label(x, y, text, { anchor: 'middle', dy: 4.5, roman: true, cls: 'stop' });
  }
}

// Folded: the story walks the path, one unit a beat, the wheel in each
// unit's state, the route drawn on as far as the unit
const verb = { open: 'opens', add: 'adds', relax: 'relaxes', measure: 'measures', return: 'returns' };
const and = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] ?? 'nothing named');
const say = (u, i) => (LANG === 'ko'
  ? `${i + 1}. ${t(unitName(u.m))}, ${t(u.m.title)}. 움직이는 칸: ${u.m.moving.map(t).join(', ')}. 고정한 조건: ${held(u.m)}. ${relLabel(u.m.rel)}: ${t(u.m.what)}. 바퀴통의 방법: ${t(u.m.method)}.`
  : `${i + 1}. ${unitName(u.m)}, ${u.m.title}. It moves ${and(u.m.moving).toLowerCase()} and holds ${and(u.m.held.map(([, v]) => v).filter(Boolean))}. ${u.m.rel === 'start' ? 'It is where the core starts' : `It ${verb[u.m.rel]} ${u.m.what}`}, with ${u.m.method.toLowerCase()} at the hub.`);
const constructs = units.length ? {
  route: {
    dom: { x: [0, 1], y: [0, 1] },
    callout: false,
    build: () => ({
      story: [
        { say: LANG === 'ko' ? `${t(c.name)}의 단원 ${units.length}개를 과목에서 가르치는 순서대로 바퀴 위에 놓는다. 첫 단원은 ${t(unitName(units[0].m))}, 마지막 단원은 ${t(unitName(units.at(-1).m))}이다.` : `${c.name} on the wheel: ${units.length} units, from ${unitName(units[0].m)} to ${unitName(units.at(-1).m)}, in the order the course teaches them.` },
        ...units.map((u, i) => ({ say: say(u, i), dur: 1.2 })),
        { say: 'The whole path. Each unit changed one thing, and the course is the sequence of those changes.' },
      ],
      model: (b) => (b >= 1 && b <= units.length ? stateOf(units[b - 1].m) : null),
    }),
  },
} : {};
const routes = units.length ? [{ name: c.name, places, c: 'ochre', fid: 'route', show: [1], upto: [0, ...stops, stops.at(-1)] }] : [];

$('#tb-course').textContent = t(c.name);
$('#tb-units').textContent = String(units.length);
$('#tb-weeks').textContent = String(c.weeks.length);
$('#tb-side').textContent = t(c.side === 'field' ? 'Field' : 'Core');
if (!units.length) root.querySelector('#c-path')?.remove();
await setupPage({ figs: { route: drawPath }, constructs, world: {}, archive: units.length ? { figure: 'route', end: '#c-path', routes } : null, build: BUILD_ALL, stages: 0, unit: 'Course', part: c.side === 'field' ? 'Field course' : 'Core course', name: t(c.name) });
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });
