// The one 3D mode (docs/redesign.md, docs/engine.md): the page you are reading
// folds into a ribbon in space, and as each figure reaches the reading line, the
// axis it holds fixed rises out of the paper in place. On a page with a world,
// the page lies on the economy's engine, Knight's wheel of wealth: its people,
// its cells and what circulates between them, and the wheel turns so that each
// figure is read over its own cell. Fold it back and you are on the same page.
//
// The renderer, ribbon and capture are in gpu.js, the wheel in wheel.js;
// everything a figure raises comes from a construct registry in figure-local
// coordinates: (a, b) in the plot box, h in plot widths.

import { makeGpu, toWorld, htmlInCanvasSupport, copyElement, PX } from './gpu.js';
import { loadAssets } from './maquettes.js';
import { RIM, FLOWS, placeOf, polar, cellCentre, wheelAt, poseFor, toWorldW, wheelGeometry, signSpots, routeOf, hatchOf, population, ties, circulation, crowdSpots } from './wheel.js';
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
  violet: [0.8, 0.66, 1.0],
  // printing inks, for agents seen against the paper
  cobaltInk: [0.16, 0.33, 0.63],
  madderInk: [0.69, 0.23, 0.23],
  ochreInk: [0.72, 0.48, 0.08],
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
// a failed bank in a crowd topples TOPPLE seconds after the one that failed a
// round before it, and takes FALL seconds to fall
const TOPPLE = 0.35;
const FALL = 0.5;
const PLASTER = [0.95, 0.945, 0.92, 1];
const SHADE = [0.7, 0.73, 0.72, 1];
const MATTE = [0.04, 1, 0, 0];
// the place being read is brought under this point, just behind the reading
// line on the floor under the page, with the wheel's hub off to the back right
const READ_Z = -0.15;
const PSI = (140 * Math.PI) / 180;
// world points are drawn at their nominal size from this distance
const PERSP = 2.6;
// a figure with a story holds the reading line while the reader scrolls
// through its beats, BEAT px of scroll a beat; a beat's change plays in time,
// over its dur seconds (0.9 by default), so a fast scroll still shows it
const BEAT = 420;
const BEAT_DUR = 0.9;

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

