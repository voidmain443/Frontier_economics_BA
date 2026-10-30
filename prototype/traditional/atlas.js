// The atlas: what the unfolded page builds in the space around it.
//
//  · Cards: every week, equation, junction and proof step lifts off the page as a
//    thin slab when it reaches the reading line, and stays hovering once read. The
//    page keeps a recess where it was.
//  · Towers: one per course, one floor per week, standing beside the sheet. Floors
//    fill in as their weeks are read, so the curriculum is built while you read.
//  · Bridges: each junction joins floors of different towers; when a junction is on
//    the reading line, threads run from its card on the page to every floor it joins.
//
// Everything is read from the DOM: the page is the ontology.

import { clamp, smooth, lerp } from './geom.js';
import { project } from './math.js';

const D2R = Math.PI / 180;

const LIFT = {
  week: { base: 0.016, extra: 0.05, tilt: 22, edge: [0.8, 0.84, 0.78], glow: 0 },
  eq: { base: 0.013, extra: 0.04, tilt: 16, edge: [1.0, 0.62, 0.55], glow: 0.55 },
  junction: { base: 0.03, extra: 0.075, tilt: 24, edge: [1.0, 0.82, 0.42], glow: 0.9 },
  step: { base: 0.012, extra: 0.03, tilt: 8, edge: [0.86, 0.91, 0.96], glow: 0.6 },
};

const HUES = [
  [0.86, 0.91, 0.96], [0.66, 0.6, 1.0], [0.52, 0.72, 1.0], [1.0, 0.6, 0.44], [0.45, 0.9, 0.78], [0.98, 0.5, 0.72],
  [1.0, 0.82, 0.42], [0.62, 0.86, 1.0], [0.78, 0.95, 0.5], [1.0, 0.7, 0.6], [0.7, 0.8, 0.95], [0.95, 0.75, 0.95],
  [0.6, 0.95, 0.9], [1.0, 0.9, 0.6], [0.85, 0.7, 1.0], [0.75, 0.75, 0.75], [0.9, 0.6, 0.5], [0.6, 0.7, 1.0],
];

// Tower footprints, as offsets from the sheet's edge (x) and from the reading line (s).
const CORE_SLOTS = [[-250, 300], [-560, 300], [-250, -360], [-560, -360], [-250, -1020], [-560, -1020], [-870, -360]];
const FIELD_SLOTS = [];
for (const ds of [-300, -900, -1500]) for (const dx of [210, 430, 650, 870]) FIELD_SLOTS.push([dx, ds]);
const FOOT = 130;
const FLOOR = 46;

