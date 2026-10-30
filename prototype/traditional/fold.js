// The one 3D mode (docs/redesign.md): the page you are reading folds into a ribbon
// in space, and as each figure reaches the reading line, the axis it holds fixed
// rises out of the paper in place. Fold it back and you are on the same page.
//
// Reuses the engine's renderer, ribbon and capture (expo.js); everything a figure
// raises comes from a construct registry in figure-local coordinates:
// (a, b) in the plot box, h in plot widths.

import { makeGpu, toWorld, htmlInCanvasSupport, copyElement, PX } from './expo.js';
import { loadAssets } from './bench.js';
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
const PLASTER = [0.95, 0.945, 0.92, 1];
const SHADE = [0.7, 0.73, 0.72, 1];
const MATTE = [0.04, 1, 0, 0];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a) => scl(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

export async function createFold({ canvas, sheet, labelsRoot, constructs, data = {}, onChange }) {
  if (!htmlInCanvasSupport()) return { supported: false, reason: 'This browser cannot draw HTML into WebGPU textures yet (HTML-in-Canvas).' };
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return { supported: false, reason: 'No WebGPU adapter is available.' };
  const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: adapter.limits.maxTextureDimension2D } });
  device.addEventListener('uncapturederror', (e) => console.error('[webgpu]', e.error.message));
  const gctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  gctx.configure({ device, format, alphaMode: 'premultiplied' });
  const G = makeGpu(device, format);

  const st = { t: 0, target: 0, captured: false, busy: false, running: false, tiles: [], scene: null, sheetBox: null, last: 0, time: 0, mouse: [0, 0] };

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
    const sc = { objs: [], labels: [], agents: [] };
    const sb = st.sheetBox;
    const H = sb[3] - sb[1];
    const bOf = (s) => 1 - (s - sb[1]) / H;
    const always = { center: null };

    // ribbon edges, ticks every 250 px, a faint grid off the page
    const edge = [];
    const tick = [];
    const step = 40 / H;
    for (let b = 0; b < 1; b += step) edge.push([[0, b, 0], [0, Math.min(1, b + step), 0]], [[1, b, 0], [1, Math.min(1, b + step), 0]]);
    for (let s = 0; s < H; s += 250) {
      const b = bOf(sb[1] + s);
      const long = s % 1000 === 0 ? 0.03 : 0.014;
      tick.push([[-long, b, 0], [0, b, 0]], [[1, b, 0], [1 + long, b, 0]]);
    }
    const grid = [];
    const gstep = 80 / H;
    for (let i = 1; i <= 10; i++) for (const a of [-0.1 * i, 1 + 0.1 * i]) for (let b = 0; b < 1; b += gstep) grid.push([[a, b, 0], [a, Math.min(1, b + gstep), 0]]);
    for (let s = 0; s < H; s += 400) {
      const b = bOf(sb[1] + s);
      grid.push([[-1.0, b, 0], [-0.02, b, 0]], [[1.02, b, 0], [2.0, b, 0]]);
    }
    sc.objs.push({ o: G.lines(grid, sb, COL.chalk, 1, 0.12), group: always, kind: 'grid' });
    sc.objs.push({ o: G.lines(edge, sb, COL.chalk, 1.4, 0.75), group: always, kind: 'edge' });
    sc.objs.push({ o: G.lines(tick, sb, COL.chalk, 1.2, 0.6), group: always, kind: 'edge' });

    // a label with an href is a door: it can be followed from the folded page
    const label = (html, cls, local, box, group, href = null) => {
      const el = document.createElement(href ? 'a' : 'div');
      el.className = `xl ${cls}`;
      el.innerHTML = html;
      if (href) el.href = href;
      labelsRoot.appendChild(el);
      sc.labels.push({ el, local, box, group, link: Boolean(href) });
    };

    // stage titles stand in the margin beside their headings
    for (const stg of sheet.querySelectorAll('.stage[data-no]')) {
      const h2 = stg.querySelector('h2');
      const r = h2.getBoundingClientRect();
      const box = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
      const no = h2.querySelector('.no')?.textContent ?? '';
      label(`<span>${no}</span>${h2.textContent.replace(no, '').trim()}`, 'chapter', [-0.17, 0.5, 0.01], box, { center: box[1] });
      sc.labels[sc.labels.length - 1].chapter = true;
    }

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

    // the flat view of the sheet, dollied back into a raised, tilted one
    const T = CAM;
    const fov = (lerp(0.5, T.fov, e) * Math.PI) / 180;
    const hO = lerp(H * 0.5 * PX, T.h, e);
    const el = lerp(0, T.el, e) + st.mouse[1] * 0.04 * e;
    const az = st.mouse[0] * 0.1 * e;
    const target = [lerp(0, T.tx, e), lerp(0, T.ty, e), lerp(0, T.tz, e)];
    const dist = hO / Math.tan(fov / 2);
    const eye = [target[0] + dist * Math.sin(az) * Math.cos(el), target[1] + dist * Math.sin(el), target[2] + dist * Math.cos(az) * Math.cos(el)];
    const vp = multiply(rect({ x: 0, y: 0, w: W, h: H }, W, H), multiply(perspective(fov, W / H, Math.max(0.005, dist - 6), dist + 40), lookAt(eye, target, [0, 1, 0])));

    const sc = st.scene;
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
    for (const it of sc.objs) (it.kind === 'grid' || it.kind === 'edge' ? under : over).push(it.o);
    G.render({
      ctx: gctx,
      cam: { vp, eye, W: W * dpr, H: H * dpr, focus: P.focus, docW: W, t: e, time: st.time },
      bg: { inner: BP_IN.map((v, i) => lerp(DESK[i], v, e)), outer: BP_OUT.map((v, i) => lerp(DESK[i], v, e)), center: [W * dpr * 0.5, H * dpr * 0.42], radius: Math.max(W, H) * dpr * 0.85 },
      fog: BP_OUT,
      tiles: st.tiles.map((T2) => T2.obj),
      plates: [],
      shadows: [],
      slabs: [],
      solids,
      glass: [],
      cards: [],
      sheets: [],
      bench: { lightVP, lightDir: [-Nl[0], -Nl[1], -Nl[2]], shadow: shadowK, catchRect: [sbx[0] - 1000, P.focus - 1300, sbx[2] + 1000, P.focus + 1700], catchStrength: shadowK * 0.55 },
      over,
      under,
      bloom: 0,
    });

    for (const L of sc.labels) {
      const r = L.chapter ? 1 : grow(L.group);
      const pr = project(vp, toWorld(L.local, L.box, P, ease(r) * LIFT), W, H);
      const o = appear * near(L.group) * (L.chapter ? 1 : smooth(0.55, 1, r));
      if (!pr || o < 0.02 || pr[0] < -300 || pr[0] > W + 300 || pr[1] < -100 || pr[1] > H + 100) {
        L.el.style.opacity = '0';
        if (L.link) L.el.style.pointerEvents = 'none';
        continue;
      }
      const sz = L.chapter ? clamp(2.3 / pr[2], 0.42, 1.25) : L.link ? clamp(1.5 / pr[2], 0.72, 0.95) : clamp(1.5 / pr[2], 0.4, 0.85);
      L.el.style.opacity = String(o);
      if (L.link) L.el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      const shift = L.chapter ? '-100%, -50%' : '0, -100%';
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
