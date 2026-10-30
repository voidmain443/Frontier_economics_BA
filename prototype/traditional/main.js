import { FIGURES, drawAll } from './figures.js';
import { createExpo } from './expo.js';
import { renderCurriculum } from './ladder.js';
import { createRecord } from './record.js';
import { renderAnatomy } from './anatomy.js';
import { renderFoldDissections } from './fold-dissect.js';

const $ = (s) => document.querySelector(s);
const sheet = $('#sheet');

renderCurriculum(sheet);
await document.fonts.ready;
const ctx = drawAll(sheet);
renderFoldDissections(sheet);
renderAnatomy(sheet, ctx);

// Equation numbers per chapter: (3.1), (3.2) …
for (const ch of sheet.querySelectorAll('.chapter[data-no]')) {
  for (const eq of ch.querySelectorAll('.eq')) eq.dataset.ch = `${ch.dataset.no}.`;
}

// Zone marks down the left margin of the sheet, one band per 1000 px.
function drawZones() {
  const z = sheet.querySelector('.zones');
  z.replaceChildren();
  const H = sheet.offsetHeight - 48;
  for (let y = 1000; y < H; y += 1000) {
    const t = document.createElement('i');
    t.style.top = `${y}px`;
    z.appendChild(t);
  }
  for (let i = 0; i * 1000 < H; i++) {
    const s = document.createElement('span');
    s.textContent = String(i + 1);
    s.style.top = `${Math.min(i * 1000 + 500, H - 20)}px`;
    z.appendChild(s);
  }
}

// ---------- title block: where you are and what has accumulated ----------

const tb = {
  sheet: $('#tb-sheet'), course: $('#tb-course'),
  dims: $('#tb-dims'), agents: $('#tb-agents'), eqs: $('#tb-eqs'),
  button: $('#unfold'), status: $('#tb-status'),
};
let marks = null;
let unfolded = false;

function measure() {
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  const chapters = [...sheet.querySelectorAll('.chapter[data-no]')]
    .filter((c) => Number(c.dataset.no) <= 8)
    .map((c) => ({ no: c.dataset.no, name: c.dataset.name, lede: c.querySelector('.lede')?.textContent ?? '', y: top(c) }));
  const figs = [...sheet.querySelectorAll('figure[data-fig]')].map((f) => {
    const spec = FIGURES[f.dataset.fig] ?? {};
    const X = spec.expo ? spec.expo(null, ctx) : {};
    return { y: top(f), axes: spec.axes ?? [], hidden: X.axes ?? [], agents: (X.agents ?? []).map((a) => a.name), eqs: (X.eqs ?? []).length };
  });
  const parts = sheet.querySelector('[data-anchor="fields"]');
  if (parts) figs.push({ y: top(parts), axes: [], hidden: [], agents: ['Rest of world'], eqs: 11 });
  const eqs = [...sheet.querySelectorAll('.eq')].map(top);
  const weeks = [...sheet.querySelectorAll('li.week')].map((li) => ({
    y0: top(li) + 24, y1: top(li) + li.offsetHeight + 160,
    label: `${li.closest('ol').dataset.name}, week ${li.dataset.week}: ${li.querySelector('h4').textContent}`,
  }));
  marks = { chapters, figs, eqs, weeks };
}

function updateTitleBlock() {
  if (!marks) return;
  const line = scrollY + innerHeight * (unfolded ? 0.5 : 0.55);
  const ch = marks.chapters.filter((c) => c.y <= line).pop();
  tb.sheet.textContent = `Sheet ${ch ? ch.no : 0} of 8`;
  const wk = marks.weeks.filter((w) => w.y0 <= line && line <= w.y1).pop();
  tb.course.textContent = wk ? wk.label : ch ? (ch.lede ? `${ch.name}: ${ch.lede}` : ch.name) : 'How economics is taught';
  const seen = marks.figs.filter((f) => f.y <= line);
  const dims = new Set(seen.flatMap((f) => (unfolded ? [...f.axes, ...f.hidden] : f.axes)));
  const agents = new Set(seen.flatMap((f) => f.agents));
  const eqs = marks.eqs.filter((y) => y <= line).length + (unfolded ? seen.reduce((a, f) => a + f.eqs, 0) : 0);
  tb.dims.textContent = dims.size;
  tb.agents.textContent = agents.size;
  tb.eqs.textContent = eqs;
}

