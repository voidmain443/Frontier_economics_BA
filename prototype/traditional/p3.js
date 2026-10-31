// Part 3: a new archive. The plan is in p3-figs.js. Folded, the wheel it
// unrolls lies beside the page, seen whole, with the routes through it
// (wheel.js, docs/engine.md).

import { FIGS } from './p3-figs.js';
import { COURSES } from './curriculum.js';
import { setupPage } from './page.js';
import { PLACE_P1, BUILD_P3, placeOfLink } from './wheel.js';

// the textbooks, with the question each answers
const host = document.querySelector('#course-index');
for (const [side, name] of [['core', 'The core'], ['field', 'The field courses']]) {
  const h = document.createElement('h3');
  h.textContent = name;
  const ul = document.createElement('ul');
  ul.className = 'course-grid';
  for (const c of COURSES.filter((x) => x.side === side)) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="course.html?c=${c.id}"><b>${c.short}</b><span>${c.name}</span><i>${c.question ?? `${c.weeks.length} weeks`}</i></a>`;
    ul.appendChild(li);
  }
  host.append(h, ul);
}

// the routes drawn through the wheel: the classical sequence of Part 1, figure
// by figure, drawn on in beat 4 of the plan's story, and the three paths of
// section 4, from their links, which come in at beat 5
const byNumber = (a, b) => { const [x1, y1] = a.split('.').map(Number); const [x2, y2] = b.split('.').map(Number); return x1 - x2 || y1 - y2; };
const routes = [
  { name: 'Part 1, the classical sequence', places: Object.keys(PLACE_P1).sort(byNumber).map((k) => PLACE_P1[k]), c: 'white', draw: 4 },
  ...[...document.querySelectorAll('.paths section')].map((sec, i) => ({
    name: sec.querySelector('h3').textContent.split(':')[0],
    places: [...sec.querySelectorAll('a')].map((a) => placeOfLink(a.getAttribute('href'))).filter(Boolean),
    c: ['ochre', 'cobalt', 'olive'][i],
    show: [5],
  })),
];

// the plan tells its story over the whole wheel (fold.js): the wheel is built
// ring by ring, from the rim in to the hub (BUILD_P3), then the routes come in
const constructs = {
  '3.1': {
    dom: { x: [0, 1], y: [0, 1] },
    callout: false,
    build: () => ({
      story: [
        { say: 'The plan of the archive: four layers of what economics studies, six cells each, and every name a door to the course that teaches it.' },
        { say: 'Roll the plan up and each layer is a ring of one wheel, Frank Knight’s wheel of wealth (1933). Build it from the rim in. First the agents, where everything that circulates starts and ends.', cam: { az: 0.12, el: 0.06, zoom: 0.92 }, dur: 1.4 },
        { say: 'Then the markets, where agents meet: goods, labor, money, capital, foreign exchange, and the land and air that have no market until one is made. What the agents send one another starts to circulate through them; each route first carries one parcel alone.', dur: 1.4 },
        { say: 'Then the institutions that set the rules they meet under, with taxes flowing through theirs, and at the hub the methods that every other ring is built with.', dur: 1.4 },
        { say: 'A course is one route through the wheel. The classical sequence of Part 1 starts in one market, goes out to the household and the firm, in to strategy and equilibrium at the hub, back out through the markets of macroeconomics, and visits every ring in the field courses.', cam: { az: 0, el: 0.14, zoom: 1 }, dur: 3.2 },
        { say: 'The three paths of section 4 enter the wheel elsewhere: by a question, by an agent, by a market. Each cell’s name is a door.', dur: 1.4 },
      ],
    }),
  },
};

await setupPage({ figs: FIGS, constructs, world: {}, archive: { figure: '3.1', end: '#a4', routes }, build: BUILD_P3, stages: 5, unit: 'Section', part: 'Part 3', name: 'A new archive' });
