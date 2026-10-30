// Part 3: a new archive. The plan is in p3-figs.js; the building it rises into
// when the page is folded, in p3-fold.js.

import { FIGS } from './p3-figs.js';
import { CONSTRUCTS } from './p3-fold.js';
import { COURSES } from './curriculum.js';
import { setupPage } from './page.js';

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

await setupPage({ figs: FIGS, constructs: CONSTRUCTS, stages: 5, unit: 'Section', part: 'Part 3', name: 'A new archive' });
