// One textbook page per course: its question, its weeks, where it meets other
// courses, where it appears in Parts 1 and 2, and what to read next.

import { COURSES, JUNCTIONS } from './curriculum.js';
import { renderCurriculum } from './ladder.js';

// where each course appears in Part 1 (classical.html) and Part 2 (beyond.html)
const PLACES = {
  principles: [['Stage 1: one market', 'classical.html#s1'], ['Figure 1.1: supply and demand, and the income it holds fixed', 'classical.html#f1-1'], ['Figure 1.2: surplus, and the trades a tax stops', 'classical.html#f1-2']],
  math: [['Stage 2: the Lagrange condition', 'classical.html#s2'], ['Figure 2.1: the top of the hill along the fence', 'classical.html#f2-1'], ['Figure 3.1: the envelope theorem', 'classical.html#f3-1']],
  micro: [['Stage 2: opening up the household', 'classical.html#s2'], ['Stage 3: opening up the firm', 'classical.html#s3'], ['Stage 5: all markets at once', 'classical.html#s5'], ['Figure 5.3: the market for lemons', 'classical.html#f5-3']],
  games: [['Stage 4: a few firms', 'classical.html#s4'], ['Figure 4.2: a threat that would not be carried out', 'classical.html#f4-2'], ['Part 2: games real people play', 'beyond.html#b3']],
  macro: [['Stage 6: time, money and government', 'classical.html#s6'], ['Figure 6.3: the Phillips curve and expectations', 'classical.html#f6-3'], ['Figure 6.4: the central bank chooses', 'classical.html#f6-4'], ['Part 2: unlike households', 'beyond.html#b2']],
  metrics: [['Stage 7: measurement', 'classical.html#s7'], ['Figure 7.1: the scatter is a shadow', 'classical.html#f7-1'], ['Figure 7.2: a cloud of prices is not a demand curve', 'classical.html#f7-2']],
  trade: [['8.1 International trade adds a second country', 'classical.html#c8-1']],
  intlfin: [['8.2 International finance adds the exchange rate', 'classical.html#c8-2']],
  banking: [['8.3 Money and banking adds the balance sheet', 'classical.html#c8-3'], ['Part 2: contagion between banks', 'beyond.html#b7']],
  finance: [['8.4 Financial economics adds prices of risk', 'classical.html#c8-4']],
  public: [['8.5 Public economics adds the state', 'classical.html#c8-5'], ['Figure 5.2: a good that everyone uses', 'classical.html#f5-2']],
  environmental: [['8.6 Environmental economics adds the very long horizon', 'classical.html#c8-6']],
  labor: [['8.7 Labor economics adds people as the commodity', 'classical.html#c8-7'], ['Part 2: who trades with whom', 'beyond.html#b4']],
  io: [['8.8 Industrial organization adds strategy, in detail', 'classical.html#c8-8'], ['Part 2: no representative firm', 'beyond.html#b1'], ['Part 2: connected firms', 'beyond.html#b6']],
  behavioral: [['8.9 Behavioral economics adds psychology to the household', 'classical.html#c8-9'], ['Part 2: games real people play', 'beyond.html#b3']],
  development: [['8.10 Development economics adds institutions and missing markets', 'classical.html#c8-10']],
  history: [['8.11 Economic history adds time beyond the model', 'classical.html#c8-11']],
};

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

document.title = `${c.name} — Cross-Section`;
const root = $('#course');
const intro = c.side === 'field'
  ? `<p class="lede">${c.question}</p><p><b>Built from</b> ${c.from}${c.adds ? ` <b>It adds</b> ${c.adds}` : ''}</p>${c.source ? `<p class="field-src">Sequence after ${c.source}.</p>` : ''}`
  : '<p class="lede">A core course: every field course is assembled from its parts.</p>';
root.innerHTML = `<header class="opening"><p class="kicker">${c.side === 'field' ? 'Field course' : 'Core course'}</p><h1>${c.name}</h1>${intro}</header>` +
  `<section class="chapter"><h2>Week by week</h2><div data-ladder="${c.id}"></div></section>` +
  '<section class="chapter" id="c-parts"><h2>In Parts 1 and 2</h2><ul class="course-links" id="c-places"></ul></section>' +
  '<section class="chapter" id="c-jx"><h2>Where it meets other courses</h2><ul class="course-links" id="c-junctions"></ul></section>' +
  '<section class="chapter" id="c-read"><h2>Read next</h2><ul class="course-links" id="c-reading"></ul></section>';
renderCurriculum(root);

// links between weeks go to the course page that owns them
for (const a of root.querySelectorAll('.wk-links a[href^="#"]')) {
  const ref = a.getAttribute('href').slice(1);
  const owner = ref.replace(/-\d+$/, '');
  if (owner !== c.id) a.href = `course.html?c=${owner}#${ref}`;
}

$('#c-places').innerHTML = (PLACES[c.id] ?? []).map(([title, href]) => `<li><a href="${href}"><b>${title}</b></a></li>`).join('');

// junctions that pass through this course
const jx = JUNCTIONS.filter((j) => j.links.some((l) => l.startsWith(`${c.id}-`)));
$('#c-junctions').innerHTML = jx.length
  ? jx.map((j) => {
    const others = j.links.filter((l) => !l.startsWith(`${c.id}-`));
    const first = others[0] ?? j.links[0];
    return `<li><a href="course.html?c=${first.replace(/-\d+$/, '')}#${first}"><b>${j.title}</b><span>${others.map((l) => l.replace(/-(\d+)$/, ' $1')).join(', ')}</span></a></li>`;
  }).join('')
  : '<li>No junction passes through this course yet.</li>';

$('#c-reading').innerHTML = (READ[c.id] ?? []).map(([t, href]) => (href ? `<li><a href="${href}"><b>${t}</b></a></li>` : `<li><b>${t}</b></li>`)).join('');

if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'center' });
