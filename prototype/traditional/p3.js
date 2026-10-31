// Part 3: a new archive. The plan is in p3-figs.js. Folded, the wheel it
// unrolls lies beside the page, seen whole, with the routes through it
// (wheel.js, docs/engine.md).

import { FIGS } from './p3-figs.js';
import { COURSES } from './curriculum.js';
import { setupPage } from './page.js';
import { PLACE_P1, placeOfLink } from './wheel.js';

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
// by figure, and the three paths of section 4, from their links
const byNumber = (a, b) => { const [x1, y1] = a.split('.').map(Number); const [x2, y2] = b.split('.').map(Number); return x1 - x2 || y1 - y2; };
const routes = [
  { name: 'Part 1, the classical sequence', places: Object.keys(PLACE_P1).sort(byNumber).map((k) => PLACE_P1[k]), c: 'white' },
  ...[...document.querySelectorAll('.paths section')].map((sec, i) => ({
    name: sec.querySelector('h3').textContent.split(':')[0],
    places: [...sec.querySelectorAll('a')].map((a) => placeOfLink(a.getAttribute('href'))).filter(Boolean),
    c: ['ochre', 'cobalt', 'olive'][i],
  })),
];

await setupPage({ figs: FIGS, constructs: {}, world: {}, archive: { figure: '3.1', end: '#a4', routes }, stages: 5, unit: 'Section', part: 'Part 3', name: 'A new archive' });