drawZones();
measure();
updateTitleBlock();
addEventListener('scroll', updateTitleBlock, { passive: true });
addEventListener('resize', () => {
  drawZones();
  measure();
  updateTitleBlock();
});

// ---------- the record: charts that advance with the reading line ----------

const record = await createRecord(sheet).catch((err) => {
  console.error(err);
  return null;
});
measure();

// ---------- unfold ----------

const expo = await createExpo({
  canvas: $('#stage'),
  sheet,
  labelsRoot: $('#expo-labels'),
  ctx,
  record,
  panel: {
    root: $('#dive'), fig: $('#dive-fig'), count: $('#dive-count'), title: $('#dive-title'), text: $('#dive-text'),
    eq: $('#dive-eq'), slider: $('#dive-slider'), sliderLabel: $('#dive-slider-label'), range: $('#dive-range'), out: $('#dive-out'),
    prev: $('#dive-prev'), next: $('#dive-next'), dots: $('#dive-dots'), exit: $('#dive-exit'),
  },
  onChange(open) {
    unfolded = open;
    updateTitleBlock();
  },
}).catch((err) => ({ supported: false, reason: err.message }));

if (!expo.supported) {
  tb.button.disabled = true;
  tb.status.textContent = `Unfolding is unavailable: ${expo.reason} Everything on the sheet reads flat.`;
} else {
  // every derivation opens on its own in space; the title block opens the world map
  const openExhibit = async (id, b) => {
    if (b) b.disabled = true;
    try {
      await expo.exhibit(id);
    } catch (err) {
      console.error(err);
      tb.status.textContent = `Could not open the space: ${err.message}`;
    } finally {
      if (b) b.disabled = false;
    }
  };
  tb.button.addEventListener('click', () => openExhibit('world', tb.button));
  for (const block of sheet.querySelectorAll('.anatomy')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'an-open';
    b.textContent = 'Assemble in 3D';
    b.addEventListener('click', () => openExhibit(block.id.replace('anat-', ''), b));
    block.querySelector('.an-title').appendChild(b);
  }
  // a concept anatomy unfolds the page itself and takes its figure apart there
  for (const block of sheet.querySelectorAll('.dissect')) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'an-open';
    b.textContent = 'Unfold and take apart';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await expo.lookInside(`ds-${block.id.replace('anat-', '')}`);
      } catch (err) {
        console.error(err);
        tb.status.textContent = `Could not unfold: ${err.message}`;
      } finally {
        b.disabled = false;
      }
    });
    block.querySelector('.an-title').appendChild(b);
  }
  // a link such as classical.html#3d-envelope opens that assembly directly
  const deep = location.hash.match(/^#3d-(.+)$/);
  if (deep) openExhibit(deep[1]);
  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && expo.open && !expo.diving && !expo.exhibiting) expo.fold();
  });

  // Every unfoldable figure can be opened on its own from the flat page.
  for (const fig of sheet.querySelectorAll('figure[data-fig]')) {
    if (!expo.has(fig.dataset.fig)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fig-dive';
    b.textContent = 'Look inside';
    b.addEventListener('click', async () => {
      b.disabled = true;
      try {
        await expo.lookInside(fig.dataset.fig);
      } catch (err) {
        console.error(err);
        tb.status.textContent = `Could not open the figure: ${err.message}`;
      } finally {
        b.disabled = false;
      }
    });
    fig.querySelector('figcaption').appendChild(b);
  }
  drawZones();
  measure();
  updateTitleBlock();
}
