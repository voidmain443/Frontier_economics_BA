// What every part's page does: load its data, draw its figures, number its
// equations, keep the title block current, and offer the one 3D mode, the page
// fold (fold.js), with that part's constructs.

import { t } from './i18n.js';

const $ = (s) => document.querySelector(s);

export async function setupPage({ figs, constructs, world = null, whole = null, archive = null, build = null, files = [], agents = {}, stages = 8, unit = 'Stage', part = 'Part 1', name = '', data: extra = {} }) {
  const sheet = $('#sheet');
  const data = { ...extra };
  await Promise.all(files.map(async (f) => {
    try {
      const r = await fetch(`data/${f}.json`);
      data[f] = r.ok ? await r.json() : null;
    } catch {
      data[f] = null;
    }
  }));
  await document.fonts.ready;

  function draw(fig) {
    const fn = figs[fig.dataset.fig];
    const art = fig.querySelector('.fig-art');
    if (!fn || !art) return;
    art.replaceChildren();
    art.className = 'fig-art';
    try {
      fn(art, data);
    } catch (err) {
      console.error(`Figure ${fig.dataset.fig}`, err);
      art.replaceChildren();
      const p = document.createElement('p');
      p.className = 'fig-error';
      p.textContent = `Figure ${fig.dataset.fig} could not be drawn (${err.message}). The text beside it describes it in full.`;
      art.appendChild(p);
    }
  }
  for (const fig of sheet.querySelectorAll('figure[data-fig]')) draw(fig);
  // a # (a link, or the language switch) lands where it points, and stays
  // there while the rest of the page takes its height, until the reader moves
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) {
    const keep = new ResizeObserver(() => target.scrollIntoView({ block: 'start' }));
    keep.observe(sheet);
    const MOVES = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const stop = () => { keep.disconnect(); for (const e of MOVES) removeEventListener(e, stop); };
    for (const e of MOVES) addEventListener(e, stop, { passive: true });
    setTimeout(stop, 5000);
  }

  for (const st of sheet.querySelectorAll('.stage[data-no]')) {
    for (const eq of st.querySelectorAll('.eq')) eq.dataset.ch = `${st.dataset.no}.`;
  }

  // zone marks down the left margin, one band per 1000 px of sheet
  function drawZones() {
    const z = sheet.querySelector('.zones');
    if (!z) return;
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

  // title block: which stage, and what has accumulated
  const tb = { sheet: $('#tb-sheet'), name: $('#tb-course'), agents: $('#tb-agents'), figs: $('#tb-figs'), eqs: $('#tb-eqs') };
  let marks = [];
  function measure() {
    const top = (el) => el.getBoundingClientRect().top + scrollY;
    marks = [
      ...[...sheet.querySelectorAll('.stage[data-no]')].map((s) => ({ y: top(s), stage: s })),
      ...[...sheet.querySelectorAll('figure[data-fig]')].map((f) => ({ y: top(f) + f.offsetHeight * 0.5, fig: true })),
      ...[...sheet.querySelectorAll('.eq')].map((e) => ({ y: top(e), eq: true })),
    ].sort((a, b) => a.y - b.y);
  }
  let last = '';
  // the fold, once it has started (below)
  let fold = null;
  function update() {
    if (!tb.sheet) return;
    // while folded, a story can hold the reading line still as the page scrolls
    const line = fold?.focus != null ? fold.focus + innerHeight * 0.05 : scrollY + innerHeight * 0.55;
    let stage = null;
    let nf = 0;
    let ne = 0;
    for (const m of marks) {
      if (m.y > line) break;
      if (m.stage) stage = m.stage;
      if (m.fig) nf++;
      if (m.eq) ne++;
    }
    const no = stage?.dataset.no;
    const key = `${no}|${nf}|${ne}`;
    if (key === last) return;
    last = key;
    tb.sheet.textContent = no ? t(`${unit} ${no} of ${stages}`) : t(part);
    tb.name.textContent = stage?.dataset.name ?? t(name);
    if (tb.agents) tb.agents.textContent = String(no ? agents[no] ?? 0 : 0);
    if (tb.figs) tb.figs.textContent = String(nf);
    if (tb.eqs) tb.eqs.textContent = String(ne);
  }
  function relayout() {
    drawZones();
    measure();
    last = '';
    update();
  }
  relayout();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(sheet);

  // the one 3D mode: fold the whole page
  const btn = $('#unfold');
  const status = $('#tb-status');
  const setLabel = (on) => {
    btn.textContent = on ? t('Lay the page flat') : t('Fold the page into space');
    btn.setAttribute('aria-pressed', String(on));
  };
  if (btn) {
    try {
      const { createFold } = await import('./fold.js');
      fold = await createFold({ canvas: $('#stage'), sheet, labelsRoot: $('#expo-labels'), constructs, data, world, whole, archive, build, onChange: setLabel });
      if (!fold.supported) {
        status.textContent = `${t('The fold needs WebGPU with HTML-in-Canvas.')} ${t(fold.reason)} ${t('The flat page is complete on its own.')}`;
        fold = null;
      } else {
        btn.hidden = false;
        for (const p of sheet.querySelectorAll('.needs-fold')) p.hidden = false;
        btn.addEventListener('click', async () => {
          if (fold.open) {
            fold.fold();
            return;
          }
          btn.disabled = true;
          status.textContent = '';
          try {
            await fold.unfold();
            // the fold may have moved the scroll position to hold a story
            last = '';
            update();
          } catch (err) {
            console.error(err);
            status.textContent = `${t('Could not fold the page:')} ${err.message}`;
          } finally {
            btn.disabled = false;
          }
        });
        addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape' && fold.open) fold.fold();
        });
      }
    } catch (err) {
      console.error(err);
      status.textContent = `${t('The fold could not start:')} ${err.message}. ${t('The flat page is complete on its own.')}`;
    }
  }

  if (fold && new URLSearchParams(location.search).has('perf')) probe(fold);

  return {
    data,
    // redraw one figure after its controls change; while folded the fold shows
    // it at once, otherwise the next fold captures it anew
    redraw(id) {
      const fig = sheet.querySelector(`figure[data-fig="${id}"]`);
      if (fig) draw(fig);
      fold?.refresh(id);
    },
  };
}

