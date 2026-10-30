// Part 2: beyond the flat page. Figures in p2-figs.js; what each raises when the
// page is folded, in p2-fold.js. Three figures follow the reader's settings.

import { FIGS } from './p2-figs.js';
import { CONSTRUCTS } from './p2-fold.js';
import { setupPage } from './page.js';

const state = { p: 0.05, mix: [3, 4, 2, 1, 1], shock: 4 };
const page = await setupPage({
  figs: FIGS,
  constructs: CONSTRUCTS,
  data: { state },
  stages: 6,
  unit: 'Section',
  part: 'Part 2',
  name: 'Beyond the flat page',
});

const $ = (s) => document.querySelector(s);
$('#ctl-p').addEventListener('input', (ev) => {
  state.p = Number(ev.target.value);
  $('#out-p').textContent = state.p.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  page.redraw('2.1');
});
for (const input of document.querySelectorAll('[data-mix]')) {
  input.addEventListener('input', () => {
    state.mix[Number(input.dataset.mix)] = Number(input.value);
    page.redraw('2.4');
  });
}
$('#ctl-shock').addEventListener('input', (ev) => {
  state.shock = Number(ev.target.value);
  $('#out-shock').textContent = String(state.shock);
  page.redraw('2.5');
});
