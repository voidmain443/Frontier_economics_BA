// Renders the curriculum data into the sheet: week ladders for each course,
// junction blocks with their proof chains, and the field-course sections.
// The atlas reads these same elements back to build the towers in 3D.

import { COURSES, JUNCTIONS } from './curriculum.js';

const byWeek = {};
for (const c of COURSES) c.weeks.forEach((w, i) => { byWeek[`${c.id}-${i + 1}`] = { c, w, n: i + 1 }; });

const ref = (id) => {
  const hit = byWeek[id];
  if (!hit) return id;
  return `<a href="#${id}">${hit.c.short} ${hit.n}</a>`;
};

function week(c, w, n) {
  const li = document.createElement('li');
  li.className = 'week';
  li.id = `${c.id}-${n}`;
  li.dataset.course = c.id;
  li.dataset.week = n;
  const links = [];
  if (w.uses?.length) links.push(`<b>Builds on</b> ${w.uses.map(ref).join(', ')}`);
  if (w.feeds?.length) links.push(`<b>Used in</b> ${w.feeds.map(ref).join(', ')}`);
  li.innerHTML = `<span class="wk-no">${n}</span><div class="wk-body">` +
    `<h4>${w.t}</h4>` +
    (w.q ? `<p class="wk-q">${w.q}</p>` : '') +
    (w.a ? `<p class="wk-a">${w.a}</p>` : '') +
    (w.eq ? `<p class="wk-eq">${w.eq}</p>` : '') +
    (links.length ? `<p class="wk-links">${links.join('<span class="sep"></span>')}</p>` : '') +
    `</div>`;
  return li;
}

function ladder(c, from = 1, to = c.weeks.length) {
  const ol = document.createElement('ol');
  ol.className = 'weeks';
  ol.start = from;
  Object.assign(ol.dataset, { course: c.id, name: c.name, short: c.short, side: c.side });
  for (let n = from; n <= to; n++) ol.appendChild(week(c, c.weeks[n - 1], n));
  return ol;
}

function junction(j) {
  const aside = document.createElement('aside');
  aside.className = 'junction';
  aside.id = `j-${j.id}`;
  aside.dataset.links = j.links.join(' ');
  aside.innerHTML = `<p class="jx-title">Junction: ${j.title}</p>` +
    `<p class="jx-text">${j.text}</p>` +
    (j.chain ? `<ol class="chain">${j.chain.map((s) => `<li>${s}</li>`).join('')}</ol>` : '') +
    `<p class="jx-links"><b>Where it reappears</b> ${j.links.slice(1).map(ref).join(', ')}</p>`;
  return aside;
}

// Placeholders in the HTML say where each piece goes:
//   <div data-ladder="micro" data-from="1" data-to="4"></div>
//   <div data-junction="ge"></div>
//   <div data-fields></div>
export function renderCurriculum(root) {
  const courseById = Object.fromEntries(COURSES.map((c) => [c.id, c]));
  for (const slot of root.querySelectorAll('[data-ladder]')) {
    const c = courseById[slot.dataset.ladder];
    if (!c) continue;
    const from = Number(slot.dataset.from ?? 1);
    const to = Number(slot.dataset.to ?? c.weeks.length);
    slot.replaceWith(ladder(c, from, to));
  }
  for (const slot of root.querySelectorAll('[data-junction]')) {
    const j = JUNCTIONS.find((x) => x.id === slot.dataset.junction);
    if (j) slot.replaceWith(junction(j));
  }
  const fields = root.querySelector('[data-fields]');
  if (fields) {
    const frag = document.createDocumentFragment();
    for (const c of COURSES.filter((x) => x.side === 'field')) {
      const sec = document.createElement('section');
      sec.className = 'field';
      sec.id = `field-${c.id}`;
      sec.innerHTML = `<h3>${c.name}</h3>` +
        `<p class="field-q"><b>The question</b> ${c.question}</p>` +
        `<p class="field-from"><b>Built from</b> ${c.from}</p>` +
        (c.adds ? `<p class="field-adds"><b>Adds to the core</b> ${c.adds}</p>` : '') +
        (c.source ? `<p class="field-src">Sequence after ${c.source}.</p>` : '');
      sec.appendChild(ladder(c));
      for (const j of JUNCTIONS.filter((x) => x.home === c.id)) sec.appendChild(junction(j));
      frag.appendChild(sec);
    }
    fields.replaceWith(frag);
  }
  return { courses: COURSES, junctions: JUNCTIONS };
}