// ?perf: frame times while the page is folded, shown in the title block, for
// the check on the base machine (docs/phase4-test.md). ?perf=walk also scrolls
// the folded page from top to bottom by itself, at &speed= px a second (420,
// one story beat a second, by default), so that every machine is measured on
// the same path. window.__perf holds the numbers.
function probe(fold) {
  const q = new URLSearchParams(location.search);
  const walk = q.get('perf') === 'walk';
  const speed = Number(q.get('speed')) || 420;
  const out = document.createElement('p');
  out.className = 'tb-perf';
  out.setAttribute('aria-hidden', 'true');
  document.querySelector('.titleblock')?.appendChild(out);
  const times = [];
  const stat = () => {
    const t = [...times].sort((a, b) => a - b);
    const at = (f) => t[Math.min(t.length - 1, Math.floor(f * t.length))] ?? 0;
    return { frames: t.length, median: at(0.5), p95: at(0.95), p99: at(0.99), slowest: t.at(-1) ?? 0 };
  };
  let gpu = '';
  navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' }).then((a) => {
    const i = a?.info;
    gpu = i ? [i.vendor, i.architecture, i.description].filter(Boolean).join(' ') : '';
  });
  window.__perf = { times, stat, get gpu() { return gpu; } };
  let last = 0;
  let shown = 0;
  let done = false;
  let walked = 0;
  const tick = (now) => {
    if (fold.open && last) {
      const dt = now - last;
      if (dt < 1000) times.push(dt);
      if (walk && !done) {
        walked += (speed * Math.min(dt, 100)) / 1000;
        const end = document.documentElement.scrollHeight - innerHeight;
        scrollTo({ top: Math.min(end, walked), behavior: 'instant' });
        if (walked >= end) done = true;
      }
    }
    last = now;
    if (now - shown > 1000 && times.length) {
      shown = now;
      const S = stat();
      out.textContent = `${walk ? (done ? 'Walk done. ' : 'Walking. ') : ''}Frames ${S.frames}: median ${S.median.toFixed(1)} ms, 95% ${S.p95.toFixed(1)}, 99% ${S.p99.toFixed(1)}, slowest ${S.slowest.toFixed(1)}${gpu ? `. ${gpu}` : ''}`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  if (walk) out.textContent = 'Fold the page to start the walk.';
}