export function createAtlas({ G, sheet, labelsRoot, tiles, toWorld, sheetBox, px }) {
  const pageRect = (el) => {
    const r = el.getBoundingClientRect();
    return [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
  };
  const mkLabel = (cls, html) => {
    const el = document.createElement('div');
    el.className = `xl ${cls}`;
    el.innerHTML = html;
    labelsRoot.appendChild(el);
    return el;
  };

  // ---------------------------------------------------------------- cards
  const cards = [];
  const addCard = (el, kind, extra = {}) => {
    const card = pageRect(el);
    if (card[3] - card[1] < 10 || card[2] - card[0] < 10) return;
    const slab = G.slab(card, tiles);
    const P = LIFT[kind];
    slab.edge = P.edge;
    slab.glow = P.glow;
    cards.push({ el, kind, card, slab, shadow: kind === 'step' ? null : G.shadow(card), center: (card[1] + card[3]) / 2, amount: 0, ...extra });
  };
  for (const el of sheet.querySelectorAll('.week')) addCard(el, 'week');
  for (const el of sheet.querySelectorAll('.eq')) addCard(el, 'eq');
  for (const el of sheet.querySelectorAll('.junction')) addCard(el, 'junction');
  const chains = [];
  for (const ol of sheet.querySelectorAll('.chain')) {
    const parent = cards.find((c) => c.kind === 'junction' && c.el.contains(ol));
    if (parent) parent.slab.hole = pageRect(ol);
    const steps = [...ol.children].map((li, i) => {
      addCard(li, 'step', { idx: i, parent });
      cards[cards.length - 1].slab.thick = 0.004;
      return cards[cards.length - 1];
    });
    chains.push({ steps, arrows: G.lines(steps.slice(1).map(() => [[0, 0, 0], [0, 0, 0]]), [0, 0, 1, 1], [0.86, 0.91, 0.96], 1.6, 0.9, false, 0, steps.length * 3) });
  }

  // ---------------------------------------------------------------- towers
  const courses = [];
  const byId = {};
  for (const ol of sheet.querySelectorAll('ol.weeks[data-course]')) {
    const id = ol.dataset.course;
    if (!byId[id]) {
      byId[id] = { id, name: ol.dataset.name ?? id, short: ol.dataset.short ?? ol.dataset.name ?? id, side: ol.dataset.side ?? 'core', weeks: [] };
      courses.push(byId[id]);
    }
    for (const li of ol.querySelectorAll('li.week')) {
      const r = pageRect(li);
      // a week counts as read once its heading crosses the reading line
      byId[id].weeks.push({ id: li.id, title: li.querySelector('h4')?.textContent ?? '', s: r[1] + 24 });
    }
  }
  const floorOf = {};
  let ci = 0;
  let fi = 0;
  courses.forEach((c, k) => {
    c.hue = HUES[k % HUES.length];
    const slot = c.side === 'field' ? FIELD_SLOTS[fi++ % FIELD_SLOTS.length] : CORE_SLOTS[ci++ % CORE_SLOTS.length];
    c.slot = slot;
    c.first = Math.min(...c.weeks.map((w) => w.s));
    c.last = Math.max(...c.weeks.map((w) => w.s));
    const n = c.weeks.length;
    const hTop = (n * FLOOR) / FOOT;
    c.hTop = hTop;
    // wireframe: four posts and every floor, in the tower's own local box
    const frame = [];
    for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) frame.push([[a, b, 0], [a, b, hTop + 0.12]]);
    for (let w = 0; w <= n; w++) {
      const h = (w * FLOOR) / FOOT;
      const q = [[0, 0, h], [1, 0, h], [1, 1, h], [0, 1, h]];
      q.forEach((p, i) => frame.push([p, q[(i + 1) % 4]]));
    }
    c.frame = G.lines(frame, [0, 0, 1, 1], [0.86, 0.91, 0.96], 1, 0.55);
    c.frame.glow = 0.15;
    c.fill = G.mesh(new Float32Array(0), [0, 0, 1, 1], c.hue, 1.6, 0, n * 30 + 30);
    c.edges = G.lines([], [0, 0, 1, 1], c.hue, 1.8, 1, false, 1, n * 4 + 4);
    c.edges.glow = 0.9;
    c.beacon = G.points([], [0, 0, 1, 1], c.hue, 11, 1, 1, 2);
    c.read = -1;
    c.label = mkLabel('tower', c.short);
    c.floorLabel = mkLabel('floor', '');
    c.weeks.forEach((w, i) => { floorOf[w.id] = { course: c, i }; });
  });

  function towerBox(c, P) {
    const x = c.side === 'field' ? sheetBox[2] + c.slot[0] : sheetBox[0] + c.slot[0];
    const s = P.focus + c.slot[1];
    return [x - FOOT / 2, s - FOOT / 2, x + FOOT / 2, s + FOOT / 2];
  }
  const floorLocal = (i) => [0.5, 0.5, ((i + 0.5) * FLOOR) / FOOT];

  // ---------------------------------------------------------------- junctions
  const junctions = [];
  for (const el of sheet.querySelectorAll('.junction[data-links]')) {
    const ids = el.dataset.links.split(/\s+/).filter((x) => floorOf[x]);
    if (ids.length < 2) continue;
    const card = cards.find((c) => c.el === el);
    const n = ids.length - 1;
    junctions.push({
      el, ids, card, title: el.querySelector('.jx-title')?.textContent ?? '',
      bridges: G.lines([], [0, 0, 1, 1], [1, 0.82, 0.42], 1.6, 1, false, 0, n * 32),
      threads: G.lines([], [0, 0, 1, 1], [1, 0.82, 0.42], 1.4, 1, false, 0, n * 40),
      sparks: G.points([], [0, 0, 1, 1], [1, 0.9, 0.6], 6, 1, 1, n * 10),
    });
  }
  for (const j of junctions) {
    j.bridges.glow = 0.8;
    j.threads.glow = 1.0;
    j.bridges.space = 0;
    j.threads.space = 0;
    j.sparks.space = 0;
  }
  for (const ch of chains) ch.arrows.glow = 0.7;

  const bezier = (a, b, lift, n = 32) => {
    const m = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + lift, (a[2] + b[2]) / 2];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], u * u * a[1] + 2 * u * t * m[1] + t * t * b[1], u * u * a[2] + 2 * u * t * m[2] + t * t * b[2]]);
    }
    return pts;
  };
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const unit = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const onPage = (x, s, P) => toWorld([0, 0, 0], [x, s, x, s], P);
  const cardPoint = (c, P, x, s, z) => {
    const xc = (c.card[0] + c.card[2]) / 2;
    const hs = c.slab.hinge || c.card[3];
    const o = onPage(xc, hs, P);
    const n = unit(add(toWorld([0, 0, 1], [xc, hs, xc + 1, hs], P), o, -1));
    const t = unit(add(onPage(xc, hs + 4, P), onPage(xc, hs - 4, P), -1));
    const up = add(t.map((v) => -v * Math.cos(c.slab.tilt)), n, Math.sin(c.slab.tilt));
    const cn = unit([0, -up[2], up[1]]);
    const base = add(add(o, n, c.slab.h), cn, c.slab.stack);
    return add(add(add(base, [1, 0, 0], (x - xc) * px), up, (hs - s) * px), cn, z);
  };
  const cardTop = (c, P) => cardPoint(c, P, (c.card[0] + c.card[2]) / 2, c.center, c.slab.thick + 0.004);

  // ---------------------------------------------------------------- per frame
  function update(P, { appear, dv, time }) {
    const show = appear * (1 - 0.85 * dv);
    // cards
    const visible = [];
    for (const c of cards) {
      if (c.parent) continue;
      const D = c.center - P.focus;
      const L = LIFT[c.kind];
      const a = (D > 0 ? smooth(560, 40, D) : 1) * appear * (1 - dv);
      const nearK = 1 - smooth(220, 1000, Math.abs(D));
      c.amount = a;
      c.slab.h = (L.base + L.extra * nearK) * a;
      c.slab.tilt = L.tilt * D2R * nearK * a;
      c.slab.opacity = a > 0.01 && Math.abs(D) < 3800 ? 1 : 0;
      if (c.shadow) {
        c.shadow.amount = a;
        c.shadow.radius = 8 + (c.slab.h / 0.001111) * 0.55;
        c.shadow.offset = 4 + (c.slab.h / 0.001111) * 0.4;
      }
      if (c.slab.opacity) visible.push(c);
    }
    for (const c of cards) {
      if (!c.parent) continue;
      const p = c.parent;
      const near = 1 - smooth(200, 900, Math.abs(p.center - P.focus));
      c.amount = p.amount;
      c.slab.hinge = p.card[3];
      c.slab.tilt = p.slab.tilt;
      c.slab.h = p.slab.h;
      c.slab.stack = (p.slab.thick + 0.002 + (0.004 + 0.009 * (c.idx + 1)) * (0.3 + 0.7 * near)) * p.amount;
      c.slab.opacity = p.slab.opacity;
      if (c.slab.opacity) visible.push(c);
    }
    const over = [];
    for (const ch of chains) {
      const tops = ch.steps.map((c) => cardTop(c, P));
      ch.arrows.set(tops.slice(1).map((p, i) => [tops[i], p]));
      ch.arrows.opacity = Math.min(...ch.steps.map((c) => c.amount)) * 0.9;
      over.push(ch.arrows);
    }

    // towers
    const current = courses.find((c) => P.focus >= c.first - 400 && P.focus <= c.last + 400);
    for (const c of courses) {
      const box = towerBox(c, P);
      const read = c.weeks.filter((w) => w.s < P.focus).length;
      if (read !== c.read) {
        c.read = read;
        const quads = [];
        const outlines = [];
        for (let i = 0; i < read; i++) {
          const h = ((i + 1) * FLOOR) / FOOT;
          const h0 = (i * FLOOR) / FOOT;
          const q = [[0.06, 0.06, h - 0.02], [0.94, 0.06, h - 0.02], [0.94, 0.94, h - 0.02], [0.06, 0.94, h - 0.02]];
          for (const k of [0, 1, 2, 0, 2, 3]) quads.push(...q[k], (h0 + h) * 5, 1);
          q.forEach((p, k) => outlines.push([p, q[(k + 1) % 4]]));
        }
        c.fill.setVerts(new Float32Array(quads));
        c.edges.set(outlines);
      }
      const isCur = c === current;
      for (const o of [c.frame, c.fill, c.edges, c.beacon]) o.box = box;
      c.frame.opacity = show * (isCur ? 0.95 : 0.5);
      c.fill.opacity = show * (isCur ? 0.9 : 0.55);
      c.edges.opacity = show * (isCur ? 1 : 0.6);
      if (read > 0 && read <= c.weeks.length) {
        const pulse = 0.75 + 0.25 * Math.sin(time * 3.2);
        c.beacon.set([[...floorLocal(read - 1), isCur ? 1.3 * pulse : 0.8]]);
      } else c.beacon.set([]);
      c.beacon.opacity = show;
      c.box = box;
      over.push(c.frame, c.fill, c.edges, c.beacon);
    }

    // junctions: bridges between towers, threads from the page
    for (const j of junctions) {
      const D = j.card ? j.card.center - P.focus : 1e9;
      const active = 1 - smooth(250, 900, Math.abs(D));
      const built = D < 0 ? 1 : 0;
      const ends = j.ids.map((id) => {
        const f = floorOf[id];
        return toWorld(floorLocal(f.i), f.course.box, P);
      });
      const segs = [];
      const sparks = [];
      for (let k = 1; k < ends.length; k++) {
        const pts = bezier(ends[0], ends[k], 0.35 + 0.1 * k);
        pts.slice(1).forEach((p, i) => segs.push([[...pts[i], 1], [...p, 1]]));
        if (active > 0.05) for (let s = 0; s < 3; s++) sparks.push([...pts[Math.floor(((time * 0.45 + s / 3 + k * 0.13) % 1) * 32)], 1]);
      }
      j.bridges.set(segs);
      j.bridges.opacity = show * Math.max(active, built * 0.16);
      j.bridges.glow = 0.25 + 0.55 * active;
      const tsegs = [];
      if (j.card && active > 0.02) {
        const top = cardTop(j.card, P);
        for (let k = 0; k < ends.length; k++) {
          const pts = bezier(top, ends[k], 0.5, 40);
          pts.slice(1).forEach((p, i) => tsegs.push([[...pts[i], 1 - i / 40], [...p, 1 - (i + 1) / 40 + 0.2]]));
          for (let s = 0; s < 2; s++) sparks.push([...pts[Math.floor(((time * 0.6 + s / 2 + k * 0.17) % 1) * 40)], 1.2]);
        }
      }
      j.threads.set(tsegs);
      j.threads.opacity = show * active;
      j.sparks.set(sparks);
      j.sparks.opacity = show * active;
      over.push(j.bridges, j.threads, j.sparks);
    }

    return {
      slabs: visible.map((c) => c.slab),
      shadows: visible.filter((c) => c.shadow).map((c) => c.shadow),
      over,
      current,
    };
  }

  function labels(vp, P, W, H, { appear, dv }) {
    const show = appear * (1 - dv);
    const place = (el, p, o, shift = '-50%, -100%') => {
      const pr = p && project(vp, p, W, H);
      if (!pr || o < 0.02 || pr[0] < -200 || pr[0] > W + 200 || pr[1] < -60 || pr[1] > H + 60) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = String(o);
      const sz = clamp(2.4 / pr[2], 0.5, 1.15);
      el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${sz.toFixed(3)}) translate(${shift})`;
    };
    const current = courses.find((c) => P.focus >= c.first - 400 && P.focus <= c.last + 400);
    for (const c of courses) {
      if (!c.box) continue;
      const isCur = c === current;
      place(c.label, toWorld([0.5, 0.5, c.hTop + 0.2], c.box, P), show * (isCur ? 1 : 0.7));
      c.label.classList.toggle('on', isCur);
      if (isCur && c.read > 0) {
        const w = c.weeks[Math.min(c.read, c.weeks.length) - 1];
        const html = `<span>Week ${Math.min(c.read, c.weeks.length)}</span>${w.title}`;
        if (c.floorLabel.dataset.html !== html) {
          c.floorLabel.innerHTML = html;
          c.floorLabel.dataset.html = html;
        }
        place(c.floorLabel, toWorld([c.side === 'field' ? 1.05 : -0.05, 0.5, ((c.read - 0.5) * FLOOR) / FOOT], c.box, P), show, c.side === 'field' ? '0, -50%' : '-100%, -50%');
      } else c.floorLabel.style.opacity = '0';
    }
  }

  return { update, labels, courses, junctions, cards };
}