// A construct may tell a story (docs/engine.md): X.story is a list of beats,
// { say, cam: { az, el, zoom, at }, dur }, and any of its items may carry
// show: [from, to] (the beats it stands in), draw: beat (a line drawn on as
// that beat begins, with a dot of colour head at its end), or rise: beat (the
// item lies on the page until that beat lifts it to its height). The reading
// line stops at the figure for the length of its story, the camera moves to
// each beat's view and a caption says it. A beat without at keeps the view
// centred where it would be without the story.
//
// whole: { from, to } (selectors). From the first to the second the view steps
// back until the whole wheel is seen (Part 1, stage 6).
//
// archive (Part 3): { figure, end, routes: [{ name, places, c }] }. From that
// figure to the end element the view steps back to the whole wheel, which
// lies beside the page, with the routes drawn through it; its cells' names
// are doors.
//
// build (wheel.js): the order in which the wheel's cells, agents and routes
// appear. Its stories are told at headings, with the view stepped back to the
// whole wheel; what is not built yet is an outline, and carries nothing.
export async function createFold({ canvas, sheet, labelsRoot, constructs, data = {}, world = null, whole = null, archive = null, build = null, onChange }) {
  if (!htmlInCanvasSupport()) return { supported: false, reason: 'This browser cannot draw HTML into WebGPU textures yet (HTML-in-Canvas).' };
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return { supported: false, reason: 'No WebGPU adapter is available.' };
  const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: adapter.limits.maxTextureDimension2D } });
  device.addEventListener('uncapturederror', (e) => console.error('[webgpu]', e.error.message));
  const gctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  gctx.configure({ device, format, alphaMode: 'premultiplied' });
  const G = makeGpu(device, format);

  // the doors of the archive are links in their own landmark, so that they can
  // be reached from the keyboard while the rest of the labels stay hidden
  let doorsRoot = null;
  if (archive) {
    doorsRoot = document.createElement('nav');
    doorsRoot.id = 'expo-doors';
    doorsRoot.setAttribute('aria-label', 'Cells of the archive');
    document.body.appendChild(doorsRoot);
  }
  const st = { t: 0, target: 0, captured: false, busy: false, running: false, tiles: [], scene: null, sheetBox: null, last: 0, time: 0, mouse: [0, 0], orbit: [0, 0], drag: null, returning: false, focus: null, spacer: null };

  // the caption of the story being told, and a dot for each of its beats
  const caption = document.createElement('aside');
  caption.className = 'story';
  caption.setAttribute('aria-live', 'polite');
  caption.innerHTML = '<p class="say"></p><ol class="beats" aria-hidden="true"></ol>';
  document.body.appendChild(caption);

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

  // The reader changed a figure while the page is folded: copy the tiles it
  // covers again, and rebuild its construct alone. Changes that arrive while
  // this runs are gathered and done next, at most about twenty times a second.
  async function recapture(top, bottom) {
    const tiles = st.tiles.filter((T) => T.rect[3] > top && T.rect[1] < bottom);
    if (!tiles.length) return;
    const W = sheet.getBoundingClientRect().width;
    const clone = sheet.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.style.cssText = `width:${W}px;margin:0;pointer-events:none;`;
    canvas.appendChild(clone);
    try {
      await new Promise((resolve, reject) => {
        pending = { clone, W, tiles, resolve, reject };
        canvas.requestPaint();
        setTimeout(() => { if (pending) { pending = null; reject(new Error('No paint event from the canvas.')); } }, 4000);
      });
    } finally {
      clone.remove();
    }
    for (const T of tiles) G.mips(T.tex);
  }
  function rebuildFigure(fig) {
    const sc = st.scene;
    const fid = fig.dataset.fold ?? fig.dataset.fig;
    const keep = { callout: sc.callouts.find((c) => c.fid === fid), crowd: sc.crowds.find((c) => c.fid === fid), story: sc.stories.find((c) => c.fid === fid) };
    for (const it of sc.objs) if (it.fid === fid) it.o.destroy();
    for (const L of sc.labels) if (L.fid === fid) L.el.remove();
    for (const N of sc.wheels) if (N.fid === fid) N.tag?.remove();
    sc.objs = sc.objs.filter((it) => it.fid !== fid);
    sc.labels = sc.labels.filter((L) => L.fid !== fid);
    sc.agents = sc.agents.filter((a) => a.fid !== fid);
    sc.crowds = sc.crowds.filter((c) => c.fid !== fid);
    sc.engines = sc.engines.filter((e) => e.fid !== fid);
    sc.stories = sc.stories.filter((e) => e.fid !== fid);
    sc.wheels = sc.wheels.filter((e) => e.fid !== fid);
    sc.models = sc.models.filter((e) => e.fid !== fid);
    buildFigure(sc, fig, keep);
  }
  const queued = new Set();
  let refreshing = false;
  async function refresh(id) {
    queued.add(id);
    if (refreshing) return;
    refreshing = true;
    try {
      while (queued.size) {
        const ids = [...queued];
        queued.clear();
        for (const fid of ids) {
          const fig = sheet.querySelector(`figure[data-fig="${fid}"], [data-fold="${fid}"]`);
          if (!fig || !st.scene) continue;
          const r = fig.getBoundingClientRect();
          await recapture(r.top + scrollY, r.bottom + scrollY);
          rebuildFigure(fig);
        }
        await new Promise((res) => setTimeout(res, 50));
      }
    } catch (err) {
      console.error('refresh', err);
      st.captured = false;
    } finally {
      refreshing = false;
    }
  }

  // ---- agents: plaster maquettes from tools/blender ----
  let AG = null;
  const agentQ = new Map();
  async function loadAgents() {
    if (AG) return;
    const assets = await loadAssets();
    AG = {};
    for (const [name, parts] of Object.entries(assets)) {
      const max = name.endsWith('_crowd') ? 512 : 64;
      AG[name] = parts.map((p) => ({ solid: G.solid(p.geometry, { max }), color: p.material === 'shade' ? SHADE : PLASTER }));
    }
  }
  const allSolids = () => Object.values(AG ?? {}).flatMap((parts) => parts.map((p) => p.solid));

  function pageFrame(x, s, P) {
    const o = toWorld([0, 0, 0], [x, s, x, s], P);
    const N = unit(sub(toWorld([0, 0, 1], [x, s, x + 1, s], P), o));
    const D = unit(sub(toWorld([0, 0, 0], [x, s + 3, x, s + 3], P), toWorld([0, 0, 0], [x, s - 3, x, s - 3], P)));
    return { o, X: [1, 0, 0], N, D };
  }
  // tilt turns the agent about its own x axis: −π/2 lays it on its back
  function putAgent(name, F, lift, sc, ry, grow, tilt = 0) {
    if (grow < 0.03) return;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const ax = add(scl(F.X, c), scl(F.D, -s));
    const az = add(scl(F.X, s), scl(F.D, c));
    const up = add(scl(F.N, Math.cos(tilt)), scl(az, Math.sin(tilt)));
    const fwd = add(scl(F.N, -Math.sin(tilt)), scl(az, Math.cos(tilt)));
    const m = basis(add(F.o, scl(F.N, lift)), scl(ax, sc), scl(up, sc * grow), scl(fwd, sc));
    for (const part of AG?.[name] ?? []) {
      if (!agentQ.has(part.solid)) agentQ.set(part.solid, []);
      agentQ.get(part.solid).push({ m, color: part.color, p: MATTE });
    }
  }

  // ---- scene: one construct per figure, built in its plot box ----
  function buildScene() {
    G.freeScene();
    labelsRoot.replaceChildren();
    doorsRoot?.replaceChildren();
    const sc = { objs: [], labels: [], agents: [], callouts: [], titles: [], crowds: [], engines: [], stories: [], wheels: [], models: [], world: null };
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
    Object.assign(sc, { label, leaders, sb });

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
      const made = buildFigure(sc, fig);
      if (made && world?.[made.id]) stops.push({ c: made.group.center, p: placeOf(world[made.id]) });
    }

    // the build: its stories at their headings, and for each cell, group and
    // route the beats that build it (none: built from the start)
    sc.built = null;
    if (build && world) {
      const when = { cells: new Map(), groups: new Map(), flows: new Map() };
      const at = (fid, beat, add) => {
        for (const kind of ['cells', 'groups', 'flows']) for (const n of add?.[kind] ?? []) {
          if (!when[kind].has(n)) when[kind].set(n, []);
          when[kind].get(n).push({ fid, beat });
        }
      };
      const base = build.base ?? {};
      for (const kind of ['cells', 'groups', 'flows']) for (const n of base[kind] ?? []) when[kind].set(n, []);
      (build.stories ?? []).forEach((B, i) => {
        const el = sheet.querySelector(B.at);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const fid = `build-${i}`;
        let cam = { az: 0, el: 0, zoom: 1, at: null };
        const cams = B.beats.map((b) => (cam = { ...cam, ...(b.cam ?? {}) }));
        const was = st.scene?.stories?.find((S) => S.fid === fid);
        sc.stories.push({ fid, build: true, group: { center: (r.top + r.bottom) / 2 + scrollY }, box: null, L: null, beats: B.beats, cams, c: (r.top + r.bottom) / 2 + scrollY, len: B.beats.length * BEAT, shown: was?.shown ?? 0, target: was?.target ?? 0 });
        B.beats.forEach((b, k) => at(fid, k, b.add));
      });
      for (const E of build.events ?? []) at(E.fid, E.beat, E.add);
      sc.stories.sort((a, b) => a.c - b.c);
      sc.built = when;
    }

    // the world: the wheel's rings and cells with their signs, the people on
    // its rim, and the parcels that circulate between them
    if (world) {
      stops.sort((a, b) => a.c - b.c);
      const Z = [0, 0, 0, 0];
      const geo = wheelGeometry();
      const ring = G.lines(geo.ringLines, Z, COL.chalk, 1.3, 1, false, 0);
      const grid = G.lines(geo.grid, Z, COL.chalk, 1, 1, false, 0);
      const cells = geo.plates.map(({ cell, quads }) => {
        const parts = quads.map((q) => quadVerts(q));
        const v = new Float32Array(parts.reduce((n, a) => n + a.length, 0));
        parts.reduce((off, a) => { v.set(a, off); return off + a.length; }, 0);
        const plate = G.mesh(v, Z, COL[cell.c], 1.1, 0);
        plate.space = 0;
        const sign = document.createElement(archive ? 'a' : 'div');
        sign.className = archive ? 'xl room door' : 'xl room';
        sign.innerHTML = `<span>${cell.layer}</span>${cell.name}`;
        if (archive) {
          sign.href = cell.href;
          sign.tabIndex = -1;
          doorsRoot.appendChild(sign);
        } else labelsRoot.appendChild(sign);
        // held still by a model: hatched, with the value it is held at
        const hatch = Object.assign(G.lines(hatchOf(cell), Z, COL.chalk, 1.1, 0.75, false, 0), { space: 0 });
        const held = Object.assign(document.createElement('div'), { className: 'xl tag held' });
        labelsRoot.appendChild(held);
        return { cell, plate, sign, spots: signSpots(cell), hatch, held, mode: { m: 1, s: 0, o: 0, l: 0 } };
      });
      const groups = population();
      const point = (pts, c, size, glow, max) => Object.assign(G.points(pts, Z, COL[c], size, 1, glow, max), { space: 0, persp: PERSP });
      const dots = groups.map((g) => point(g.pts, g.c, g.size, 0.4));
      // an agent that is out (a failed bank, a stopped firm) turns red
      const failed = point([], 'madder', 1, 0.6, 64);
      dots.push(failed);
      const flow = circulation(groups);
      // ties between particular agents, drawn when a model has them
      const tie = ties(groups);
      const tieLines = Object.assign(G.lines(tie.segs, Z, COL.chalk, 1, 0.5, false, 0), { space: 0 });
      // what the wheel produces, beside the hub, when a model measures it
      const measured = Object.assign(document.createElement('div'), { className: 'xl tag measured' });
      labelsRoot.appendChild(measured);
      const parcels = [point([], 'ochre', 3.4, 1, 1200), point([], 'white', 3.4, 0.8, 1200)];
      const trails = [G.lines([], Z, COL.ochre, 1.6, 0.8, false, 0, 1200), G.lines([], Z, COL.white, 1.4, 0.6, false, 0, 1200)];
      const still = REDUCED ? flow.lines().map(({ f, segs }) => Object.assign(G.lines(segs, Z, f.money ? COL.ochre : COL.white, 1.4, 0.6, false, 0), { route: f.name })) : [];
      const pos = (sel, top) => {
        const r = sheet.querySelector(sel)?.getBoundingClientRect();
        return r ? (top ? r.top : (r.top + r.bottom) / 2) + scrollY : null;
      };
      sc.whole = whole ? { from: pos(whole.from, true), to: pos(whole.to, false) } : null;
      sc.world = { stops, ring, grid, cells, dots, flow, parcels, trails, still, groups, failed, goneKey: '', tie, tieLines, measured, look: { alike: 0, unlike: 0, tied: 0, measured: 0 } };
    }

    // Part 3: the routes through the whole wheel, each in its own colour, with
    // its name where it starts
    if (archive && world) {
      const fig = sheet.querySelector(`figure[data-fig="${archive.figure}"]`)?.getBoundingClientRect();
      const end = sheet.querySelector(archive.end)?.getBoundingClientRect();
      const routes = archive.routes.map((rt, i) => {
        const { pts, stops, at } = routeOf(rt.places, 0.12 + 0.07 * i);
        const segs = pts.slice(1).map((q, k) => [pts[k], q]);
        const lines = G.lines(segs, [0, 0, 0, 0], COL[rt.c], 3, 1, false, 0);
        const dots = G.points(stops.map((p) => [...p, 0.9]), [0, 0, 0, 0], COL[rt.c], 7, 1, 0.6);
        dots.space = 0;
        const el = document.createElement('div');
        el.className = `xl route ${rt.c}`;
        el.textContent = rt.name;
        labelsRoot.appendChild(el);
        return { ...rt, lines, dots, el, start: pts[0], stops, at, reached: stops.length, cells: new Set(rt.places.flat()) };
      });
      sc.archive = {
        c: fig ? (fig.top + fig.bottom) / 2 + scrollY : 0,
        end: end ? end.bottom + scrollY : 0,
        routes,
      };
    }
    return sc;
  }

  // One figure's construct, labels, callout and crowd. Every item carries the
  // figure's id, so that the figure can be rebuilt alone when the reader changes
  // it; keep holds what survives a rebuild (the callout with its controls, and
  // the crowd's state).
  function buildFigure(sc, fig, keep = null) {
    const id = fig.dataset.fold ?? fig.dataset.fig;
    const spec = constructs[id];
    if (!spec) return null;
    const pbEl = spec.whole ? fig : fig.querySelectorAll('.plotbox')[spec.panel ?? 0];
    if (!pbEl) return null;
    const pb = pbEl.getBoundingClientRect();
    const box = [pb.left + scrollX, pb.top + scrollY, pb.right + scrollX, pb.bottom + scrollY];
    const dom = typeof spec.dom === 'function' ? spec.dom(data) : spec.dom;
    const L = ([x, y, h]) => [(x - dom.x[0]) / (dom.x[1] - dom.x[0]), (y - dom.y[0]) / (dom.y[1] - dom.y[0]), h];
    const group = { center: (box[1] + box[3]) / 2 };
    const obj = (o, it) => sc.objs.push({ o, group, kind: 'fig', fid: id, show: it?.show, draw: it?.draw, rise: it?.rise });
    const label = (it, ...a) => Object.assign(sc.label(...a), { fid: id, show: it?.show, rise: it?.rise });
    let X;
    try {
      X = spec.build(data);
    } catch (err) {
      console.error(`construct ${id}`, err);
      return null;
    }
    for (const s of X.surfaces ?? []) {
      const v = surfaceVerts(s, L, s.n ?? 46);
      if (v.length) obj(G.mesh(v, box, COL[s.c], Math.min(0.95, (s.alpha ?? 0.3) * SURF), s.freq ?? 0), s);
    }
    for (const q of X.quads ?? []) {
      const pts = q.q.map(L);
      if (q.fill !== false) obj(G.mesh(quadVerts(pts), box, COL[q.c], Math.min(0.95, (q.alpha ?? 0.25) * SURF), 0), q);
      if (q.edge !== false) obj(G.lines(pts.map((p, i) => [p, pts[(i + 1) % pts.length]]), box, COL[q.c], q.w ?? 1.2, q.o ?? 0.85), q);
    }
    // batches: many quads in one mesh, many segments in one set of lines
    for (const m of X.meshes ?? []) {
      const parts = m.quads.map((q) => quadVerts(q.map(L)));
      const v = new Float32Array(parts.reduce((n, a) => n + a.length, 0));
      let off = 0;
      for (const a of parts) { v.set(a, off); off += a.length; }
      if (v.length) obj(G.mesh(v, box, COL[m.c], Math.min(0.95, (m.alpha ?? 0.3) * SURF), 0), m);
    }
    for (const s of X.segs ?? []) {
      const segs = s.segs.map(([p, q]) => [L(p), L(q)]).filter(([p, q]) => p.every(Number.isFinite) && q.every(Number.isFinite));
      if (segs.length) obj(G.lines(segs, box, COL[s.c ?? 'white'], s.w ?? 1.2, s.o ?? 1, Boolean(s.dash)), s);
    }
    for (const c of X.lines ?? []) {
      const pts = c.pts.map(L);
      const segs = [];
      for (let i = 1; i < pts.length; i++) if (pts[i - 1].every(Number.isFinite) && pts[i].every(Number.isFinite)) segs.push([pts[i - 1], pts[i]]);
      if (!segs.length) continue;
      obj(G.lines(segs, box, COL[c.c ?? 'white'], c.w ?? 2, c.o ?? 1, Boolean(c.dash)), c);
      // a dot that rides the end of a line as it is drawn on
      if (c.draw != null && c.head) {
        const line = sc.objs[sc.objs.length - 1];
        obj(G.points([[...segs[0][0], 1.2]], box, COL[c.head], 8, 1, 1), c);
        Object.assign(sc.objs[sc.objs.length - 1], { draw: null, head: { line, segs, at: -1 } });
      }
    }
    const byColor = {};
    for (const p of X.points ?? []) (byColor[`${p.c ?? 'white'} ${p.show ?? ''} ${p.rise ?? ''}`] ??= { c: p.c ?? 'white', show: p.show, rise: p.rise, pts: [] }).pts.push([...L(p.at), (p.size ?? 8) / 8]);
    for (const k in byColor) obj(G.points(byColor[k].pts, box, COL[byColor[k].c], 8, 1, 1), byColor[k]);
    for (const e of X.eqs ?? []) label(e, e.html, 'xeq', L(e.at), box, group);
    for (const t of X.tags ?? []) label(t, t.text, `tag ${t.c ?? ''}${t.href ? ' door' : ''}`, L(t.at), box, group, t.href);
    for (const a of X.agents ?? []) sc.agents.push({ name: a.asset, local: L(a.at), box, group, scale: a.scale ?? 0.05, ry: a.ry ?? 0, fid: id, show: a.show, rise: a.rise });
    // a dimension line along the raised axis, its name and range at the top end
    for (const dm of X.dims ?? []) {
      const p = L(dm.from);
      const q = L(dm.to);
      const t = 0.012;
      const segs = [[p, q], [[p[0] - t, p[1], p[2]], [p[0] + t, p[1], p[2]]], [[q[0] - t, q[1], q[2]], [q[0] + t, q[1], q[2]]]];
      obj(G.lines(segs, box, COL.chalk, 1.3, 0.95), dm);
      label(dm, dm.text, 'dim', [q[0] + 0.02, q[1], q[2]], box, group);
    }
    // an engine: agents whose state the construct steps each frame
    // (docs/engine.md); its dots and segments are redrawn every frame
    if (X.engine) {
      const E = X.engine;
      const dots = E.dots.map((d) => { const o = G.points([], box, COL[d.c], d.size ?? 4, d.o ?? 1, d.glow ?? 0, d.max); obj(o); return o; });
      const segs = (E.segs ?? []).map((d) => { const o = G.lines([], box, COL[d.c], d.w ?? 1, d.o ?? 1, false, 1, d.max); obj(o); return o; });
      sc.engines.push({ fid: id, group, E, dots, segs, L });
    }
    // a story: the view of each beat, each beat inheriting what it leaves out
    if (X.story?.length) {
      let cam = { az: 0, el: 0, zoom: 1, at: null };
      const cams = X.story.map((b) => (cam = { ...cam, ...(b.cam ?? {}) }));
      const was = keep?.story;
      sc.stories.push({ fid: id, group, box, L, beats: X.story, cams, c: group.center, len: X.story.length * BEAT, shown: was?.shown ?? 0, target: was?.target ?? 0 });
      sc.stories.sort((a, b) => a.c - b.c);
    }
    // the margin callout: the figure's number and what it holds fixed, and the
    // figure's controls, so that it can be changed while the page is folded
    const dm0 = X.dims?.[0];
    const target = dm0 ? L(dm0.from.map((v, k) => (v + dm0.to[k]) / 2)) : [0.5, 0.5, 0];
    const no = spec.callout === false ? null : fig.querySelector('.fig-no');
    if (keep?.callout) Object.assign(keep.callout, { group, box, target, rise: dm0?.rise });
    else if (no) {
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
      const ctl = fig.querySelector('.fig-ctl');
      if (ctl) {
        const copy = ctl.cloneNode(true);
        for (const e of [copy, ...copy.querySelectorAll('[id]')]) e.removeAttribute('id');
        const from = [...ctl.querySelectorAll('input')];
        const outs = [...ctl.querySelectorAll('output')];
        const outsTo = [...copy.querySelectorAll('output')];
        [...copy.querySelectorAll('input')].forEach((input, i) => input.addEventListener('input', () => {
          from[i].value = input.value;
          from[i].dispatchEvent(new Event('input', { bubbles: true }));
          outs.forEach((o, k) => { outsTo[k].textContent = o.textContent; });
        }));
        el.append(copy);
        el.classList.add('live');
      }
      labelsRoot.appendChild(el);
      const line = document.createElementNS(SVGNS, 'line');
      sc.leaders.appendChild(line);
      sc.callouts.push({ el, line, group, box, target, rise: dm0?.rise, x: sc.sb[2] + 36, fid: id });
    }
    // a figure may take agents of the wheel out: X.wheel(beat) gives
    // { group: [their indices] }
    if (X.wheel) {
      // wheelTag names the first agent taken out, beside it on the wheel
      const tag = X.wheelTag ? Object.assign(document.createElement('div'), { className: 'xl tag madder', innerHTML: X.wheelTag }) : null;
      if (tag) labelsRoot.appendChild(tag);
      sc.wheels.push({ fid: id, group, fn: X.wheel, tag });
    }
    // a figure may put the wheel in a model's state (ontology.js): X.model(beat)
    // gives { moving: Set, stopped: Map(cell → value), lit, size, tied, measured }
    if (X.model) sc.models.push({ fid: id, group, fn: X.model });
    // a crowd on the wheel's floor beside the page, in the figure's cell
    if (X.crowd && world?.[id]) {
      const place = placeOf(world[id]);
      const room = place.cells[0];
      const spots = crowdSpots(X.crowd.items);
      const before = keep?.crowd;
      const items = X.crowd.items.map((it, i) => {
        const was = before?.items[i];
        const start = !before?.shown ? null : was && was.fall === it.fall ? was.start : st.time + (it.fall ? (it.round ?? 0) * TOPPLE : 0);
        return { ...it, at: spots[i], tilt: was?.tilt ?? 0, start };
      });
      sc.crowds.push({ fid: id, room, place, group, asset: X.crowd.asset, items, from: X.crowd.from ?? 0, shown: Boolean(before?.shown) });
    }
    return { id, group };
  }

  // ---- stories ----
  // The reading line for a scroll position: inside a story's stretch of scroll
  // it stays at the figure, and p counts the beats scrolled through.
  function mapScroll(sc, r) {
    let off = 0;
    for (const S of sc?.stories ?? []) {
      if (r < S.c + off) break;
      if (r < S.c + off + S.len) return { focus: S.c, story: S, p: (r - S.c - off) / BEAT };
      off += S.len;
    }
    return { focus: r - off, story: null, p: 0 };
  }
  // the folded scroll position's reading line for a flat one
  function unmapScroll(sc, focus) {
    let off = 0;
    for (const S of sc?.stories ?? []) if (S.c < focus) off += S.len;
    return focus + off;
  }
  // a beat item's visibility: it comes in as beat show[0] begins and goes as
  // beat show[1] begins
  const vis = (show, b) => (!show ? 1 : clamp(b - (show[0] - 1), 0, 1) * (show[1] == null ? 1 : 1 - clamp(b - (show[1] - 1), 0, 1)));
  // how far a rise: beat item has come up off the page
  const lifted = (rise, b) => (rise == null ? 1 : ease(clamp(b - (rise - 1), 0, 1)));
  // the view a story asks for between its two nearest beats
  function storyView(S, P, hs) {
    const n = S.cams.length;
    const i = clamp(Math.floor(S.shown), 0, n - 1);
    const f = ease(clamp(S.shown - i, 0, 1));
    const a = S.cams[i];
    const b = S.cams[Math.min(i + 1, n - 1)];
    const at = (c) => (c.at ? toWorld(S.L(c.at), S.box, P, hs) : null);
    return { az: lerp(a.az, b.az, f), el: lerp(a.el, b.el, f), zoom: lerp(a.zoom, b.zoom, f), pa: at(a), pb: at(b), f };
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
      // back to the flat page, at the same reading line
      if (st.spacer?.isConnected) {
        const f = mapScroll(st.scene, scrollY + innerHeight / 2).focus;
        st.spacer.remove();
        scrollTo({ top: f - innerHeight / 2, behavior: 'instant' });
      }
      st.focus = null;
      caption.classList.remove('on');
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
    const sc = st.scene;
    // the reading line, less the scroll that stories have held it for
    const M = mapScroll(sc, scrollY + H / 2);
    st.focus = M.focus;
    const P = { focus: M.focus, docW: W, t: e };
    const appear = smooth(0.6, 1, e);
    const near = (g) => (g.center == null ? 1 : 1 - smooth(2600, 5200, Math.abs(g.center - P.focus)));
    // a figure's axis rises as it comes up to the reading line and settles back
    // into the paper once it has been read, so one construct stands at a time
    const grow = (g) => (g.center == null ? 1 : smooth(g.center - 1150, g.center - 250, P.focus) * (1 - smooth(g.center + 450, g.center + 1250, P.focus)));

    // each story moves toward the beat the scroll asks for, one beat at a time;
    // the one nearest the reading line takes the camera and the caption
    let SC = null;
    let sw = 0;
    for (const S of sc.stories) {
      const n = S.beats.length;
      S.target = S === M.story ? clamp(Math.floor(M.p), 0, n - 1) : M.focus >= S.c ? n - 1 : 0;
      if (grow(S.group) < 0.02 || REDUCED) S.shown = S.target;
      const dir = Math.sign(S.target - S.shown);
      if (dir) {
        const j = dir > 0 ? Math.floor(S.shown + 1e-6) + 1 : Math.ceil(S.shown - 1e-6);
        S.shown += (dir * dt) / ((S.beats[j]?.dur ?? BEAT_DUR) * (dir > 0 ? 1 : 0.5));
        if ((S.target - S.shown) * dir < 0) S.shown = S.target;
      }
      const d = M.focus - S.c;
      const k = d < 0 ? smooth(-700, 0, d) : 1 - smooth(0, 700, d);
      if (k > sw) {
        sw = k;
        SC = S;
      }
    }
    const beatOf = new Map(sc.stories.map((S) => [S.fid, S.shown]));
    // how far each cell, group and route is built
    const builtOf = (kind) => {
      const m = new Map();
      if (!sc.built) return null;
      for (const [n, list] of sc.built[kind]) m.set(n, list.length ? Math.max(...list.map((w) => lifted(w.beat, beatOf.get(w.fid) ?? 1e9))) : 1);
      return m;
    };
    const cellW = builtOf('cells');
    const groupW = builtOf('groups');
    const flowW = builtOf('flows');
    const bw = (m, n) => (m ? m.get(n) ?? 0 : 1);
    // a model's state of the wheel (ontology.js): the figure nearest the
    // reading line that has one gives it at its beat; without one, all of the
    // wheel moves. Each cell eases toward moving (m), held (s) or left out (o).
    let MS = null;
    let mk = 0.5;
    for (const N of sc.models) {
      const g = grow(N.group);
      if (g > mk) {
        mk = g;
        MS = N;
      }
    }
    const state = MS ? MS.fn(Math.round(beatOf.get(MS.fid) ?? 1e9)) : null;
    const modeOf = (n) => (!state || state.moving.has(n) ? 'm' : state.stopped.has(n) ? 's' : 'o');
    const SV = SC ? storyView(SC, P, ease(grow(SC.group)) * LIFT) : null;
    sw *= e;
    // where the wheel stands: turned, and its hub moved, so that the place being
    // read lies under the reading point; a long move steps the camera back.
    // With reduced motion the wheel does not move: it fades out and back in at
    // the next place.
    const R = sc.world?.stops.length ? wheelAt(sc.world.stops, P.focus, REDUCED ? (u) => (u < 0.5 ? 0 : 1) : ease) : null;
    const pageX = st.sheetBox ? ((st.sheetBox[0] + st.sheetBox[2]) / 2 - W / 2) * PX : 0;
    const A = sc.archive;
    let pose = R ? poseFor(R.r, R.a, [pageX, -0.004, READ_Z], PSI) : null;
    // Part 3: the wheel lies beside the page, and from the plan on the view
    // steps back until it is seen whole (climax); in Part 1 the same happens
    // as stage 6 opens, over the wheel the page lies on
    if (A) pose = { phi: 0.35, C: [pageX + 1.1 + RIM, -0.004, -0.8] };
    const Wh = sc.whole;
    let climax = A
      ? ease(smooth(A.c - 1400, A.c - 250, P.focus) * (1 - smooth(A.end + 150, A.end + 1100, P.focus)))
      : Wh?.from != null && Wh.to != null ? ease(smooth(Wh.from - 1000, Wh.from - 150, P.focus) * (1 - smooth(Wh.to - 900, Wh.to - 350, P.focus))) : 0;
    // a story that builds the wheel steps back to show all of it, and slides
    // the wheel out from under the page to lie beside it, as in Part 3, so
    // that the cell being built is not under the paper
    const BESIDE = [pageX + 1.1 + RIM, -0.004, -0.8];
    const beside = A ? 1 : SC?.build && pose ? ease(sw) : 0;
    if (SC?.build) climax = Math.max(climax, ease(sw));
    if (!A && beside > 0) pose = { phi: pose.phi, C: pose.C.map((v, k) => lerp(v, BESIDE[k], beside)) };
    // while the wheel is built, the figures on the page step back
    const quiet = 1 - 0.85 * (!A && SC?.build ? ease(sw) : 0);
    // (a long move of the wheel steps the view back, but not while the wheel lies beside the page)
    const travel = REDUCED ? 0 : Math.min(1, (R?.travel ?? 0) / 8) * (1 - beside);

    // the flat view of the sheet, dollied back into a raised, tilted one
    const T = CAM;
    const fov = (lerp(0.5, T.fov, e) * Math.PI) / 180;
    const hO = lerp(H * 0.5 * PX, T.h, e);
    const el = clamp(lerp(0, T.el, e) + (st.mouse[1] * 0.04 + st.orbit[1] + lerp(0.6, 0.45, beside) * climax) * e + (SV ? sw * SV.el : 0), 0, 1.35);
    const az = (st.mouse[0] * 0.1 + st.orbit[0] - 0.5 * climax) * e + (SV ? sw * SV.az : 0);
    const near0 = [lerp(0, T.tx, e), lerp(0, T.ty, e), lerp(0, T.tz, e)];
    // the whole view looks at the hub; in Part 3, between the page and the hub,
    // so that the plan on the page and the wheel it describes are seen together
    const hubAt = pose ? [lerp(pose.C[0], lerp(pageX, pose.C[0], 0.6), beside), 0.2, lerp(pose.C[2], lerp(0, pose.C[2], 0.6), beside)] : near0;
    let target = near0.map((v, k) => lerp(v, hubAt[k], climax * e));
    if (SV) {
      const a = SV.pa ?? target;
      const b = SV.pb ?? target;
      target = target.map((v, k) => lerp(v, lerp(a[k], b[k], SV.f), sw));
    }
    // a turned view also steps back, so the room and its neighbours come into sight
    const turned = Math.min(1, Math.hypot(st.orbit[0] / ORBIT.az, st.orbit[1] / ORBIT.hi));
    const dist = (hO / Math.tan(fov / 2)) * (1 + Math.max(1.4 * turned, 1.3 * travel) * e) * (1 + lerp(3.2, 5.6, beside) * climax * e) * (SV ? lerp(1, SV.zoom, sw) : 1);
    const eye = [target[0] + dist * Math.sin(az) * Math.cos(el), target[1] + dist * Math.sin(el), target[2] + dist * Math.cos(az) * Math.cos(el)];
    const vp = multiply(rect({ x: 0, y: 0, w: W, h: H }, W, H), multiply(perspective(fov, W / H, Math.max(0.005, dist - 9), dist + 40), lookAt(eye, target, [0, 1, 0])));

    for (const it of sc.objs) {
      let o = 1;
      if (it.kind === 'grid' || it.kind === 'edge') o = smooth(0.15, 0.9, e);
      else {
        const r = grow(it.group);
        o = appear * near(it.group) * Math.min(1, r * 1.6) * quiet;
        const b = beatOf.get(it.fid) ?? 1e9;
        it.o.hs = ease(r) * LIFT * lifted(it.rise, b);
        if (it.show || it.draw != null || it.head) {
          o *= vis(it.show, b);
          // a line drawn on from its start as its beat begins
          if (it.draw != null) {
            it.o.total ??= it.o.count;
            it.o.count = Math.ceil(it.o.total * ease(clamp(b - (it.draw - 1), 0, 1)));
          }
          // its head rides the end while it is being drawn
          if (it.head) {
            const H2 = it.head;
            const n = H2.line.o.count;
            if (n !== H2.at && n > 0) it.o.set([[...H2.segs[n - 1][1], 1.2]]);
            H2.at = n;
            if (!n) o = 0;
          }
        }
      }
      it.o.opacity = o * it.o.baseOpacity;
    }

    // agents stand where their figure puts them, rising with it
    agentQ.clear();
    if (appear > 0.02) {
      for (const a of sc.agents) {
        if (Math.abs(a.group.center - P.focus) > 2400) continue;
        const b = beatOf.get(a.fid) ?? 1e9;
        const gr = ease(grow(a.group)) * appear * vis(a.show, b) * quiet;
        const x = lerp(a.box[0], a.box[2], a.local[0]);
        const s = lerp(a.box[3], a.box[1], a.local[1]);
        const bw = (a.box[2] - a.box[0]) * PX;
        putAgent(a.name, pageFrame(x, s, P), a.local[2] * bw * ease(grow(a.group)) * LIFT * lifted(a.rise, b), a.scale * bw, a.ry, gr);
      }
    }
    // engines run while their figure stands
    for (const N of sc.engines) {
      const r = grow(N.group) * appear;
      const out = N.E.step(dt, { grow: r, reduced: REDUCED, beat: beatOf.get(N.fid) });
      if (!out) continue;
      const map = (p) => { const q = N.L(p); return [q[0], q[1], q[2], p[3] ?? 1]; };
      out.dots?.forEach((pts, k) => N.dots[k]?.set(pts.map(map)));
      out.segs?.forEach((segs, k) => N.segs[k]?.set(segs.map(([p, q]) => [map(p), map(q)])));
    }
    // crowds stand on the floor of their room while their figure is read; a
    // failed bank topples, later the later the round in which it failed
    for (const C of sc.crowds) {
      const k = R?.weights.get(C.room.name) ?? 0;
      const g = ease(grow(C.group)) * appear * k;
      // in a story, the crowd waits for its beat (crowd.from), and stands up
      // again if the reader goes back before it
      const ready = (beatOf.get(C.fid) ?? 1e9) >= C.from - 0.5;
      if (g > 0.5 && !C.shown && ready) {
        C.shown = true;
        for (const it of C.items) it.start = st.time + 0.4 + (it.round ?? 0) * TOPPLE;
      }
      if (C.shown && !ready) {
        C.shown = false;
        for (const it of C.items) it.start = null;
      }
      if (g < 0.03 || !pose) continue;
      const base = toWorldW(polar(C.place.r, C.place.a), pose);
      for (const it of C.items) {
        if (it.fall && it.start != null && st.time >= it.start) {
          const p = REDUCED ? 1 : Math.min(1, (st.time - it.start) / FALL);
          it.tilt = Math.min(it.tilt, -(Math.PI / 2) * p * p);
        } else {
          it.tilt *= REDUCED ? 0 : Math.exp(-dt * 8);
        }
        const F = { o: [base[0] + it.at[0], base[1], base[2] + it.at[1]], X: [1, 0, 0], N: [0, 1, 0], D: [0, 0, 1] };
        putAgent(C.asset, F, (it.lift ?? 0) + 0.2 * it.s * Math.abs(Math.sin(it.tilt)), it.s, it.ry ?? 0, g, it.tilt);
      }
    }
    // Part 3: each agent stands in its cell on the rim, unless a model leaves
    // the cell out
    if (A && pose && climax > 0.03) {
      for (const w of sc.world?.cells ?? []) {
        const c = w.cell;
        if (!c.asset) continue;
        const F = { o: toWorldW(cellCentre(c), pose), X: [1, 0, 0], N: [0, 1, 0], D: [0, 0, 1] };
        putAgent(c.asset, F, 0, 0.3, 0, climax * appear * bw(cellW, c.name) * (w.mode.m + w.mode.s));
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
    // Part 3: a route belongs to a figure's story, and shows while that figure
    // stands: it comes in at its beat (show), is drawn on at a beat (draw), or
    // is drawn on stop by stop, upto[beat] stops by each beat
    const storyOf = new Map(sc.stories.map((S) => [S.fid, S]));
    const routeOn = (rt) => {
      const S = storyOf.get(rt.fid);
      const b = S?.shown ?? 1e9;
      // (a route steps back while others are drawn: dim, [from, to] beats)
      return climax * (S ? grow(S.group) : 0) * (rt.show ? vis(rt.show, b) : 1) * (rt.dim ? 1 - 0.7 * vis(rt.dim, b) : 1);
    };
    const drawnOf = (rt) => {
      const b = storyOf.get(rt.fid)?.shown ?? 1e9;
      if (rt.upto) {
        const i = clamp(Math.floor(b), 0, rt.upto.length - 1);
        const f = ease(clamp(b - i, 0, 1));
        const k = lerp(rt.upto[i], rt.upto[Math.min(i + 1, rt.upto.length - 1)], f);
        const lo = Math.floor(k);
        const at = rt.at[Math.min(lo, rt.at.length - 1)];
        const next = rt.at[Math.min(lo + 1, rt.at.length - 1)];
        return (at + (next - at) * (k - lo)) / Math.max(1, rt.at[rt.at.length - 1]);
      }
      return rt.draw != null ? ease(clamp(b - (rt.draw - 1), 0, 1)) : 1;
    };
    const weights = R ? new Map(R.weights) : new Map();
    if (A) for (const rt of A.routes) if (!rt.upto) for (const n of rt.cells) weights.set(n, Math.max(weights.get(n) ?? 0, 0.7 * routeOn(rt) * drawnOf(rt)));
    // the cells of a model: those it moves are lit a little, those it names
    // (lit) fully
    const ek = REDUCED ? 1 : 1 - Math.exp(-dt * 4);
    if (sc.world) for (const w of sc.world.cells) {
      const n = w.cell.name;
      const md = modeOf(n);
      const M2 = w.mode;
      M2.m += ((md === 'm' ? 1 : 0) - M2.m) * ek;
      M2.s += ((md === 's' ? 1 : 0) - M2.s) * ek;
      M2.o += ((md === 'o' ? 1 : 0) - M2.o) * ek;
      M2.l += ((state?.lit?.includes(n) ? 1 : 0) - M2.l) * ek;
      if (state) weights.set(n, Math.max(weights.get(n) ?? 0, 0.45 * M2.m, M2.l));
    }
    if (sc.world && pose) {
      const Wd = sc.world;
      const box = [...pose.C, pose.phi];
      // (with reduced motion the wheel fades between places, but not while it
      // lies beside the page to be built)
      const shown = appear * (R && REDUCED ? Math.max(1 - Math.sin(Math.PI * R.s), beside) : 1);
      Wd.ring.box = box;
      Wd.grid.box = box;
      Wd.ring.opacity = shown * (0.3 + 0.35 * climax);
      Wd.grid.opacity = shown * 0.08;
      under.push(Wd.grid, Wd.ring);
      // the people, and the parcels in flight between them; they circulate
      // faster while the whole wheel is in view
      // agents that are out: a bank that has fallen in the folded figure has
      // failed on the wheel too, and a figure may stop others (X.wheel); what
      // ran through them stops
      const gone = {};
      // (the wheel's ten banks are the figure's first ten, its ring)
      const fallen = sc.crowds.find((C) => C.asset === 'bank' && C.shown);
      const nBanks = Wd.groups.find((g) => g.name === 'banks').pts.length;
      fallen?.items.slice(0, nBanks).forEach((it, i) => { if (it.fall && it.start != null && st.time >= it.start) (gone.banks ??= new Set()).add(i); });
      for (const N of sc.wheels) {
        const took = grow(N.group) > 0.5 ? Object.entries(N.fn(beatOf.get(N.fid) ?? 1e9)) : [];
        for (const [g, idx] of took) for (const i of idx) (gone[g] ??= new Set()).add(i);
        if (!N.tag) continue;
        const first = took[0] && Wd.groups.find((x) => x.name === took[0][0])?.pts[took[0][1][0]];
        const pr = first ? project(vp, toWorldW([first[0], 0.02, first[2]], pose), W, H) : null;
        N.tag.style.opacity = pr ? String(shown) : '0';
        if (pr) N.tag.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${clamp(1.5 / pr[2], 0.5, 0.85).toFixed(3)}) translate(0, -140%)`;
      }
      // how the model draws the agents: alike (one stands for all), unlike
      // (households too by income), tied to particular others; and whether it
      // measures what the wheel produces
      const LK = Wd.look;
      for (const k of ['alike', 'unlike', 'tied', 'measured']) LK[k] += ((state?.[k] ? 1 : 0) - LK[k]) * ek;
      const sizeKey = `${LK.alike.toFixed(2)} ${LK.unlike.toFixed(2)}`;
      if (sizeKey !== Wd.sizeKey) {
        Wd.sizeKey = sizeKey;
        Wd.goneKey = null;
        for (const g of Wd.groups) if (g.base) g.pts.forEach((p, i) => { p[3] = g.base[i] + LK.alike * (g.alike[i] - g.base[i]) + LK.unlike * (g.unlike[i] - g.base[i]); });
      }
      const key = Object.entries(gone).map(([g, set]) => `${g}:${[...set]}`).join(' ');
      if (key !== Wd.goneKey) {
        Wd.goneKey = key;
        const failed = [];
        Wd.groups.forEach((g, k) => {
          const out = gone[g.name];
          Wd.dots[k].set(out ? g.pts.filter((_, i) => !out.has(i)) : g.pts);
          if (out) for (const i of out) if (g.pts[i]) failed.push([g.pts[i][0], g.pts[i][1], g.pts[i][2], g.size * (g.pts[i][3] ?? 1)]);
        });
        Wd.failed.set(failed);
      }
      // a route is left out with its market or either end, and held still
      // with its market
      const cellOfGroup = new Map(Wd.groups.map((g) => [g.name, g.cell.name]));
      const routeMode = (f) => {
        const ends = [f.via, cellOfGroup.get(f.from), f.to && cellOfGroup.get(f.to)].filter(Boolean).map(modeOf);
        return ends.includes('o') ? 'o' : modeOf(f.via) === 's' ? 's' : 'm';
      };
      if (!REDUCED) {
        Wd.flow.step(dt, { gone, built: (f) => bw(flowW, f.name) > 0.5 && routeMode(f) !== 'o', has: (g) => bw(groupW, g) > 0.5, given: (f) => !sc.built || sc.built.flows.get(f.name)?.length === 0, frozen: (f) => routeMode(f) === 's', links: state?.tied ? Wd.tie.adj : null });
        const pp = Wd.flow.points();
        Wd.parcels[0].set(pp.money.pts);
        Wd.parcels[1].set(pp.goods.pts);
        Wd.trails[0].set(pp.money.trail);
        Wd.trails[1].set(pp.goods.trail);
      }
      const groupOf = new Map(Wd.groups.map((g, k) => [Wd.dots[k], g.name]));
      const modeAt = new Map(Wd.cells.map((w) => [w.cell.name, w.mode]));
      const flowOf = new Map(FLOWS.map((f) => [f.name, f]));
      for (const d of [...Wd.dots, ...Wd.parcels, ...Wd.trails, ...Wd.still]) {
        d.box = box;
        // seen whole, the dots keep more of their size
        d.persp = PERSP * (1 + 3 * climax);
        // a group's dots come in as it is built, a still route as it is; a
        // model leaves out the agents of a cell it leaves out
        let b = 1;
        if (groupOf.has(d)) {
          const md = modeAt.get(cellOfGroup.get(groupOf.get(d)));
          b = bw(groupW, groupOf.get(d)) * (md.m + 0.8 * md.s);
        } else if (d.route) {
          const rm = routeMode(flowOf.get(d.route));
          b = bw(flowW, d.route) * (rm === 'm' ? 1 : rm === 's' ? 0.45 : 0);
        }
        d.opacity = shown * d.baseOpacity * (0.75 + 0.25 * climax) * b;
        under.push(d);
      }
      // ties, drawn on as a model ties the agents
      Wd.tieLines.box = box;
      Wd.tieLines.total ??= Wd.tieLines.count;
      Wd.tieLines.count = Math.ceil(Wd.tieLines.total * LK.tied);
      Wd.tieLines.opacity = shown * 0.3 * Math.min(1, LK.tied * 2);
      under.push(Wd.tieLines);
      // a cell's sign shows while it is read, and every sign once the whole
      // wheel is in view; it stands where the page leaves it clear
      // the page's edges on screen at the reading line
      const pageHalf = ((sbx[2] - sbx[0]) / 2) * PX;
      const edgeL = project(vp, [pageX - pageHalf, 0, 0], W, H);
      const edgeR = project(vp, [pageX + pageHalf, 0, 0], W, H);
      const clear = (q) => q && (A || !edgeL || !edgeR || q[0] < edgeL[0] - 24 || q[0] > edgeR[0] + 24);
      for (const w of Wd.cells) {
        const k = weights.get(w.cell.name) ?? 0;
        w.plate.box = box;
        const made = bw(cellW, w.cell.name);
        // a model's cell: moving, held (a fainter plate, hatched, its value
        // beside it), or left out (the outline alone)
        const md = w.mode;
        w.plate.opacity = shown * (0.22 + 0.78 * k) * made * (md.m + 0.45 * md.s);
        w.hatch.box = box;
        w.hatch.opacity = shown * made * md.s * 0.5;
        under.push(w.plate, w.hatch);
        const value = state?.stopped.get(w.cell.name);
        if (value && w.held.dataset.v !== value) {
          w.held.dataset.v = value;
          w.held.innerHTML = `<i>held</i> ${value}`;
        }
        const ho = w.held.dataset.v ? shown * made * md.s * (value === '' ? 0 : 1) : 0;
        const hp = ho > 0.02 ? project(vp, toWorldW(cellCentre(w.cell, 0.02), pose), W, H) : null;
        w.held.style.opacity = hp ? String(ho) : '0';
        if (hp) w.held.style.transform = `translate(${hp[0].toFixed(1)}px, ${hp[1].toFixed(1)}px) scale(${clamp(5 / hp[2], 0.85, 1.1).toFixed(3)}) translate(-50%, -50%)`;
        const level = climax > 0.3 || k > 0.02;
        const pr = level ? w.spots.map((p) => project(vp, toWorldW(p, pose), W, H)).find(clear) ?? null : null;
        const o = shown * made * (A ? climax * (0.7 + 0.3 * k) : Math.max(k, climax * 0.8)) * (md.m + md.s + 0.3 * md.o);
        const door = Boolean(A) && o > 0.5;
        w.sign.tabIndex = door ? 0 : -1;
        w.sign.style.pointerEvents = door ? 'auto' : 'none';
        if (!pr || o < 0.02 || pr[0] < -200 || pr[0] > W + 200 || pr[1] < -60 || pr[1] > H + 60) {
          w.sign.style.opacity = '0';
          continue;
        }
        w.sign.style.opacity = String(o);
        w.sign.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${clamp(3.2 / pr[2], 0.55, 1.05).toFixed(3)}) translate(-50%, -50%)`;
      }
    }
    if (sc.world && pose) {
      const Wd = sc.world;
      const o = appear * Wd.look.measured;
      if (state?.measured && Wd.measured.dataset.v !== state.measured) {
        Wd.measured.dataset.v = state.measured;
        Wd.measured.innerHTML = state.measured;
      }
      const pr = o > 0.02 ? project(vp, toWorldW([0, 0.05, 0], pose), W, H) : null;
      Wd.measured.style.opacity = pr ? String(o) : '0';
      if (pr) Wd.measured.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${clamp(5 / pr[2], 0.9, 1.15).toFixed(3)}) translate(-50%, -50%)`;
    }
    if (A && pose) {
      for (const rt of A.routes) {
        const o = appear * routeOn(rt);
        rt.lines.box = [...pose.C, pose.phi];
        rt.dots.box = [...pose.C, pose.phi];
        // a route drawn on in the story: its stops come in as it reaches them
        const drawn = drawnOf(rt);
        rt.lines.total ??= rt.lines.count;
        rt.lines.count = Math.ceil(rt.lines.total * drawn);
        rt.lines.opacity = o;
        const reached = rt.at.filter((k) => k <= Math.round(drawn * rt.at[rt.at.length - 1])).length;
        if (reached !== rt.reached) {
          rt.reached = reached;
          rt.dots.set(rt.stops.slice(0, reached).map((p) => [...p, 0.9]));
        }
        rt.dots.opacity = o;
        over.push(rt.lines, rt.dots);
        const pr = o > 0.02 ? project(vp, toWorldW(rt.start, pose), W, H) : null;
        rt.el.style.opacity = pr ? String(o * clamp(drawn * 3, 0, 1)) : '0';
        if (pr) rt.el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) translate(-50%, -140%)`;
      }
    }
    for (const it of sc.objs) (it.kind === 'grid' || it.kind === 'edge' ? under : over).push(it.o);

    // margin callouts, with a leader to the raised axis
    for (const C of sc.callouts) {
      const r = grow(C.group);
      const o = appear * near(C.group) * smooth(0.5, 0.9, r) * quiet;
      const a = o > 0.02 ? project(vp, toWorld([0, 0, 0], [C.x, C.box[1], C.x, C.box[1]], P), W, H) : null;
      const b = a ? project(vp, toWorld(C.target, C.box, P, ease(r) * LIFT * lifted(C.rise, beatOf.get(C.fid) ?? 1e9)), W, H) : null;
      if (!a || !b) {
        C.el.style.opacity = '0';
        C.el.style.pointerEvents = 'none';
        C.line.style.opacity = '0';
        continue;
      }
      C.el.style.opacity = String(o);
      C.el.style.pointerEvents = o > 0.5 ? '' : 'none';
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
      cam: { vp, eye, W: W * dpr, H: H * dpr, focus: P.focus, docW: W, t: e, time: st.time, fog: e * (1 - 0.85 * climax) },
      bg: { inner: BP_IN.map((v, i) => lerp(DESK[i], v, e)), outer: BP_OUT.map((v, i) => lerp(DESK[i], v, e)), center: [W * dpr * 0.5, H * dpr * 0.42], radius: Math.max(W, H) * dpr * 0.85 },
      fog: BP_OUT,
      tiles: st.tiles.map((T2) => T2.obj),
      solids,
      light: { VP: lightVP, dir: [-Nl[0], -Nl[1], -Nl[2]], shadow: shadowK, catchRect: [sbx[0] - 1000, P.focus - 1300, sbx[2] + 1000, P.focus + 1700], catchStrength: shadowK * 0.55 },
      over,
      under,
      bloom: 0.5 * climax,
    });

    for (const L of sc.labels) {
      const r = L.chapter || L.ruler ? 1 : grow(L.group);
      const b = beatOf.get(L.fid) ?? 1e9;
      const pr = project(vp, toWorld(L.local, L.box, P, ease(r) * LIFT * lifted(L.rise, b)), W, H);
      const o = appear * near(L.group) * (L.chapter || L.ruler ? 1 : smooth(0.55, 1, r) * quiet) * vis(L.show, b);
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

    // the caption says the beat the reader has scrolled to
    const told = SC && sw > 0.6 && appear > 0.5;
    caption.classList.toggle('on', Boolean(told));
    if (told && caption.dataset.key !== `${SC.fid}:${SC.target}:${SC.beats[SC.target].say}`) {
      caption.dataset.key = `${SC.fid}:${SC.target}:${SC.beats[SC.target].say}`;
      const say = caption.querySelector('.say');
      say.innerHTML = SC.beats[SC.target].say;
      say.classList.remove('in');
      void say.offsetWidth;
      say.classList.add('in');
      caption.querySelector('.beats').replaceChildren(...SC.beats.map((_, i) => {
        const li = document.createElement('li');
        if (i <= SC.target) li.className = i === SC.target ? 'now' : 'done';
        return li;
      }));
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
    if (!turnable() || ev.button !== 0 || ev.target.closest('a, button, input, nav, .titleblock, .callout')) return;
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
      // the scroll the stories hold the reading line for is added below the
      // page, and the scroll position moves so that the reading line stays put
      const total = st.scene.stories.reduce((n, S) => n + S.len, 0);
      if (total) {
        const r = scrollY + innerHeight / 2;
        st.spacer ??= Object.assign(document.createElement('div'), { className: 'story-spacer' });
        st.spacer.style.height = `${total}px`;
        document.body.appendChild(st.spacer);
        scrollTo({ top: unmapScroll(st.scene, r) - innerHeight / 2, behavior: 'instant' });
      }
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
    // a figure was redrawn: while folded, show the change at once
    refresh(id) {
      if (st.target === 1 && st.captured && st.scene) refresh(id);
      else st.captured = false;
    },
    get open() { return st.target === 1; },
    // the reading line on the page while folded, which stories hold still
    get focus() { return st.target === 1 || st.t > 0 ? mapScroll(st.scene, scrollY + innerHeight / 2).focus : null; },
    get busy() { return st.busy; },
  };
}
