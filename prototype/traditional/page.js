// What every part's page does: load its data, draw its figures, number its
// equations, keep the title block current, and offer the one 3D mode, the page
// fold (fold.js), with that part's constructs.

const $ = (s) => document.querySelector(s);

export async function setupPage({ figs, constructs, world = null, archive = null, files = [], agents = {}, stages = 8, unit = 'Stage', part = 'Part 1', name = '', data: extra = {} }) {
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
  function update() {
    if (!tb.sheet) return;
    const line = scrollY + innerHeight * 0.55;
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
    tb.sheet.textContent = no ? `${unit} ${no} of ${stages}` : part;
    tb.name.textContent = stage?.dataset.name ?? name;
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
  let fold = null;
  const setLabel = (on) => {
    btn.textContent = on ? 'Lay the page flat' : 'Fold the page into space';
    btn.setAttribute('aria-pressed', String(on));
  };
  if (btn) {
    try {
      const { createFold } = await import('./fold.js');
      fold = await createFold({ canvas: $('#stage'), sheet, labelsRoot: $('#expo-labels'), constructs, data, world, archive, onChange: setLabel });
      if (!fold.supported) {
        status.textContent = `The fold needs WebGPU with HTML-in-Canvas. ${fold.reason} The flat page is complete on its own.`;
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
          } catch (err) {
            console.error(err);
            status.textContent = `Could not fold the page: ${err.message}`;
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
      status.textContent = `The fold could not start: ${err.message}. The flat page is complete on its own.`;
    }
  }

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
