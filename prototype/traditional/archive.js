// Part 3: the archive. The flat page carries the proposal; the 3D space arranges
// agents, markets and methods, and every name in it opens a course.

import { drawAll } from './figures.js';
import { renderAnatomy } from './anatomy.js';
import { createExpo } from './expo.js';
import { COURSES } from './curriculum.js';

const $ = (s) => document.querySelector(s);
const sheet = $('#sheet');

await document.fonts.ready;
const ctx = drawAll(sheet);
renderAnatomy(sheet, ctx);

// the textbooks, with a line on what each is for
const host = $('#course-index');
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

const status = $('#enter-status');
const expo = await createExpo({
  canvas: $('#stage'),
  sheet,
  labelsRoot: $('#expo-labels'),
  ctx,
  panel: {
    root: $('#dive'), fig: $('#dive-fig'), count: $('#dive-count'), title: $('#dive-title'), text: $('#dive-text'),
    eq: $('#dive-eq'), slider: $('#dive-slider'), sliderLabel: $('#dive-slider-label'), range: $('#dive-range'), out: $('#dive-out'),
    prev: $('#dive-prev'), next: $('#dive-next'), dots: $('#dive-dots'), exit: $('#dive-exit'),
  },
  onChange() {},
}).catch((err) => ({ supported: false, reason: err.message }));

const open = async (id, b) => {
  if (!expo.supported) return;
  b.disabled = true;
  status.textContent = '';
  try {
    await expo.exhibit(id);
  } catch (err) {
    console.error(err);
    status.textContent = `Could not open the space: ${err.message}`;
  } finally {
    b.disabled = false;
  }
};
if (!expo.supported) {
  for (const b of document.querySelectorAll('.enter')) b.disabled = true;
  status.textContent = `The 3D space is unavailable here: ${expo.reason} The proposal below reads the same.`;
} else {
  $('#enter-archive').addEventListener('click', (ev) => open('archive', ev.currentTarget));
  // the whole sheet bends into space, as in the reference video; the archive stands beside it as you read on
  const foldBtn = $('#fold-page');
  const setFold = (on) => {
    foldBtn.textContent = on ? 'Fold flat' : 'Fold this page into space';
    foldBtn.setAttribute('aria-pressed', String(on));
  };
  foldBtn.addEventListener('click', async () => {
    if (expo.open) {
      expo.fold();
      setFold(false);
      return;
    }
    foldBtn.disabled = true;
    try {
      await expo.unfold();
      setFold(true);
    } catch (err) {
      console.error(err);
      status.textContent = `Could not fold the page: ${err.message}`;
    } finally {
      foldBtn.disabled = false;
    }
  });
  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && expo.open && !expo.diving && !expo.exhibiting) {
      expo.fold();
      setFold(false);
    }
  });
  $('#enter-world').addEventListener('click', (ev) => open('world', ev.currentTarget));
  const block = $('#anat-archive');
  if (block) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'an-open';
    b.textContent = 'Enter in 3D';
    b.addEventListener('click', () => open('archive', b));
    block.querySelector('.an-title').appendChild(b);
  }
}
