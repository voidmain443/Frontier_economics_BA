// The one 3D mode (docs/redesign.md, docs/world.md): the page you are reading
// folds into a ribbon in space, and as each figure reaches the reading line, the
// axis it holds fixed rises out of the paper in place. On a page with a world,
// that space is the archive building: the page runs through its rooms, and each
// figure rises in the room it belongs to. Fold it back and you are on the same page.
//
// The renderer, ribbon and capture are in gpu.js, the building in world.js;
// everything a figure raises comes from a construct registry in figure-local
// coordinates: (a, b) in the plot box, h in plot widths.

import { makeGpu, toWorld, htmlInCanvasSupport, copyElement, PX } from './gpu.js';
import { loadAssets } from './maquettes.js';
import { ROOMS, FH, placeOf, roomGeometry, routeAt } from './world.js';
import { perspective, lookAt, multiply, project, rect, ortho, basis } from './math.js';
import { lerp, clamp, smooth, ease, surfaceVerts, quadVerts } from './geom.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DURATION = REDUCED ? 0.01 : 1.6;
const TILE_H = 2048;
// every raised axis is drawn this many times taller than its construct says, so
// that a height reads at the camera's distance
const LIFT = 1.5;
// the folded view: lower and closer than the engine's default, to see heights
// translucent surfaces sit on light paper, so they are drawn denser than in open space
const SURF = 2.4;
const CAM = { h: 0.8, el: 0.42, tx: 0.3, ty: 0.12, tz: -0.22, fov: 38 };
const DESK = [0.776, 0.808, 0.765];
const BP_IN = [0.1, 0.25, 0.42];
const BP_OUT = [0.03, 0.09, 0.17];
export const COL = {
  cobalt: [0.52, 0.72, 1.0],
  madder: [1.0, 0.55, 0.55],
  olive: [0.74, 0.9, 0.46],
  ochre: [1.0, 0.82, 0.42],
  chalk: [0.86, 0.91, 0.96],
  white: [1, 1, 1],
};
const PAPER_RGB = [0.933, 0.949, 0.918];
// the sheet's thickness, world units
const PAPER = 0.01;
// a stage title is the printed heading raised off the page in this many layers
const TITLE_LAYERS = 14;
const TITLE_DEPTH = 0.022;
// the ruler counts reading time: words at WPM a minute, and FIG_MIN per figure
const WPM = 220;
const FIG_MIN = 0.5;
// dragging turns the view about the reading point, within these angles
// (radians); scrolling brings it back at BACK per second
const ORBIT = { az: 1.05, lo: -0.17, hi: 0.87, back: 6, key: 0.08 };
const SVGNS = 'http://www.w3.org/2000/svg';
const PLASTER = [0.95, 0.945, 0.92, 1];
const SHADE = [0.7, 0.73, 0.72, 1];
const MATTE = [0.04, 1, 0, 0];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a) => scl(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

// CSS matrix3d that lays a w × h element onto the screen quad p0..p3
// (top left, top right, bottom right, bottom left)
function quadMatrix(w, h, [p0, p1, p2, p3]) {
  const dx1 = p1[0] - p2[0];
  const dx2 = p3[0] - p2[0];
  const dy1 = p1[1] - p2[1];
  const dy2 = p3[1] - p2[1];
  const sx = p0[0] - p1[0] + p2[0] - p3[0];
  const sy = p0[1] - p1[1] + p2[1] - p3[1];
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const k = (dx1 * sy - sx * dy1) / den;
  const a = p1[0] - p0[0] + g * p1[0];
  const b = p3[0] - p0[0] + k * p3[0];
  const d = p1[1] - p0[1] + g * p1[1];
  const e = p3[1] - p0[1] + k * p3[1];
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, p0[0], p0[1], 0, 1].map((v) => v.toFixed(6)).join(',')})`;
}

// Reading time down the sheet: [page y, minutes so far] after every text block
// and figure.
function readingTimes(sheet) {
  const marks = [];
  let t = 0;
  const skip = (n) => (n.nodeType === 1 && n.matches('svg, .fig-art, .zones') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT);
  const walk = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: skip });
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeType === 1) {
      if (n.matches('figure[data-fig]')) {
        t += FIG_MIN;
        marks.push([n.getBoundingClientRect().bottom + scrollY, t]);
      }
      continue;
    }
    const words = n.textContent.split(/\s+/).filter(Boolean).length;
    if (!words) continue;
    t += words / WPM;
    marks.push([n.parentElement.getBoundingClientRect().bottom + scrollY, t]);
  }
  marks.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < marks.length; i++) marks[i][1] = Math.max(marks[i][1], marks[i - 1][1]);
  return marks;
}

export async function createFold({ canvas, sheet, labelsRoot, constructs, data = {}, world = null, onChange }) {
  if (!htmlInCanvasSupport()) return { supported: false, reason: 'This browser cannot draw HTML into WebGPU textures yet (HTML-in-Canvas).' };
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return { supported: false, reason: 'No WebGPU adapter is available.' };
  const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: adapter.limits.maxTextureDimension2D } });
  device.addEventListener('uncapturederror', (e) => console.error('[webgpu]', e.error.message));
  const gctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  gctx.configure({ device, format, alphaMode: 'premultiplied' });
  const G = makeGpu(device, format);

  const st = { t: 0, target: 0, captured: false, busy: false, running: false, tiles: [], scene: null, sheetBox: null, last: 0, time: 0, mouse: [0, 0], orbit: [0, 0], drag: null, returning: false };

  // ---- capture: the sheet, cloned into the canvas and copied in tiles ----
  let pending = null;
  canvas.addEventListener('paint', () => {
    if (!pending) return;
    const job = pending;
    pending = null;
    try {
      for (const T of job.tiles) copyElement(device.queue, job.clone, 0, T.sy, job.W, T.sh, T.tex, T.tex.width, T.tex.height);
      job.resolve();
    } catch (err) {
      job.reject(err);
    }
  });

  async function capture() {
    const r = sheet.getBoundingClientRect();
    const W = r.width;
    const H = sheet.offsetHeight;
    const sx = r.left + scrollX;
    const sy = r.top + scrollY;
    // a long sheet is captured at one texel per CSS pixel to keep its tiles in memory
    const S = Math.min(devicePixelRatio || 1, H > 30000 ? 1 : 1.25);
    for (const T of st.tiles) {
      T.tex.destroy();
      T.obj?.destroy();
    }
    st.tiles = [];
    for (let y = 0; y < H; y += TILE_H) {
      const sh = Math.min(TILE_H, H - y);
      const tex = G.texture(Math.ceil(W * S), Math.ceil(sh * S));
      st.tiles.push({ tex, sy: y, sh, rect: [sx, sy + y, sx + W, sy + y + sh] });
    }
    const clone = sheet.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.style.cssText = `width:${W}px;margin:0;pointer-events:none;`;
    canvas.appendChild(clone);
    try {
      await new Promise((resolve, reject) => {
        pending = { clone, W, tiles: st.tiles, resolve, reject };
        canvas.requestPaint();
        setTimeout(() => { if (pending) { pending = null; reject(new Error('No paint event from the canvas.')); } }, 4000);
      });
    } finally {
      clone.remove();
    }
    for (const T of st.tiles) {
      G.mips(T.tex);
      T.obj = G.tile(T.tex, T.rect, Math.max(8, Math.round(T.sh / 24)));
    }
    st.sheetBox = [sx, sy, sx + W, sy + H];
    st.captured = true;
  }

  // ---- agents: plaster maquettes from tools/blender ----
  let AG = null;
  const agentQ = new Map();
  async function loadAgents() {
    if (AG) return;
    const assets = await loadAssets();
    AG = {};
    for (const [name, parts] of Object.entries(assets)) {
      AG[name] = parts.map((p) => ({ solid: G.solid(p.geometry, { max: 32 }), color: p.material === 'shade' ? SHADE : PLASTER }));
    }
  }
  const allSolids = () => Object.values(AG ?? {}).flatMap((parts) => parts.map((p) => p.solid));

  function pageFrame(x, s, P) {
    const o = toWorld([0, 0, 0], [x, s, x, s], P);
    const N = unit(sub(toWorld([0, 0, 1], [x, s, x + 1, s], P), o));
    const D = unit(sub(toWorld([0, 0, 0], [x, s + 3, x, s + 3], P), toWorld([0, 0, 0], [x, s - 3, x, s - 3], P)));
    return { o, X: [1, 0, 0], N, D };
  }
  function putAgent(name, F, lift, sc, ry, grow) {
    if (grow < 0.03) return;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const ax = add(scl(F.X, c), scl(F.D, -s));
    const az = add(scl(F.X, s), scl(F.D, c));
    const m = basis(add(F.o, scl(F.N, lift)), scl(ax, sc), scl(F.N, sc * grow), scl(az, sc));
    for (const part of AG?.[name] ?? []) {
      if (!agentQ.has(part.solid)) agentQ.set(part.solid, []);
      agentQ.get(part.solid).push({ m, color: part.color, p: MATTE });
    }
  }

  // ---- scene: one construct per figure, built in its plot box ----
  function buildScene() {
    G.freeScene();
    labelsRoot.replaceChildren();
    const sc = { objs: [], labels: [], agents: [], callouts: [], titles: [], world: null };
    const sb = st.sheetBox;
    const H = sb[3] - sb[1];
    const bOf = (s) => 1 - (s - sb[1]) / H;
    const always = { center: null };

    // a label with an href is a door: it can be followed from the folded page
    const label = (html, cls, local, box, group, href = null) => {
      const el = document.createElement(href ? 'a' : 'div');
      el.className = `xl ${cls}`;
      el.innerHTML = html;
      if (href) el.href = href;
      labelsRoot.appendChild(el);
      sc.labels.push({ el, local, box, group, link: Boolean(href) });
      return sc.labels[sc.labels.length - 1];
    };

    // the sheet: its edges and its thickness, and, without a world to stand
    // in, a faint drafting grid off the page
    const edge = [];
    const side = [];
    const step = 40 / H;
    const th = -PAPER / ((sb[2] - sb[0]) * PX);
    for (let b = 0; b < 1; b += step) {
      const b2 = Math.min(1, b + step);
      edge.push([[0, b, 0], [0, b2, 0]], [[1, b, 0], [1, b2, 0]]);
      for (const a of [0, 1]) side.push(quadVerts([[a, b, 0], [a, b2, 0], [a, b2, th], [a, b, th]]));
    }
    const sideV = new Float32Array(side.reduce((n, q) => n + q.length, 0));
    side.reduce((off, q) => { sideV.set(q, off); return off + q.length; }, 0);
    sc.objs.push({ o: G.mesh(sideV, sb, PAPER_RGB, 4.5, 0), group: always, kind: 'edge' });
    sc.objs.push({ o: G.lines(edge, sb, COL.chalk, 1.4, 0.75), group: always, kind: 'edge' });
    if (!world) {
      const grid = [];
      const gstep = 80 / H;
      for (let i = 1; i <= 10; i++) for (const a of [-0.1 * i, 1 + 0.1 * i]) for (let b = 0; b < 1; b += gstep) grid.push([[a, b, 0], [a, Math.min(1, b + gstep), 0]]);
      for (let s = 0; s < H; s += 400) {
        const b = bOf(sb[1] + s);
        grid.push([[-1.0, b, 0], [-0.02, b, 0]], [[1.02, b, 0], [2.0, b, 0]]);
      }
      sc.objs.push({ o: G.lines(grid, sb, COL.chalk, 1, 0.12), group: always, kind: 'grid' });
    }

    // the ruler down the left edge counts reading time: a tick a minute, a
    // number every five
    const marks = readingTimes(sheet);
    const tick = [];
    for (let m = 1, i = 0; i < marks.length; m++) {
      while (i < marks.length && marks[i][1] < m) i++;
      if (i >= marks.length) break;
      const b = bOf(marks[i][0]);
      const long = m % 5 === 0;
      tick.push([[long ? -0.03 : -0.014, b, 0], [-0.004, b, 0]]);
      if (long) label(`${m}<i> min</i>`, 'ruler', [-0.036, b, 0], sb, { center: marks[i][0] }).ruler = true;
    }
    sc.objs.push({ o: G.lines(tick, sb, COL.chalk, 1.2, 0.7), group: always, kind: 'edge' });

    // leader lines from the margin callouts to the axis each figure raises
    const leaders = document.createElementNS(SVGNS, 'svg');
    leaders.setAttribute('class', 'leaders');
    labelsRoot.appendChild(leaders);

    // stage titles stand in the margin beside their headings
    for (const stg of sheet.querySelectorAll('.stage[data-no]')) {
      const h2 = stg.querySelector('h2');
      const r = h2.getBoundingClientRect();
      const box = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
      const no = h2.querySelector('.no')?.textContent ?? '';
      label(`<span>${no}</span>${h2.textContent.replace(no, '').trim()}`, 'chapter', [-0.17, 0.5, 0.01], box, { center: box[1] }).chapter = true;
      // the printed heading, raised off the page as extruded type
      const layers = [];
      for (let i = 0; i < TITLE_LAYERS; i++) {
        const el = document.createElement('h2');
        el.className = `xl title${i === TITLE_LAYERS - 1 ? ' top' : i === 0 ? ' base' : ''}`;
        el.innerHTML = h2.innerHTML;
        const cs = getComputedStyle(h2);
        Object.assign(el.style, { width: `${r.width}px`, height: `${r.height}px`, font: cs.font, letterSpacing: cs.letterSpacing, padding: cs.padding, margin: '0' });
        labelsRoot.appendChild(el);
        layers.push(el);
      }
      sc.titles.push({ box, layers, w: r.width, h: r.height, center: (box[1] + box[3]) / 2 });
    }
    const stops = [];

    // figures raise their held-fixed axis over their plot box; other marked
    // elements (data-fold) raise theirs over their own box
    for (const fig of sheet.querySelectorAll('figure[data-fig], [data-fold]')) {
      const id = fig.dataset.fold ?? fig.dataset.fig;
      const spec = constructs[id];
      if (!spec) continue;
      const pbEl = spec.whole ? fig : fig.querySelectorAll('.plotbox')[spec.panel ?? 0];
      if (!pbEl) continue;
      const pb = pbEl.getBoundingClientRect();
      const box = [pb.left + scrollX, pb.top + scrollY, pb.right + scrollX, pb.bottom + scrollY];
      const dom = typeof spec.dom === 'function' ? spec.dom(data) : spec.dom;
      const L = ([x, y, h]) => [(x - dom.x[0]) / (dom.x[1] - dom.x[0]), (y - dom.y[0]) / (dom.y[1] - dom.y[0]), h];
      const group = { center: (box[1] + box[3]) / 2 };
      let X;
      try {
        X = spec.build(data);
      } catch (err) {
        console.error(`construct ${id}`, err);
        continue;
      }
      for (const s of X.surfaces ?? []) {
        const v = surfaceVerts(s, L, s.n ?? 46);
        if (v.length) sc.objs.push({ o: G.mesh(v, box, COL[s.c], Math.min(0.95, (s.alpha ?? 0.3) * SURF), s.freq ?? 0), group, kind: 'fig' });
      }
      for (const q of X.quads ?? []) {
        const pts = q.q.map(L);
        if (q.fill !== false) sc.objs.push({ o: G.mesh(quadVerts(pts), box, COL[q.c], Math.min(0.95, (q.alpha ?? 0.25) * SURF), 0), group, kind: 'fig' });
        if (q.edge !== false) sc.objs.push({ o: G.lines(pts.map((p, i) => [p, pts[(i + 1) % pts.length]]), box, COL[q.c], q.w ?? 1.2, q.o ?? 0.85), group, kind: 'fig' });
      }
      // batches: many quads in one mesh, many segments in one set of lines
      for (const m of X.meshes ?? []) {
        const parts = m.quads.map((q) => quadVerts(q.map(L)));
        const v = new Float32Array(parts.reduce((n, a) => n + a.length, 0));
        let off = 0;
        for (const a of parts) { v.set(a, off); off += a.length; }
        if (v.length) sc.objs.push({ o: G.mesh(v, box, COL[m.c], Math.min(0.95, (m.alpha ?? 0.3) * SURF), 0), group, kind: 'fig' });
      }
      for (const s of X.segs ?? []) {
        const segs = s.segs.map(([p, q]) => [L(p), L(q)]).filter(([p, q]) => p.every(Number.isFinite) && q.every(Number.isFinite));
        if (segs.length) sc.objs.push({ o: G.lines(segs, box, COL[s.c ?? 'white'], s.w ?? 1.2, s.o ?? 1, Boolean(s.dash)), group, kind: 'fig' });
      }
      for (const c of X.lines ?? []) {
        const pts = c.pts.map(L);
        const segs = [];
        for (let i = 1; i < pts.length; i++) if (pts[i - 1].every(Number.isFinite) && pts[i].every(Number.isFinite)) segs.push([pts[i - 1], pts[i]]);
        if (segs.length) sc.objs.push({ o: G.lines(segs, box, COL[c.c ?? 'white'], c.w ?? 2, c.o ?? 1, Boolean(c.dash)), group, kind: 'fig' });
      }
      const byColor = {};
      for (const p of X.points ?? []) (byColor[p.c ?? 'white'] ??= []).push([...L(p.at), (p.size ?? 8) / 8]);
      for (const c in byColor) sc.objs.push({ o: G.points(byColor[c], box, COL[c], 8, 1, 1), group, kind: 'fig' });
      for (const e of X.eqs ?? []) label(e.html, 'xeq', L(e.at), box, group);
      for (const t of X.tags ?? []) label(t.text, `tag ${t.c ?? ''}${t.href ? ' door' : ''}`, L(t.at), box, group, t.href);
      for (const a of X.agents ?? []) sc.agents.push({ name: a.asset, local: L(a.at), box, group, scale: a.scale ?? 0.05, ry: a.ry ?? 0 });
      // a dimension line along the raised axis, its name and range at the top end
      for (const dm of X.dims ?? []) {
        const p = L(dm.from);
        const q = L(dm.to);
        const t = 0.012;
        const segs = [[p, q], [[p[0] - t, p[1], p[2]], [p[0] + t, p[1], p[2]]], [[q[0] - t, q[1], q[2]], [q[0] + t, q[1], q[2]]]];
        sc.objs.push({ o: G.lines(segs, box, COL.chalk, 1.3, 0.95), group, kind: 'fig' });
        label(dm.text, 'dim', [q[0] + 0.02, q[1], q[2]], box, group);
      }
      // the margin callout: the figure's number and what it holds fixed
      const no = fig.querySelector('.fig-no');
      if (no) {
        const el = document.createElement('div');
        el.className = 'xl callout';
        const b = document.createElement('b');
        b.textContent = no.textContent;
        el.append(b);
        const held = fig.querySelector('.held');
        if (held) {
          const s = document.createElement('span');
          const i = document.createElement('i');
          i.textContent = 'Held fixed';
          s.append(i, ` ${held.textContent.replace(/^\s*Held fixed\s*/, '')}`);
          el.append(s);
        }
        labelsRoot.appendChild(el);
        const line = document.createElementNS(SVGNS, 'line');
        leaders.appendChild(line);
        const dm = X.dims?.[0];
        const target = dm ? L(dm.from.map((v, k) => (v + dm.to[k]) / 2)) : [0.5, 0.5, 0];
        sc.callouts.push({ el, line, group, box, target, x: sb[2] + 36 });
      }
      if (world?.[id]) stops.push({ c: group.center, p: placeOf(world[id]) });
    }

    // the building: every room's edges and floor plate, and its sign
    if (world) {
      stops.sort((a, b) => a.c - b.c);
      const rooms = ROOMS.map((r) => {
        const g = roomGeometry(r);
        const lines = G.lines(g.edges, [0, 0, 0, 0], COL[r.c], 1.5, 1, false, 0);
        const grid = G.lines(g.grid, [0, 0, 0, 0], COL[r.c], 1, 1, false, 0);
        const plate = G.mesh(quadVerts(g.plate), [0, 0, 0, 0], COL[r.c], 1.1, 0);
        plate.space = 0;
        const sign = document.createElement('div');
        sign.className = 'xl room';
        sign.innerHTML = `<span>${r.layer}</span>${r.name}`;
        labelsRoot.appendChild(sign);
        return { r, lines, grid, plate, sign, at: g.sign, hang: g.hang, atL: g.signL, hangL: g.hangL };
      });
      sc.world = { stops, rooms };
    }
    return sc;
  }

  // ---- frame ----
  function frame(now) {
    const dt = clamp((now - st.last) / 1000, 0, 0.05);
    st.last = now;
    st.time += dt;
    st.t = clamp(st.t + (Math.sign(st.target - st.t) * dt) / DURATION, 0, 1);
    const e = ease(st.t);
    if (st.returning && !st.drag) {
      const k = REDUCED ? 1 : 1 - Math.exp(-dt * ORBIT.back);
      st.orbit = st.orbit.map((v) => (Math.abs(v * (1 - k)) < 1e-3 ? 0 : v * (1 - k)));
      if (!st.orbit[0] && !st.orbit[1]) st.returning = false;
    }
    if (st.t === 0 && st.target === 0) {
      st.running = false;
      document.body.classList.remove('unfolded');
      clear();
      onChange?.(false);
      return;
    }
    const W = innerWidth;
    const H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    G.resize(canvas, Math.round(W * dpr), Math.round(H * dpr));
    const P = { focus: scrollY + H / 2, docW: W, t: e };
    const sc = st.scene;
    // where the building stands; a long move between rooms steps the camera back.
    // With reduced motion the building does not move: it fades out and back in
    // at the next room.
    const R = sc.world ? routeAt(sc.world.stops, P.focus, REDUCED ? (u) => (u < 0.5 ? 0 : 1) : ease) : null;
    const travel = REDUCED ? 0 : Math.min(1, (R?.travel ?? 0) / 8);

    // the flat view of the sheet, dollied back into a raised, tilted one
    const T = CAM;
    const fov = (lerp(0.5, T.fov, e) * Math.PI) / 180;
    const hO = lerp(H * 0.5 * PX, T.h, e);
    const el = clamp(lerp(0, T.el, e) + (st.mouse[1] * 0.04 + st.orbit[1]) * e, 0, 1.35);
    const az = (st.mouse[0] * 0.1 + st.orbit[0]) * e;
    const target = [lerp(0, T.tx, e), lerp(0, T.ty, e), lerp(0, T.tz, e)];
    // a turned view also steps back, so the room and its neighbours come into sight
    const turned = Math.min(1, Math.hypot(st.orbit[0] / ORBIT.az, st.orbit[1] / ORBIT.hi));
    const dist = (hO / Math.tan(fov / 2)) * (1 + Math.max(1.4 * turned, 1.3 * travel) * e);
    const eye = [target[0] + dist * Math.sin(az) * Math.cos(el), target[1] + dist * Math.sin(el), target[2] + dist * Math.cos(az) * Math.cos(el)];
    const vp = multiply(rect({ x: 0, y: 0, w: W, h: H }, W, H), multiply(perspective(fov, W / H, Math.max(0.005, dist - 6), dist + 40), lookAt(eye, target, [0, 1, 0])));

    const appear = smooth(0.6, 1, e);
    const near = (g) => (g.center == null ? 1 : 1 - smooth(2600, 5200, Math.abs(g.center - P.focus)));
    // a figure's axis rises as it comes up to the reading line and settles back
    // into the paper once it has been read, so one construct stands at a time
    const grow = (g) => (g.center == null ? 1 : smooth(g.center - 1150, g.center - 250, P.focus) * (1 - smooth(g.center + 450, g.center + 1250, P.focus)));
    for (const it of sc.objs) {
      let o = 1;
      if (it.kind === 'grid' || it.kind === 'edge') o = smooth(0.15, 0.9, e);
      else {
        const r = grow(it.group);
        o = appear * near(it.group) * Math.min(1, r * 1.6);
        it.o.hs = ease(r) * LIFT;
      }
      it.o.opacity = o * it.o.baseOpacity;
    }

    // agents stand where their figure puts them, rising with it
    agentQ.clear();
    if (appear > 0.02) {
      for (const a of sc.agents) {
        if (Math.abs(a.group.center - P.focus) > 2400) continue;
        const gr = ease(grow(a.group)) * appear;
        const x = lerp(a.box[0], a.box[2], a.local[0]);
        const s = lerp(a.box[3], a.box[1], a.local[1]);
        const bw = (a.box[2] - a.box[0]) * PX;
        putAgent(a.name, pageFrame(x, s, P), a.local[2] * bw * ease(grow(a.group)) * LIFT, a.scale * bw, a.ry, gr);
      }
    }
    const solids = allSolids();
    for (const s of solids) s.set(agentQ.get(s) ?? []);

    // the light stands straight above the page at the reading line
    const tau = (1 - e) * Math.PI * 0.5;
    const Nl = [0, Math.cos(tau), Math.sin(tau)];
    const Al = [0, -Math.sin(tau), Math.cos(tau)];
    const lightVP = multiply(ortho(-1.9, 1.9, -1.3, 1.8, 0.4, 5), lookAt([Nl[0] * 3, Nl[1] * 3, Nl[2] * 3], [0, 0, 0], Al));
    const shadowK = appear * 0.92;
    const sbx = st.sheetBox;
    const under = [];
    const over = [];
    // the building moves so that the room of the figure being read surrounds
    // the reading point
    if (sc.world) {
      const O = [((sbx[0] + sbx[2]) / 2 - W / 2) * PX - R.at[0], -R.at[1], -R.at[2]];
      // signs show for the rooms being read; once the view is turned, also for
      // their neighbours on the same floor
      const floor = R.at[1] / FH;
      const pageX = ((sbx[0] + sbx[2]) / 2 - W / 2) * PX;
      const pageHalf = ((sbx[2] - sbx[0]) / 2) * PX + 0.05;
      const shown = REDUCED ? 1 - Math.sin(Math.PI * R.s) : 1;
      for (const w of sc.world.rooms) {
        const k = R.weights.get(w.r.name) ?? 0;
        w.lines.box = [...O, 0];
        w.grid.box = [...O, 0];
        w.plate.box = [...O, 0];
        w.lines.opacity = shown * appear * (0.18 + 0.72 * k);
        w.grid.opacity = shown * appear * (0.05 + 0.3 * k);
        w.plate.opacity = shown * appear * (0.35 + 0.65 * k);
        under.push(w.plate, w.grid, w.lines);
        const below = w.r.floor < floor - 0.5;
        // a sign the page would cover moves to the room's other back corner
        let at = add(below ? w.hang : w.at, O);
        const left = Math.abs(at[0] - pageX) < pageHalf;
        if (left) at = add(below ? w.hangL : w.atL, O);
        w.sign.classList.toggle('left', left);
        const level = k > 0.02 || (turned > 0.15 && Math.abs(w.r.floor - floor) < 0.5);
        const pr = level && Math.hypot(at[0], at[1], at[2]) < 6 ? project(vp, at, W, H) : null;
        const o = shown * appear * (0.4 + 0.6 * k);
        if (!pr || o < 0.02 || pr[0] < -200 || pr[0] > W + 200 || pr[1] < -60 || pr[1] > H + 60) {
          w.sign.style.opacity = '0';
          continue;
        }
        w.sign.style.opacity = String(o);
        w.sign.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${clamp(3.2 / pr[2], 0.6, 1.1).toFixed(3)}) translate(${left ? '0' : '-100%'}, ${below ? '0' : '-100%'})`;
      }
    }
    for (const it of sc.objs) (it.kind === 'grid' || it.kind === 'edge' ? under : over).push(it.o);

    // margin callouts, with a leader to the raised axis
    for (const C of sc.callouts) {
      const r = grow(C.group);
      const o = appear * near(C.group) * smooth(0.5, 0.9, r);
      const a = o > 0.02 ? project(vp, toWorld([0, 0, 0], [C.x, C.box[1], C.x, C.box[1]], P), W, H) : null;
      const b = a ? project(vp, toWorld(C.target, C.box, P, ease(r) * LIFT), W, H) : null;
      if (!a || !b) {
        C.el.style.opacity = '0';
        C.line.style.opacity = '0';
        continue;
      }
      C.el.style.opacity = String(o);
      C.el.style.transform = `translate(${a[0].toFixed(1)}px, ${a[1].toFixed(1)}px) scale(${clamp(1.6 / a[2], 0.6, 0.95).toFixed(3)}) translate(0, -50%)`;
      C.line.setAttribute('x1', a[0].toFixed(1));
      C.line.setAttribute('y1', a[1].toFixed(1));
      C.line.setAttribute('x2', b[0].toFixed(1));
      C.line.setAttribute('y2', b[1].toFixed(1));
      C.line.style.opacity = String(o * 0.8);
    }

    // stage titles rise as extruded type while their heading is near the reading line
    for (const T2 of sc.titles) {
      const r = smooth(T2.center - 1400, T2.center - 400, P.focus) * (1 - smooth(T2.center + 250, T2.center + 700, P.focus));
      const o = appear * r;
      const depth = (TITLE_DEPTH * ease(r)) / ((T2.box[2] - T2.box[0]) * PX);
      T2.layers.forEach((el2, i) => {
        const q = o > 0.02 ? [[0, 1], [1, 1], [1, 0], [0, 0]].map(([a, b]) => project(vp, toWorld([a, b, (depth * i) / (T2.layers.length - 1)], T2.box, P), W, H)) : [null];
        if (q.some((p) => !p)) {
          el2.style.opacity = '0';
          return;
        }
        el2.style.opacity = String(o);
        el2.style.transform = quadMatrix(T2.w, T2.h, q);
      });
    }
    G.render({
      ctx: gctx,
      cam: { vp, eye, W: W * dpr, H: H * dpr, focus: P.focus, docW: W, t: e, time: st.time },
      bg: { inner: BP_IN.map((v, i) => lerp(DESK[i], v, e)), outer: BP_OUT.map((v, i) => lerp(DESK[i], v, e)), center: [W * dpr * 0.5, H * dpr * 0.42], radius: Math.max(W, H) * dpr * 0.85 },
      fog: BP_OUT,
      tiles: st.tiles.map((T2) => T2.obj),
      solids,
      light: { VP: lightVP, dir: [-Nl[0], -Nl[1], -Nl[2]], shadow: shadowK, catchRect: [sbx[0] - 1000, P.focus - 1300, sbx[2] + 1000, P.focus + 1700], catchStrength: shadowK * 0.55 },
      over,
      under,
      bloom: 0,
    });

    for (const L of sc.labels) {
      const r = L.chapter || L.ruler ? 1 : grow(L.group);
      const pr = project(vp, toWorld(L.local, L.box, P, ease(r) * LIFT), W, H);
      const o = appear * near(L.group) * (L.chapter || L.ruler ? 1 : smooth(0.55, 1, r));
      if (!pr || o < 0.02 || pr[0] < -300 || pr[0] > W + 300 || pr[1] < -100 || pr[1] > H + 100) {
        L.el.style.opacity = '0';
        if (L.link) L.el.style.pointerEvents = 'none';
        continue;
      }
      const sz = L.chapter ? clamp(2.3 / pr[2], 0.42, 1.25) : L.link ? clamp(1.5 / pr[2], 0.72, 0.95) : clamp(1.5 / pr[2], 0.4, 0.85);
      L.el.style.opacity = String(o);
      if (L.link) L.el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      const shift = L.chapter || L.ruler ? '-100%, -50%' : '0, -100%';
      L.el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${sz.toFixed(3)}) translate(${shift})`;
    }
    requestAnimationFrame(frame);
  }

  function clear() {
    const enc = device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: gctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] }).end();
    device.queue.submit([enc.finish()]);
  }

  addEventListener('mousemove', (ev) => {
    st.mouse = [(ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1];
  });
  // turning the view: drag anywhere on the space, or Alt and the arrow keys;
  // scrolling on brings the view back to the reading point
  const turnable = () => st.target === 1 && st.t > 0.98;
  const turn = (az, el) => {
    st.orbit = [clamp(az, -ORBIT.az, ORBIT.az), clamp(el, ORBIT.lo, ORBIT.hi)];
    st.returning = false;
  };
  addEventListener('pointerdown', (ev) => {
    if (!turnable() || ev.button !== 0 || ev.target.closest('a, button, input, nav, .titleblock')) return;
    st.drag = { x: ev.clientX, y: ev.clientY, orbit: [...st.orbit] };
    document.body.classList.add('turning');
  });
  addEventListener('pointermove', (ev) => {
    if (st.drag) turn(st.drag.orbit[0] - (ev.clientX - st.drag.x) * 0.003, st.drag.orbit[1] + (ev.clientY - st.drag.y) * 0.0025);
  });
  const release = () => {
    st.drag = null;
    document.body.classList.remove('turning');
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('keydown', (ev) => {
    const d = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[ev.key];
    if (!d || !ev.altKey || !turnable()) return;
    ev.preventDefault();
    turn(st.orbit[0] + d[0] * ORBIT.key, st.orbit[1] + d[1] * ORBIT.key);
  });
  const back = () => {
    if (!st.drag && (st.orbit[0] || st.orbit[1])) st.returning = true;
  };
  addEventListener('wheel', back, { passive: true });
  addEventListener('scroll', back, { passive: true });
  // the layout changes with the window: capture again next time
  addEventListener('resize', () => {
    st.captured = false;
    if (st.target === 1 || st.t > 0) {
      st.target = 0;
      st.t = 0;
    }
  });

  async function unfold() {
    if (st.busy || st.target === 1) return;
    st.busy = true;
    try {
      if (!st.captured) {
        await capture();
        st.scene = buildScene();
      }
      await loadAgents();
      st.target = 1;
      document.body.classList.add('unfolded');
      onChange?.(true);
      if (!st.running) {
        st.running = true;
        st.last = performance.now();
        requestAnimationFrame(frame);
      }
    } finally {
      st.busy = false;
    }
  }

  function fold() {
    st.target = 0;
  }

  return {
    supported: true,
    unfold,
    fold,
    // the page has changed (a figure was redrawn): capture it again next time
    invalidate() {
      st.captured = false;
    },
    get open() { return st.target === 1; },
    get busy() { return st.busy; },
  };
}
