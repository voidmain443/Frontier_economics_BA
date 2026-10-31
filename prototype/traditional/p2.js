// Part 2: unlike and connected. Figures in p2-figs.js; what each raises when the
// page is folded, in p2-fold.js. Four figures follow the reader's settings.

import { FIGS } from './p2-figs.js';
import { CONSTRUCTS } from './p2-fold.js';
import { setupPage } from './page.js';
import { PLACE_P2, BUILD_P2 } from './wheel.js';
import { SECTOR_NAMES } from './p2-models.js';

const state = { p: 0.05, mix: [3, 4, 2, 1, 1], shock: 4, sector: 13 };
const page = await setupPage({
  figs: FIGS,
  constructs: CONSTRUCTS,
  // the cell of the wheel each section opens in (docs/engine.md)
  world: PLACE_P2,
  // the wheel Part 1 built, and the two cells it left empty
  build: BUILD_P2,
  data: { state },
  // Korean households by fifths of income (2.2); Korea's input-output table (2.6)
  files: ['korea-households', 'korea-io'],
  stages: 8,
  unit: 'Section',
  part: 'Part 2',
  name: 'Unlike and connected',
});

const $ = (s) => document.querySelector(s);
$('#ctl-p').addEventListener('input', (ev) => {
  state.p = Number(ev.target.value);
  $('#out-p').textContent = state.p.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  page.redraw('2.4');
});
for (const input of document.querySelectorAll('[data-mix]')) {
  input.addEventListener('input', () => {
    state.mix[Number(input.dataset.mix)] = Number(input.value);
    page.redraw('2.3');
  });
}
$('#ctl-shock').addEventListener('input', (ev) => {
  state.shock = Number(ev.target.value);
  $('#out-shock').textContent = String(state.shock);
  page.redraw('2.7');
});
$('#ctl-sector').addEventListener('input', (ev) => {
  state.sector = Number(ev.target.value);
  $('#out-sector').textContent = SECTOR_NAMES[page.data['korea-io']?.sectors[state.sector]?.code] ?? '';
  page.redraw('2.6');
});
