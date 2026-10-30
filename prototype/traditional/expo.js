// Unfold: the sheet is captured with HTML-in-Canvas, laid on a bending ribbon in
// a cyanotype space, and each diagram grows the dimension it was drawn without.

import { TILE, SLAB, SHADOW, MESH, LINE, POINT, BG, MIP, BLUR, COPY, COMPOSITE, SOLID, GLASS, DEPTH, CATCHER, CARD, SHEET } from './shaders.js';
import { FIGURES } from './figures.js';
import { DIVES } from './dives.js';
import { foldScript } from './fold-dissect.js';
import { createAtlas } from './atlas.js';
import { createBench, loadAssets } from './bench.js';
import { perspective, lookAt, multiply, project, rect, ortho } from './math.js';
import { lerp, clamp, smooth, ease, surfaceVerts, quadVerts, alongPath } from './geom.js';

export const PX = 1 / 900;
const ATLAS = new URLSearchParams(location.search).has('atlas');
// Bend: flat floor for u0 before the reading line, then an arc of radius r up to theta.
const BEND = { u0: 520 * PX, k: 1 / (720 * PX), theta: (92 * Math.PI) / 180 };
const SAMPLES = 4;
const TILE_H = 2048;
const DURATION = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1.6;

const DESK = [0.776, 0.808, 0.765];
const BP_IN = [0.1, 0.25, 0.42];
const BP_OUT = [0.03, 0.09, 0.17];
const COL = {
  cobalt: [0.52, 0.72, 1.0],
  madder: [1.0, 0.55, 0.55],
  olive: [0.74, 0.9, 0.46],
  ochre: [1.0, 0.82, 0.42],
  chalk: [0.86, 0.91, 0.96],
  white: [1, 1, 1],
};

const approach = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
const D2R = Math.PI / 180;
const DIVE_TIME = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 1.1;

// Camera poses for a dive, relative to the figure (degrees, zoom on the fit distance).
const POSE = {
  top: { az: 0, el: 89.4, zoom: 1.14, lift: 0, pa: 0, pb: 0 },
  three: { az: -32, el: 30, zoom: 1.25, lift: 0.12, pa: 0, pb: 0 },
  front: { az: 0, el: 4, zoom: 1.2, lift: 0.18, pa: 0, pb: -0.1 },
};

// ---------- JS mirror of the WGSL ribbon ----------

function bendAN(u, t) {
  const { u0, k, theta } = BEND;
  const kk = k * t;
  const w = -u - u0;
  if (kk < 1e-5 || w <= 0) return [u, 0, 0];
  const L = theta / kk;
  const s = Math.min(w, L);
  const phi = kk * s;
  let a = -u0 - Math.sin(phi) / kk;
  let n = (1 - Math.cos(phi)) / kk;
  if (w > L) {
    const r = w - L;
    a -= Math.cos(theta) * r;
    n += Math.sin(theta) * r;
  }
  return [a, n, phi];
}

export function toWorld(p, box, P, hs = 1) {
  const xp = lerp(box[0], box[2], p[0]);
  const sp = lerp(box[3], box[1], p[1]);
  const [a, n, phi] = bendAN((sp - P.focus) * PX, P.t);
  const tau = (1 - P.t) * Math.PI * 0.5;
  const A = [0, -Math.sin(tau), Math.cos(tau)];
  const N = [0, Math.cos(tau), Math.sin(tau)];
  const k = p[2] * hs * (box[2] - box[0]) * PX;
  const nx = [0, A[1] * Math.sin(phi) + N[1] * Math.cos(phi), A[2] * Math.sin(phi) + N[2] * Math.cos(phi)];
  return [(xp - P.docW / 2) * PX, A[1] * a + N[1] * n + nx[1] * k, A[2] * a + N[2] * n + nx[2] * k];
}

const orbit = (t, az, el, dist) => [t[0] + dist * Math.sin(az) * Math.cos(el), t[1] + dist * Math.sin(el), t[2] + dist * Math.cos(az) * Math.cos(el)];

// ---------- capability ----------

export function htmlInCanvasSupport() {
  const ok = 'requestPaint' in HTMLCanvasElement.prototype && 'gpu' in navigator && typeof GPUQueue !== 'undefined' &&
    ('copyElementImageToTexture' in GPUQueue.prototype || 'drawElementImageToTexture' in GPUQueue.prototype);
  return ok;
}

export function copyElement(queue, source, sx, sy, sw, sh, texture, width, height) {
  if (queue.copyElementImageToTexture) {
    queue.copyElementImageToTexture({ source, sx, sy, swidth: sw, sheight: sh }, { destination: { texture, premultipliedAlpha: true }, width, height });
  } else {
    queue.drawElementImageToTexture({ source, sourceX: sx, sourceY: sy, sourceWidth: sw, sourceHeight: sh }, { texture, size: { width, height }, premultipliedAlpha: true });
  }
}

// ---------- the module ----------

export async function createExpo({ canvas, sheet, labelsRoot, ctx, panel, record = null, onChange }) {
  if (!htmlInCanvasSupport()) return { supported: false, reason: 'This browser cannot draw HTML into WebGPU textures yet (HTML-in-Canvas).' };
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return { supported: false, reason: 'No WebGPU adapter is available.' };
  const device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: adapter.limits.maxTextureDimension2D } });
  device.addEventListener('uncapturederror', (e) => console.error('[webgpu]', e.error.message));
  const gctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  gctx.configure({ device, format, alphaMode: 'premultiplied' });

  const G = makeGpu(device, format);
  const st = {
    t: 0, target: 0, captured: false, busy: false,
    tiles: [], scene: null, mouse: [0, 0], time: 0,
    sheetBox: null, last: performance.now(), running: false,
    figs: {}, dive: null, dv: 0,
  };

  // ---- capture ----
  let pending = null;
  const dirty = new Set();
  canvas.addEventListener('paint', () => {
    // live plates: figures and charts redrawn while the page is unfolded
    for (const L of dirty) {
      try {
        copyElement(device.queue, L.host, 0, 0, L.w, L.h, L.tex, L.tex.width, L.tex.height);
        G.mips(L.tex);
      } catch (err) {
        console.error(err);
      }
    }
    dirty.clear();
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

  // A plate is an element kept inside the canvas, copied to its own texture
  // whenever it changes, and laid over the page where its original stands.
  const plateHosts = [];
  const plates = {
    host(w, h, ox, oy) {
      const el = document.createElement('div');
      el.className = 'plate-src';
      el.style.cssText = `width:${w}px;height:${h}px;background-position:${-1 - ox}px ${-1 - oy}px, ${-1 - ox}px ${-1 - oy}px, ${-1 - ox}px ${-1 - oy}px, ${-1 - ox}px ${-1 - oy}px;`;
      canvas.appendChild(el);
      plateHosts.push(el);
      return el;
    },
    // a plate with a page rect is laid over the page; without one it is a card in space
    mark(L) {
      if (!L.tex) {
        const S = Math.min(devicePixelRatio || 1, L.rect ? 1.5 : 1.25);
        if (L.rect) {
          L.w = L.rect[2] - L.rect[0];
          L.h = L.rect[3] - L.rect[1];
        }
        L.tex = G.texture(Math.ceil(L.w * S), Math.ceil(L.h * S));
        if (L.rect) L.plate = G.tile(L.tex, L.rect, Math.max(4, Math.round(L.h / 40)));
        else L.card = G.card(L.tex);
      }
      dirty.add(L);
      canvas.requestPaint();
    },
  };
  let assets = null;

  async function capture() {
    const r = sheet.getBoundingClientRect();
    const W = r.width;
    const H = sheet.offsetHeight;
    const sx = r.left + scrollX;
    const sy = r.top + scrollY;
    // a long sheet is captured a little coarser to keep its tiles in memory
    const S = Math.min(devicePixelRatio || 1, H > 50000 ? 1 : 1.25);
    for (const T of st.tiles) {
      T.tex.destroy();
      T.obj?.destroy();
    }
    st.tiles = [];
    for (let y = 0; y < H; y += TILE_H) {
      const sh = Math.min(TILE_H, H - y);
      const w = Math.ceil(W * S);
      const h = Math.ceil(sh * S);
      const tex = device.createTexture({
        size: [w, h],
        format: 'rgba8unorm',
        mipLevelCount: Math.floor(Math.log2(Math.max(w, h))) + 1,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      });
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

  // ---- scene ----
  function buildScene() {
    G.freeScene();
    labelsRoot.replaceChildren();
    const sc = { objs: [], labels: [], flows: [], agents: [], decor: [] };
    const sb = st.sheetBox;
    const H = sb[3] - sb[1];
    const bOf = (s) => 1 - (s - sb[1]) / H;
    const always = { center: null };

    // ribbon edges, ticks, and a grid on the ribbon's invisible extension
    const edge = [];
    const tick = [];
    const step = 40 / H;
    for (let b = 0; b < 1; b += step) {
      edge.push([[0, b, 0], [0, Math.min(1, b + step), 0]], [[1, b, 0], [1, Math.min(1, b + step), 0]]);
    }
    for (let s = 0; s < H; s += 250) {
      const b = bOf(sb[1] + s);
      const long = s % 1000 === 0 ? 0.03 : 0.014;
      tick.push([[-long, b, 0], [0, b, 0]], [[1, b, 0], [1 + long, b, 0]]);
    }
    const grid = [];
    const gstep = 80 / H;
    const cols = [];
    for (let i = 1; i <= 12; i++) cols.push(-0.1 * i, 1 + 0.1 * i);
    for (const a of cols) for (let b = 0; b < 1; b += gstep) grid.push([[a, b, 0], [a, Math.min(1, b + gstep), 0]]);
    for (let s = 0; s < H; s += 400) {
      const b = bOf(sb[1] + s);
      grid.push([[-1.2, b, 0], [-0.02, b, 0]], [[1.02, b, 0], [2.2, b, 0]]);
    }
    sc.objs.push({ o: G.lines(grid, sb, COL.chalk, 1, 0.12), group: always, kind: 'grid' });
    sc.objs.push({ o: G.lines(edge, sb, COL.chalk, 1.4, 0.75), group: always, kind: 'edge' });
    sc.objs.push({ o: G.lines(tick, sb, COL.chalk, 1.2, 0.6), group: always, kind: 'edge' });

    const label = (html, cls, local, box, group, base = 1) => {
      const el = document.createElement('div');
      el.className = `xl ${cls}`;
      el.innerHTML = html;
      labelsRoot.appendChild(el);
      sc.labels.push({ el, local, box, group, base });
    };

    // chapter titles float above their headings
    for (const ch of sheet.querySelectorAll('.chapter[data-no]')) {
      const h2 = ch.querySelector('h2');
      const r = h2.getBoundingClientRect();
      const box = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
      const no = h2.querySelector('.no')?.textContent ?? '';
      const name = h2.textContent.replace(no, '').trim();
      label(`${no ? `<span>${no}</span>` : ''}${name}`, 'chapter', [-0.17, 0.5, 0.01], box, { center: box[1] }, 1);
      sc.labels[sc.labels.length - 1].chapter = true;
    }

    // figures
    for (const fig of sheet.querySelectorAll('figure[data-fig]')) {
      const spec = FIGURES[fig.dataset.fig];
      if (!spec?.expo) continue;
      const pb = fig.querySelector('.plotbox').getBoundingClientRect();
      const box = [pb.left + scrollX, pb.top + scrollY, pb.right + scrollX, pb.bottom + scrollY];
      const dom = spec.dom;
      const L = ([x, y, h]) => [(x - dom.x[0]) / (dom.x[1] - dom.x[0]), (y - dom.y[0]) / (dom.y[1] - dom.y[0]), h];
      const X = spec.expo(null, ctx);
      const group = { center: (box[1] + box[3]) / 2 };
      const id = fig.dataset.fig;
      const fr = fig.getBoundingClientRect();
      st.figs[id] = { id, box, group, el: fig, spec, dom, figBox: [fr.left + scrollX - 24, fr.top + scrollY - 24, fr.right + scrollX + 24, fr.bottom + scrollY + 24] };
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'xl dive-chip';
      chip.textContent = 'Look inside';
      chip.addEventListener('click', () => dive(id));
      labelsRoot.appendChild(chip);
      sc.labels.push({ el: chip, local: [1, 1, 0.02], box, group, base: 1, chip: true });

      for (const s of X.surfaces ?? []) sc.objs.push({ o: G.mesh(surfaceVerts(s, L), box, COL[s.c], s.alpha ?? 1, s.freq ?? 1), group, kind: 'mesh' });
      for (const c of X.curves ?? []) {
        const pts = c.pts ?? sampleCurve(c);
        sc.objs.push({ o: G.lines(pts.slice(1).map((p, i) => [L(pts[i]), L(p)]), box, COL[c.c], c.w ?? 2, 1, c.dash), group, kind: 'curve' });
      }
      if (X.segs) sc.objs.push({ o: G.lines(X.segs.map(([p, q]) => [L(p), L(q)]), box, COL.chalk, 1, 0.55), group, kind: 'curve' });
      const byColor = {};
      for (const p of X.points ?? []) (byColor[p.c] ??= []).push([...L(p.at), (p.size ?? 8) / 8]);
      for (const c in byColor) sc.objs.push({ o: G.points(byColor[c], box, COL[c], 8, 1, 1), group, kind: 'point' });
      for (const r of X.rects ?? []) {
        const [x0, x1] = r.x;
        const [y0, y1] = r.y;
        const q = [[x0, y0, r.h], [x1, y0, r.h], [x1, y1, r.h], [x0, y1, r.h]].map(L);
        sc.objs.push({ o: G.mesh(quadVerts(q), box, COL[r.c], 0.6, 0), group, kind: 'mesh' });
        sc.objs.push({ o: G.lines(q.map((p, i) => [p, q[(i + 1) % 4]]), box, COL[r.c], 1.4, 0.9), group, kind: 'curve' });
        label(r.name, 'rect', q[3], box, group);
      }
      for (const f of X.flows ?? []) {
        const pts = f.pts.map(L);
        const o = G.points([], box, COL[f.c], 5, 1, 1, f.n);
        sc.flows.push({ o, pts, n: f.n, speed: f.speed, group });
        sc.objs.push({ o, group, kind: 'point' });
      }
      for (const a of X.agents ?? []) sc.agents.push({ name: a.name, local: L(a.at), box, group });
      const n0 = sc.labels.length;
      for (const e of X.eqs ?? []) label(e.html, 'xeq', L(e.at), box, group);
      for (const t of X.tags ?? []) label(t.text, `tag ${t.c}`, L(t.at), box, group, 0.95);
      for (const r of sc.labels.slice(n0)) r.fig = st.figs[id];
    }

    // concept anatomies: their figure is a stack of sheets drawn on the page
    for (const fig of sheet.querySelectorAll('figure[data-dissect]')) {
      const svg = fig.querySelector('svg');
      const pbEl = svg?.querySelector('.plotbox');
      if (!pbEl) continue;
      const pb = pbEl.getBoundingClientRect();
      const sr = svg.getBoundingClientRect();
      const box = [pb.left + scrollX, pb.top + scrollY, pb.right + scrollX, pb.bottom + scrollY];
      const id = `ds-${fig.dataset.dissect}`;
      const fr = fig.getBoundingClientRect();
      const bw = box[2] - box[0];
      const bh = box[3] - box[1];
      st.figs[id] = {
        id, box, group: { center: (box[1] + box[3]) / 2 }, el: fig, spec: {}, dissect: fig.dataset.dissect,
        dom: { x: [0, 1], y: [0, 1] },
        // the whole drawing, in the plot box's own units: a sheet at height 0 covers the printed figure exactly
        range: [(sr.left + scrollX - box[0]) / bw, (box[3] - (sr.bottom + scrollY)) / bh, (sr.right + scrollX - box[0]) / bw, (box[3] - (sr.top + scrollY)) / bh],
        svgRect: [sr.left + scrollX, sr.top + scrollY, sr.right + scrollX, sr.bottom + scrollY],
        figBox: [fr.left + scrollX - 24, fr.top + scrollY - 24, fr.right + scrollX + 24, fr.bottom + scrollY + 24],
      };
    }

    // field courses hang off the parts list
    const parts = sheet.querySelector('[data-anchor="fields"]');
    if (parts) {
      const r = parts.getBoundingClientRect();
      const box = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
      const group = { center: (box[1] + box[3]) / 2 };
      const eqs = [
        'a<sub>1</sub>/a<sub>2</sub> &lt; a<sub>1</sub>*/a<sub>2</sub>*',
        'i = i* + E[Δe]',
        'i = r* + π + ½(π − π*) + ½x',
        'Σ<sub>i</sub> MRS<sub>i</sub> = MRT',
        'm(u, v), &nbsp; θ = v/u',
        '(P − MC)/P = 1/|ε|',
        'y = A f(k, h)',
        'SCC = Σ β<sup>t</sup> ∂D/∂E',
        'p = E[m x]',
        'U = u(c<sub>0</sub>) + β Σ δ<sup>t</sup>u(c<sub>t</sub>)',
        'g<sub>Y</sub> = g<sub>A</sub> + αg<sub>K</sub> + (1 − α)g<sub>L</sub>',
      ];
      const rows = [...parts.querySelectorAll('tbody tr')];
      rows.forEach((tr, i) => {
        const rr = tr.getBoundingClientRect();
        const b = 1 - ((rr.top + rr.bottom) / 2 + scrollY - box[1]) / (box[3] - box[1]);
        // alternate sides so neighbouring rows do not collide
        if (eqs[i]) label(eqs[i], i % 2 ? 'xeq' : 'xeq left', [i % 2 ? 1.03 : -0.03, b, 0.04], box, group);
      });
      const intl = rows[0].getBoundingClientRect();
      sc.agents.push({ name: 'Rest of world', local: [0.2, 1 - ((intl.top + intl.bottom) / 2 + scrollY - box[1]) / (box[3] - box[1]), 0.16], box, group });
    }

    return sc;
  }

  function sampleCurve(c) {
    const [t0, t1] = c.t;
    return Array.from({ length: 121 }, (_, i) => c.param(t0 + ((t1 - t0) * i) / 120));
  }

  // ---- frame ----
  function frame(now) {
    // a rAF timestamp can predate the performance.now() taken when the loop started
    const dt = clamp((now - st.last) / 1000, 0, 0.05);
    st.last = now;
    st.time += dt;
    st.t = clamp(st.t + (Math.sign(st.target - st.t) * dt) / DURATION, 0, 1);
    const e = ease(st.t);

    if (st.t === 0 && st.target === 0) {
      st.running = false;
      if (st.ex) endExhibit();
      document.body.classList.remove('unfolded');
      clearCanvas();
      onChange?.(false);
      return;
    }

    const W = innerWidth;
    const H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    G.resize(canvas, Math.round(W * dpr), Math.round(H * dpr));
    const d = st.dive;
    st.dv = clamp(st.dv + ((d && !d.exiting ? 1 : -1) * dt) / DIVE_TIME, 0, 1);
    const dvE = ease(st.dv);
    if (d) diveTick(d, dt);
    if (d && d.exiting && st.dv === 0) endDive();

    const P = { focus: scrollY + H / 2, docW: W, t: e };

    // camera: an orthographic-looking view of the flat sheet → a raised, tilted one
    // pulled back and to the right: the page on the left, the stage of parts on the right
    const T = { h: 1.1, el: 0.66, tx: 0.52, ty: 0.12, tz: -0.42, fov: 40 };
    const fovO = (lerp(0.5, T.fov, e) * Math.PI) / 180;
    const hO = lerp(H * 0.5 * PX, T.h, e);
    const elO = lerp(0, T.el, e) + st.mouse[1] * 0.05 * e;
    const azO = st.mouse[0] * 0.12 * e;
    const targetO = [lerp(0, T.tx, e), lerp(0, T.ty, e), lerp(0, T.tz, e)];
    const eyeO = orbit(targetO, azO, elO, hO / Math.tan(fovO / 2));
    let eye = eyeO;
    let target = targetO;
    let fov = fovO;
    let view = { x: 0, y: 0, w: W, h: H };
    const X = st.ex;
    if (X) {
      // the exhibit camera orbits the stage at the origin, in the space right of the panel
      const n = X.info.steps.length;
      const uT = n > 1 ? 0.1 + (0.88 * X.step) / (n - 1) : 0.95;
      X.u = approach(X.u, uT, dt, 1.6);
      const wide = W >= 980;
      view = wide ? { x: 430, y: 0, w: W - 430, h: H } : { x: 0, y: 0, w: W, h: H * 0.6 };
      const cam = X.info.cam ?? {};
      const az = (cam.az ?? -0.42) + 0.1 * X.step + X.drag[0] + Math.sin(st.time * 0.13) * 0.04;
      const el = clamp((cam.el ?? 0.5) + X.drag[1], 0.08, 1.35);
      const tgt = cam.target ?? [0.12, 0.26, 0.16];
      fov = 34 * D2R;
      const dist = lerp(9, cam.dist ?? 2.15, e);
      target = tgt;
      eye = orbit(tgt, az, el, dist);
    }
    if (st.dive && dvE > 0.0005) {
      // the dive camera frames the figure in the space right of the panel
      const f = { ...st.dive.f, box: st.dive.travel?.box ?? st.dive.f.box };
      const pose = st.dive.pose;
      const wide = W >= 980;
      const viewD = wide ? { x: 460, y: 0, w: W - 460, h: H } : { x: 0, y: 0, w: W, h: H * 0.58 };
      const wW = (f.box[2] - f.box[0]) * PX;
      const wH = (f.box[3] - f.box[1]) * PX;
      const fovD = 34 * D2R;
      const R = Math.max(wH * 0.62, (wW * 0.62) / (viewD.w / viewD.h)) * pose.zoom;
      const targetD = toWorld([0.5 + pose.pa, 0.5 + pose.pb, pose.lift], f.box, P);
      const eyeD = orbit(targetD, pose.az, pose.el, R / Math.tan(fovD / 2));
      eye = eyeO.map((v, i) => lerp(v, eyeD[i], dvE));
      target = targetO.map((v, i) => lerp(v, targetD[i], dvE));
      fov = lerp(fovO, fovD, dvE);
      view = { x: lerp(0, viewD.x, dvE), y: 0, w: lerp(W, viewD.w, dvE), h: lerp(H, viewD.h, dvE) };
    }
    const dist = Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]);
    const vp = multiply(rect(view, W, H), multiply(perspective(fov, view.w / view.h, Math.max(0.005, dist - 6), dist + 40), lookAt(eye, target, [0, 1, 0])));

    const sc = st.scene;
    const appear = smooth(0.6, 1, e);
    const near = (g) => (g.center == null ? 1 : 1 - smooth(2600, 5200, Math.abs(g.center - P.focus)));
    const grow = (g) => (g.center == null ? 1 : smooth(g.center - 1150, g.center - 250, P.focus));

    // particles along their paths
    for (const f of sc.flows) {
      const pts = [];
      for (let i = 0; i < f.n; i++) pts.push([...alongPath(f.pts, (st.time * f.speed + i / f.n) % 1), 1]);
      f.o.set(pts);
    }
    for (const it of sc.objs) {
      let o = 1;
      if (it.kind === 'grid' || it.kind === 'edge') o = smooth(0.15, 0.9, e);
      else if (it.kind === 'decor') o = appear * near(it.group);
      else if (it.kind === 'chain') o = appear;
      else {
        const r = grow(it.group);
        o = appear * near(it.group) * Math.min(1, r * 1.6);
        it.o.hs = ease(r);
      }
      if (st.dive) {
        if (it.group === st.dive.f.group) o *= st.dive.script.generic ? 1 : 1 - dvE;
        else o *= 1 - (it.kind === 'grid' || it.kind === 'edge' ? 0.5 : 0.9) * dvE;
      }
      it.o.opacity = o * it.o.baseOpacity;
    }

    // instruments replace the drawn construct of their figure, except inside its dive
    if (st.bench) {
      for (const f of Object.values(st.figs)) {
        if (!st.bench.owns(f)) continue;
        for (const it of sc.objs) if (it.group === f.group) it.o.opacity *= st.dive && st.dive.f === f ? 1 : 0;
      }
    }
    const diveOver = st.dive ? diveObjects(st.dive, P, dvE, dt) : [];
    const diveCast = st.dive?.script.dissect ? st.dive.agents : null;
    const bench = st.bench ? st.bench.update(P, { dt, appear, dv: dvE, exhibit: X ? { id: X.id, u: X.u } : null, cast: diveCast }) : { solids: [], glass: [], over: [], plates: [], cards: [] };
    // the light stands straight above the page at the reading line
    const tau = (1 - e) * Math.PI * 0.5;
    const Nl = [0, Math.cos(tau), Math.sin(tau)];
    const Al = [0, -Math.sin(tau), Math.cos(tau)];
    const lightVP = multiply(ortho(-1.9, 1.9, -1.3, 1.8, 0.4, 5), lookAt([Nl[0] * 3, Nl[1] * 3, Nl[2] * 3], [0, 0, 0], Al));
    const shadowK = appear * 0.92;
    const sbx = st.sheetBox;

    const bgIn = BP_IN.map((v, i) => lerp(DESK[i], v, e));
    const bgOut = BP_OUT.map((v, i) => lerp(DESK[i], v, e));
    const atlas = st.atlas ? st.atlas.update(P, { appear, dv: dvE, time: st.time }) : { slabs: [], shadows: [], over: [] };
    const under = [];
    const overScene = [];
    for (const it of sc.objs) (it.kind === 'grid' || it.kind === 'edge' || it.kind === 'decor' ? under : overScene).push(it.o);
    G.render({
      ctx: gctx,
      cam: { vp, eye, W: W * dpr, H: H * dpr, focus: P.focus, docW: W, t: e, time: st.time },
      bg: { inner: bgIn, outer: bgOut, center: [W * dpr * 0.5, H * dpr * 0.42], radius: Math.max(W, H) * dpr * 0.85 },
      fog: BP_OUT,
      spot: st.dive ? { k: dvE, rect: st.dive.travel ? [st.dive.travel.box[0] - 30, st.dive.travel.box[1] - 30, st.dive.travel.box[2] + 30, st.dive.travel.box[3] + 30] : st.dive.f.figBox } : undefined,
      tiles: X ? [] : st.tiles.map((T) => T.obj),
      plates: e > 0.5 && !X ? bench.plates : [],
      shadows: st.dive?.recess ? [...atlas.shadows, st.dive.recess] : atlas.shadows,
      sheets: st.dive?.sheets ?? [],
      slabs: atlas.slabs,
      cards: dvE > 0.5 ? [] : bench.cards ?? [],
      solids: dvE > 0.5 && !diveCast ? [] : bench.solids,
      glass: dvE > 0.5 && !diveCast ? [] : bench.glass,
      bench: { lightVP, lightDir: [-Nl[0], -Nl[1], -Nl[2]], shadow: shadowK, catchRect: [sbx[0] - 1000, P.focus - 1300, sbx[2] + 1000, P.focus + 1700], catchStrength: shadowK * 0.55 },
      over: X ? bench.over : [...overScene, ...atlas.over, ...bench.over, ...diveOver],
      under: X ? [] : under,
      bloom: ATLAS ? e : 0,
    });

    // labels
    for (const L of sc.labels) {
      if (X) {
        L.el.style.opacity = '0';
        L.el.style.pointerEvents = 'none';
        continue;
      }
      const r = L.chapter || L.chip ? 1 : grow(L.group);
      const pr = project(vp, toWorld(L.local, L.box, P, ease(r)), W, H);
      let o = appear * near(L.group) * L.base * (L.chip ? smooth(0.3, 0.9, grow(L.group)) : smooth(0.55, 1, r));
      if (st.dive) {
        const own = L.group === st.dive.f.group;
        o *= L.chip || (own && !st.dive.script.generic) ? 1 - dvE : own ? 1 : 1 - 0.92 * dvE;
      }
      // a figure with an instrument shows the instrument's names, not the construct's
      if (!L.chip && L.fig && st.bench?.owns(L.fig) && !(st.dive && st.dive.f === L.fig)) o = 0;
      L.el.style.pointerEvents = L.chip && o > 0.5 ? 'auto' : 'none';
      if (!pr || o < 0.02 || pr[0] < -300 || pr[0] > W + 300 || pr[1] < -100 || pr[1] > H + 100) {
        L.el.style.opacity = '0';
        continue;
      }
      const sz = clamp(2.3 / pr[2], 0.42, 1.25);
      L.el.style.opacity = String(o);
      const shift = L.agent ? '-50%, -140%' : L.chapter || L.chip ? '-100%, -50%' : L.el.classList.contains('left') ? '-100%, -50%' : '0, -100%';
      L.el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${sz.toFixed(3)}) translate(${shift})`;
    }
    if (st.dive) placeDiveLabels(st.dive, vp, P, W, H, dvE);
    st.atlas?.labels(vp, P, W, H, { appear, dv: dvE });
    st.bench?.labels(project, vp, W, H, { appear, dv: dvE });

    requestAnimationFrame(frame);
  }

  function clearCanvas() {
    const enc = device.createCommandEncoder();
    enc.beginRenderPass({ colorAttachments: [{ view: gctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] }).end();
    device.queue.submit([enc.finish()]);
  }

  addEventListener('mousemove', (ev) => {
    st.mouse = [(ev.clientX / innerWidth) * 2 - 1, (ev.clientY / innerHeight) * 2 - 1];
  });
  addEventListener('resize', () => {
    if (st.dive) endDive();
    if (st.ex) endExhibit();
    st.captured = false;
    st.prepared = false;
    if (st.target === 1 || st.t > 0) {
      st.target = 0;
      st.t = 0;
    }
  });


  // ---- dives: guided walks into one figure ----
  const fmtParam = (v) => Number(v).toFixed(2);

  function resolvePose(cam, f) {
    const base = typeof cam === 'string' ? POSE[cam] : { ...POSE.three, ...cam };
    let az = base.az;
    const line = cam.along ?? cam.face;
    if (line) {
      // along: look down the line; face: look straight at a wall standing on it
      const [x0, y0, x1, y1] = line;
      const dx = ((x1 - x0) / (f.dom.x[1] - f.dom.x[0])) * (f.box[2] - f.box[0]);
      const dz = -((y1 - y0) / (f.dom.y[1] - f.dom.y[0])) * (f.box[3] - f.box[1]);
      az = Math.atan2(dx, dz) / D2R + (cam.face ? 90 : 0);
      while (az > 180) az -= 360;
      while (az < -180) az += 360;
      if (Math.cos(az * D2R) < 0) az += az > 0 ? -180 : 180;
    }
    return { az: az * D2R, el: base.el * D2R, zoom: base.zoom ?? 1.2, lift: base.lift ?? 0, pa: base.pa ?? 0, pb: base.pb ?? 0 };
  }

  function genericScript(f) {
    const cap = f.el.querySelector('figcaption');
    const no = cap.querySelector('.fig-no')?.textContent ?? '';
    const X = f.spec.expo(null, ctx);
    const tags = (X.tags ?? []).map((t) => t.text[0].toUpperCase() + t.text.slice(1));
    return {
      generic: true, figure: no, params: {}, meshes: () => ({}), frame: () => ({}),
      eq: (X.eqs ?? []).map((q) => q.html).join(' &nbsp;&nbsp; '),
      steps: [
        { title: 'What the textbook shows', cam: 'top', show: [], text: cap.textContent.replace(no, '').trim() },
        { title: 'What the page leaves out', cam: 'three', show: [], text: tags.length ? `${tags.join('. ')}.` : 'Unfolded, the diagram gains the dimension it was drawn without.' },
        { title: 'Edge-on', cam: 'front', show: [], text: 'Seen from the front, the page shrinks to a line and the added dimension becomes the vertical axis.' },
      ],
    };
  }

  function dive(id) {
    const f = st.figs[id];
    if (!f || !st.scene) return;
    if (st.dive) endDive();
    const script = f.dissect ? foldScript(f.dissect) : DIVES[id] ?? genericScript(f);
    const params = {};
    for (const k in script.params ?? {}) params[k] = script.params[k].value;
    const center = (f.box[1] + f.box[3]) / 2;
    const maxY = document.documentElement.scrollHeight - innerHeight;
    st.dive = {
      id, f, script, params, step: 0, stepT: 0, mem: {}, alpha: {}, hover: null, phase: null, touched: -1e9, exiting: false,
      meshes: new Map(), objs: new Map(), labels: new Map(), labelData: new Map(),
      scroll: { from: scrollY, to: clamp(center - innerHeight / 2, 0, maxY), t: 0 },
    };
    st.dive.pose = resolvePose(script.steps[0].cam, f);
    document.documentElement.classList.add('lock');
    document.body.classList.add('diving');
    renderPanel();
    panel.root.hidden = false;
    panel.next.focus({ preventScroll: true });
    onChange?.(true);
  }

  function exitDive() {
    const d = st.dive;
    if (!d || d.exiting) return;
    d.exiting = true;
    panel.root.hidden = true;
    onChange?.(true);
  }

  function endDive() {
    const d = st.dive;
    if (!d) return;
    for (const r of d.meshes.values()) r.obj.destroy();
    for (const o of d.objs.values()) o.destroy();
    d.recess = null;
    for (const el of d.labels.values()) el.remove();
    st.dive = null;
    panel.root.hidden = true;
    document.documentElement.classList.remove('lock');
    document.body.classList.remove('diving');
    if (st.foldAfterDive) {
      st.foldAfterDive = false;
      st.target = 0;
    }
  }

  function go(n) {
    const d = st.dive;
    if (!d || d.exiting || n < 0) return;
    if (n >= d.script.steps.length) {
      exitDive();
      return;
    }
    d.step = n;
    d.stepT = 0;
    d.hover = null;
    d.phase = null;
    renderPanel();
  }

  function renderPanel() {
    const d = st.dive;
    const s = d.script;
    const step = s.steps[d.step];
    panel.fig.textContent = s.figure ?? '';
    panel.count.textContent = `${d.step + 1} of ${s.steps.length}`;
    panel.title.textContent = step.title;
    panel.text.innerHTML = step.text;
    panel.eq.innerHTML = s.eq ?? '';
    panel.eq.hidden = !s.eq;
    for (const span of panel.eq.querySelectorAll('.term')) {
      span.classList.toggle('on', span.dataset.term === step.focus);
      span.classList.toggle('live', step.show.includes(span.dataset.term));
      span.addEventListener('mouseenter', () => { if (st.dive) st.dive.hover = span.dataset.term; });
      span.addEventListener('mouseleave', () => { if (st.dive) st.dive.hover = null; });
    }
    if (step.slider) {
      const ps = s.params[step.slider];
      panel.slider.hidden = false;
      panel.sliderLabel.innerHTML = `${ps.label} <i>${ps.sym}</i>`;
      Object.assign(panel.range, { min: ps.min, max: ps.max, step: ps.step });
      panel.range.value = d.params[step.slider];
      panel.out.value = fmtParam(d.params[step.slider]);
      panel.range.oninput = () => {
        d.params[step.slider] = Number(panel.range.value);
        panel.out.value = fmtParam(panel.range.value);
        d.touched = performance.now();
        d.phase = null;
      };
    } else {
      panel.slider.hidden = true;
    }
    panel.dots.replaceChildren(...s.steps.map((x, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === d.step ? 'on' : '';
      b.setAttribute('aria-label', `Step ${i + 1}: ${x.title}`);
      b.addEventListener('click', () => go(i));
      return b;
    }));
    panel.prev.disabled = d.step === 0;
    panel.next.textContent = d.step === s.steps.length - 1 ? 'Back to the page' : 'Next';
    const hint = panel.root.querySelector('.dive-hint');
    if (hint) hint.textContent = 'Scroll or use the arrow keys to step. Hover a term in the equation to light up its shape.';
  }

  function diveTick(d, dt) {
    d.stepT += dt;
    const stp = d.script.steps[d.step];
    if (stp.travel) {
      const n = stp.travel.length;
      const i = Math.min(n - 1, Math.floor(d.stepT / 3.4));
      if (!d.travel || d.travel.i !== i || d.travel.step !== d.step) {
        const el = sheet.querySelector(stp.travel[i].sel);
        const r = el?.getBoundingClientRect();
        d.travel = r ? { i, step: d.step, label: stp.travel[i].label, box: [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY] } : null;
      }
    } else d.travel = null;
    // the page scrolls under the camera to wherever it is looking
    const cb = d.travel?.box ?? d.f.box;
    const want = clamp((cb[1] + cb[3]) / 2 - innerHeight / 2, 0, document.documentElement.scrollHeight - innerHeight);
    if (Math.abs(want - d.scroll.to) > 2) d.scroll = { from: scrollY, to: want, t: 0 };
    if (d.scroll.t < 1) {
      d.scroll.t = Math.min(1, d.scroll.t + dt / 0.85);
      scrollTo(0, lerp(d.scroll.from, d.scroll.to, ease(d.scroll.t)));
    }
    const step = d.script.steps[d.step];
    const tgt = resolvePose(step.cam, d.f);
    for (const k in tgt) d.pose[k] = approach(d.pose[k], tgt[k], dt, 2.4);
    if (step.slider && step.sweep && performance.now() - d.touched > 1600) {
      const ps = d.script.params[step.slider];
      const span = ps.max - ps.min;
      if (d.phase == null) d.phase = (Math.acos(clamp(1 - (2 * (d.params[step.slider] - ps.min)) / span, -1, 1)) * 9) / (2 * Math.PI);
      d.phase += dt;
      d.params[step.slider] = ps.min + span * (0.5 - 0.5 * Math.cos((2 * Math.PI * d.phase) / 9));
      panel.range.value = d.params[step.slider];
      panel.out.value = fmtParam(d.params[step.slider]);
    }
  }

  // the source element of a sheet lives inside the canvas and is copied when it changes
  function sheetSource() {
    const host = document.createElement('div');
    host.className = 'sheet-src';
    host.style.cssText = 'width:640px;';
    canvas.appendChild(host);
    return { host, w: 640, h: 420, tex: G.texture(1024, 672) };
  }

  function diveObjects(d, P, dvE, dt) {
    d.labelData = new Map();
    d.sheets = [];
    d.agents = [];
    if (d.script.generic) return [];
    const step = d.script.steps[d.step];
    const show = new Set(step.show);
    const focus = d.hover ?? step.focus;
    const box = d.f.box;
    const out = [];
    const vis = (key) => {
      d.alpha[key] = approach(d.alpha[key] ?? 0, show.has(key) || show.has('*') ? 1 : 0, dt, 4.5);
      return d.alpha[key] * dvE * (focus && focus !== key ? 0.55 : 1);
    };
    const ms = d.script.meshes(d.params);
    for (const key in ms) {
      const m = ms[key];
      let rec = d.meshes.get(key);
      if (!rec || rec.dep !== m.dep) {
        const verts = m.build();
        if (rec && rec.obj.capacity >= verts.length) rec.obj.setVerts(verts);
        else {
          rec?.obj.destroy();
          rec = { obj: G.mesh(verts, box, COL[m.c], m.alpha, m.freq, verts.length) };
        }
        rec.dep = m.dep;
        d.meshes.set(key, rec);
      }
      const o = vis(key);
      rec.obj.opacity = Math.min(1, o * (focus === key ? 1.3 : 1));
      if (o > 0.004) out.push(rec.obj);
    }
    const layers = d.script.frame(d.params, { step: d.step, t: d.stepT, mem: d.mem, travel: d.travel }, ctx);
    const used = new Set();
    for (const key in layers) {
      const o = vis(key);
      const arr = Array.isArray(layers[key]) ? layers[key] : [layers[key]];
      arr.forEach((L, i) => {
        const id = `${key}:${i}`;
        if (L.type === 'label') {
          d.labelData.set(id, { ...L, o });
          return;
        }
        if (L.type === 'agent') {
          // an agent standing on its part of the figure (drawn by the bench, which owns the maquettes)
          const box = L.box ?? d.f.box;
          d.agents.push({ name: L.name, x: lerp(box[0], box[2], L.at[0]), s: lerp(box[3], box[1], L.at[1]), h: L.at[2] * (box[2] - box[0]) * PX, scale: L.scale, ry: L.ry ?? 0, o: dvE });
          return;
        }
        if (L.type === 'sheet') {
          // a component of the figure, lifted off the page where it was printed
          let obj = d.objs.get(id);
          if (!obj) {
            const src = sheetSource();
            obj = G.sheet(src.tex);
            obj.kind = 'sheet';
            obj.src = src;
            obj.host = src.host;
            obj.box = d.f.box;
            obj.range = d.f.range;
            d.objs.set(id, obj);
          }
          if (obj.key !== L.key) {
            obj.key = L.key;
            obj.src.host.replaceChildren();
            L.draw(obj.src.host);
            dirty.add(obj.src);
            canvas.requestPaint();
            obj.ready = obj.ready ?? false;
          }
          obj.h = L.h ?? 0;
          obj.opacity = (L.op ?? 1) * dvE;
          obj.acetate = L.acetate ?? 0;
          obj.wall = L.wall ?? null;
          if (L.tint) obj.tint = L.tint;
          used.add(id);
          d.sheets.push(obj);
          return;
        }
        used.add(id);
        const n = L.type === 'lines' ? L.segs.length : L.type === 'points' ? L.pts.length : L.verts.length;
        let obj = d.objs.get(id);
        if (obj && (obj.kind !== L.type || n > obj.capacity)) {
          obj.destroy();
          obj = null;
        }
        if (!obj) {
          if (L.type === 'lines') obj = G.lines([], box, COL[L.c], L.w, 1, L.dash, 1, Math.max(64, n * 2));
          else if (L.type === 'points') obj = G.points([], box, COL[L.c], L.size ?? 10, 1, 1, Math.max(16, n * 2));
          else obj = G.mesh(L.verts, box, COL[L.c], L.alpha ?? 1, L.freq ?? 0, Math.max(n, 300));
          obj.kind = L.type;
          d.objs.set(id, obj);
        }
        if (L.type === 'lines') {
          obj.set(L.segs);
          obj.width = L.w * (focus === key ? 1.45 : 1);
          obj.dash = !!L.dash;
        } else if (L.type === 'points') {
          obj.set(L.pts);
          obj.size = L.size ?? 10;
        } else {
          obj.setVerts(L.verts);
          obj.alpha = L.alpha ?? 1;
        }
        obj.color = COL[L.c];
        obj.opacity = o;
        obj.hs = 1;
        if (o > 0.004) out.push(obj);
      });
    }
    for (const [id, obj] of d.objs) if (!used.has(id)) obj.opacity = 0;
    // the printed figure is peeled off the page while its sheets stand above it
    if (d.f.svgRect) {
      d.recess ??= G.shadow(d.f.svgRect);
      const lifted = Math.max(0, ...d.sheets.map((q) => (q.wall ? 0.06 : q.h)));
      d.recessK = approach(d.recessK ?? 0, clamp(lifted / 0.03, 0, 1) * dvE, dt, 6);
      d.recess.amount = d.recessK;
      d.recess.radius = 6;
      d.recess.offset = 3;
    }
    d.sheets.sort((a, b) => a.h - b.h);
    return out;
  }

  function placeDiveLabels(d, vp, P, W, H) {
    for (const [id, L] of d.labelData) {
      let el = d.labels.get(id);
      if (!el) {
        el = document.createElement('div');
        labelsRoot.appendChild(el);
        d.labels.set(id, el);
      }
      const cls = `xl dl ${L.cls}`;
      if (el.className !== cls) el.className = cls;
      if (el.dataset.html !== L.html) {
        el.innerHTML = L.html;
        el.dataset.html = L.html;
      }
      const pr = project(vp, toWorld(L.at, L.box ?? d.f.box, P), W, H);
      if (!pr || L.o < 0.02) {
        el.style.opacity = '0';
        continue;
      }
      el.style.opacity = String(L.o);
      const shift = L.cls.includes('left') ? '-100%, -50%' : '0, -100%';
      el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) translate(${shift})`;
    }
    for (const [id, el] of d.labels) if (!d.labelData.has(id)) el.style.opacity = '0';
  }

  panel.prev.addEventListener('click', () => (st.ex ? exhibitGo(st.ex.step - 1) : st.dive && go(st.dive.step - 1)));
  panel.next.addEventListener('click', () => (st.ex ? exhibitGo(st.ex.step + 1) : st.dive && go(st.dive.step + 1)));
  panel.exit.addEventListener('click', () => (st.ex ? exitExhibit() : exitDive()));
  let wheelAt = 0;
  addEventListener('wheel', (ev) => {
    if (st.ex && !st.ex.exiting) {
      ev.preventDefault();
      if (Math.abs(ev.deltaY) < 6 || performance.now() - wheelAt < 750) return;
      wheelAt = performance.now();
      exhibitGo(st.ex.step + (ev.deltaY > 0 ? 1 : -1));
      return;
    }
    const d = st.dive;
    if (!d || d.exiting) return;
    ev.preventDefault();
    if (Math.abs(ev.deltaY) < 6 || performance.now() - wheelAt < 750) return;
    wheelAt = performance.now();
    go(d.step + (ev.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  addEventListener('keydown', (ev) => {
    if (st.ex && !st.ex.exiting) {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(ev.key)) { ev.preventDefault(); exhibitGo(st.ex.step + 1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) { ev.preventDefault(); exhibitGo(st.ex.step - 1); }
      else if (ev.key === 'Escape') { ev.preventDefault(); exitExhibit(); }
      return;
    }
    const d = st.dive;
    if (!d || d.exiting || ev.target.closest?.('input')) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(ev.key)) {
      ev.preventDefault();
      go(d.step + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(ev.key)) {
      ev.preventDefault();
      go(d.step - 1);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      exitDive();
    }
  });

  // ---- exhibits: one assembly explained step by step in open space, no page ----
  async function prepare() {
    if (st.prepared) return;
    if (!st.sheetBox) {
      const r = sheet.getBoundingClientRect();
      st.sheetBox = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.top + scrollY + sheet.offsetHeight];
    }
    st.scene = buildScene();
    assets ??= await loadAssets();
    st.bench?.destroy();
    for (const el of plateHosts.splice(0)) el.remove();
    st.bench = createBench({ G, sheet, labelsRoot, toWorld, PX, figs: st.figs, ctx, sheetBox: st.sheetBox, assets, figureAgents: st.scene.agents, record: record?.attach(plates) ?? null, plates });
    st.prepared = true;
  }

  async function exhibit(id) {
    if (st.busy) return;
    st.busy = true;
    try {
      await prepare();
      const info = st.bench.exhibitInfo(id);
      if (!info) return;
      if (st.dive) endDive();
      st.ex = { id, info, step: 0, u: 0, drag: [0, 0], exiting: false, v: 0 };
      st.target = 1;
      document.body.classList.add('unfolded', 'exhibiting');
      document.documentElement.classList.add('lock');
      renderExhibit();
      panel.root.hidden = false;
      panel.next.focus({ preventScroll: true });
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

  function exhibitGo(n) {
    const x = st.ex;
    if (!x || x.exiting || n < 0) return;
    if (n >= x.info.steps.length) {
      exitExhibit();
      return;
    }
    x.step = n;
    renderExhibit();
  }

  function exitExhibit() {
    const x = st.ex;
    if (!x || x.exiting) return;
    x.exiting = true;
    panel.root.hidden = true;
    st.target = 0;
  }

  function endExhibit() {
    st.ex = null;
    document.body.classList.remove('exhibiting');
    document.documentElement.classList.remove('lock');
  }

  function renderExhibit() {
    const x = st.ex;
    const steps = x.info.steps;
    panel.fig.textContent = x.info.label;
    panel.count.textContent = `${x.step + 1} of ${steps.length}`;
    panel.title.textContent = x.info.title;
    panel.text.innerHTML = steps[x.step];
    panel.eq.hidden = !x.info.parts.length;
    panel.eq.innerHTML = `<span class="parts-k">Parts</span>${x.info.parts.map((p) => `<span class="part-chip"><b>${p.no}</b> ${p.title} <i>${p.src}</i></span>`).join('')}`;
    panel.slider.hidden = true;
    panel.dots.replaceChildren(...steps.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === x.step ? 'on' : '';
      b.setAttribute('aria-label', `Step ${i + 1}`);
      b.addEventListener('click', () => exhibitGo(i));
      return b;
    }));
    panel.prev.disabled = x.step === 0;
    panel.next.textContent = x.step === steps.length - 1 ? (x.info.exitLabel ?? 'Back to the page') : 'Next';
    const hint = panel.root.querySelector('.dive-hint');
    if (hint) hint.textContent = 'Scroll or use the arrow keys to step. Drag to turn the space.';
  }

  // drag to turn the exhibit
  let dragFrom = null;
  addEventListener('pointerdown', (ev) => {
    if (!st.ex || ev.target.closest('#dive, a, button, input')) return;
    dragFrom = [ev.clientX, ev.clientY, st.ex.drag[0], st.ex.drag[1]];
  });
  addEventListener('pointermove', (ev) => {
    if (!dragFrom || !st.ex) return;
    st.ex.drag = [dragFrom[2] + (ev.clientX - dragFrom[0]) * 0.006, clamp(dragFrom[3] + (ev.clientY - dragFrom[1]) * 0.004, -0.35, 0.6)];
  });
  addEventListener('pointerup', () => { dragFrom = null; });

  async function lookInside(id) {
    const fromFlat = st.target !== 1;
    if (fromFlat) await unfold();
    dive(id);
    // came from the flat page: return to it when the dive ends
    if (fromFlat) st.foldAfterDive = true;
  }

  async function unfold() {
    if (st.busy || st.target === 1) return;
    st.busy = true;
    try {
      if (!st.captured) {
        await capture();
        st.prepared = false;
      }
      await prepare();
      // the atlas (towers, lifted cards, junction threads) is off by default; ?atlas brings it back
      if (ATLAS && !st.atlas) st.atlas = createAtlas({ G, sheet, labelsRoot, tiles: st.tiles, toWorld, sheetBox: st.sheetBox, px: PX });
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
    if (st.dive) {
      st.foldAfterDive = true;
      exitDive();
      return;
    }
    st.target = 0;
  }

  return {
    supported: true,
    unfold,
    fold,
    lookInside,
    exhibit,
    get exhibiting() { return Boolean(st.ex); },
    has: (id) => Boolean(FIGURES[id]?.expo) || id.startsWith('ds-'),
    get open() { return st.target === 1; },
    get diving() { return Boolean(st.dive); },
  };
}

// ---------- GPU plumbing ----------
// Scene → (colour, emissive) MSAA targets → resolve → bloom (half and quarter
// resolution Gaussian) → composite onto the canvas.

export function makeGpu(device, format) {
  const S = GPUShaderStage;
  const B = GPUBufferUsage;
  const T = GPUTextureUsage;
  const SCENE = 'rgba8unorm';
  const GLOW = 'rgba16float';
  const PREMULT = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  };
  const layout = (entries) => device.createBindGroupLayout({ entries });
  const uni = (binding) => ({ binding, visibility: S.VERTEX | S.FRAGMENT, buffer: { type: 'uniform' } });
  const camLayout = layout([uni(0)]);
  const objLayout = layout([uni(0), { binding: 1, visibility: S.VERTEX, buffer: { type: 'read-only-storage' } }]);
  const texLayout = layout([uni(0), { binding: 1, visibility: S.FRAGMENT, texture: {} }, { binding: 2, visibility: S.FRAGMENT, sampler: {} }]);

  const mod = (label, code) => {
    const m = device.createShaderModule({ label, code });
    m.getCompilationInfo().then((info) => info.messages.forEach((x) => x.type === 'error' && console.error(`[wgsl:${label}] ${x.lineNum}:${x.linePos} ${x.message}`)));
    return m;
  };
  // Depth: the page and its overlays never write it; solids do, and glass and
  // the drawn constructs test against them.
  const DEPTHF = 'depth24plus';
  const scenePipe = (label, code, layouts, buffers = [], depth = { depthWriteEnabled: false, depthCompare: 'always' }) => {
    const m = mod(label, code);
    return device.createRenderPipeline({
      label,
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module: m, entryPoint: 'vs', buffers },
      fragment: { module: m, entryPoint: 'fs', targets: [{ format: SCENE, blend: PREMULT }, { format: GLOW, blend: PREMULT }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: DEPTHF, ...depth },
      multisample: { count: SAMPLES },
    });
  };
  const instLayout = layout([{ binding: 0, visibility: S.VERTEX | S.FRAGMENT, buffer: { type: 'read-only-storage' } }]);
  const shadowLayout = layout([
    { binding: 0, visibility: S.FRAGMENT, texture: { sampleType: 'depth' } },
    { binding: 1, visibility: S.FRAGMENT, sampler: { type: 'comparison' } },
  ]);
  const SOLID_BUF = [{ arrayStride: 24, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x3' }] }];
  const TESTED = { depthWriteEnabled: false, depthCompare: 'less' };
  const P = {
    bg: scenePipe('bg', BG, [camLayout]),
    tile: scenePipe('tile', TILE, [camLayout, texLayout]),
    slab: scenePipe('slab', SLAB, [camLayout, texLayout]),
    shadow: scenePipe('shadow', SHADOW, [camLayout, camLayout]),
    mesh: scenePipe('mesh', MESH, [camLayout, camLayout], [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' }] }], TESTED),
    line: scenePipe('line', LINE, [camLayout, objLayout], [], TESTED),
    point: scenePipe('point', POINT, [camLayout, objLayout], [], TESTED),
    solid: scenePipe('solid', SOLID, [camLayout, instLayout, shadowLayout], SOLID_BUF, { depthWriteEnabled: true, depthCompare: 'less' }),
    glass: scenePipe('glass', GLASS, [camLayout, instLayout], SOLID_BUF, TESTED),
    catcher: scenePipe('catcher', CATCHER, [camLayout, camLayout, shadowLayout]),
    card: scenePipe('card', CARD, [camLayout, texLayout], [], { depthWriteEnabled: true, depthCompare: 'less' }),
    sheet: scenePipe('sheet', SHEET, [camLayout, texLayout]),
  };
  const depthMod = mod('depth', DEPTH);
  const depthPipe = device.createRenderPipeline({
    label: 'shadow-depth',
    layout: device.createPipelineLayout({ bindGroupLayouts: [camLayout, instLayout] }),
    vertex: { module: depthMod, entryPoint: 'vs', buffers: SOLID_BUF },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less', depthBias: 2, depthBiasSlopeScale: 1.5 },
  });
  const SHADOW_N = 2048;
  const shadowTex = device.createTexture({ size: [SHADOW_N, SHADOW_N], format: 'depth32float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
  const shadowView = shadowTex.createView();
  const cmpSampler = device.createSampler({ compare: 'less', magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const shadowBind = device.createBindGroup({ layout: shadowLayout, entries: [{ binding: 0, resource: shadowView }, { binding: 1, resource: cmpSampler }] });
  const postPipe = (label, code, fmt) => {
    const m = mod(label, code);
    return device.createRenderPipeline({
      label, layout: 'auto',
      vertex: { module: m, entryPoint: 'vs' },
      fragment: { module: m, entryPoint: 'fs', targets: [{ format: fmt }] },
      primitive: { topology: 'triangle-list' },
    });
  };
  const mipPipe = postPipe('mip', MIP, 'rgba8unorm');
  const copyPipe = postPipe('copy', COPY, GLOW);
  const blurPipe = postPipe('blur', BLUR, GLOW);
  const compPipe = postPipe('composite', COMPOSITE, format);
  const linear = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const aniso = device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 16, addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

  let owned = [];
  const drop = (...bufs) => {
    for (const b of bufs) b.destroy();
    owned = owned.filter((b) => !bufs.includes(b));
  };
  const buf = (size, usage) => {
    const b = device.createBuffer({ size, usage: usage | B.COPY_DST });
    owned.push(b);
    return b;
  };
  const fixed = (size, usage) => device.createBuffer({ size, usage: usage | B.COPY_DST });
  const camBuf = fixed(208, B.UNIFORM);
  const camBind = device.createBindGroup({ layout: camLayout, entries: [{ binding: 0, resource: { buffer: camBuf } }] });
  const bgBuf = fixed(48, B.UNIFORM);
  const bgBind = device.createBindGroup({ layout: camLayout, entries: [{ binding: 0, resource: { buffer: bgBuf } }] });
  const blurBufs = [0, 1, 2, 3].map(() => fixed(16, B.UNIFORM));
  const compBuf = fixed(16, B.UNIFORM);
  let rt = null;

  const tex = (w, h, fmt, usage, sampleCount = 1) => device.createTexture({ size: [Math.max(1, w), Math.max(1, h)], format: fmt, usage, sampleCount });
  function makeTargets(w, h) {
    if (rt) for (const k of ['sceneMS', 'glowMS', 'depthMS', 'scene', 'glow', 'hA', 'hB', 'qA', 'qB']) rt[k].destroy();
    const R = T.RENDER_ATTACHMENT | T.TEXTURE_BINDING;
    const hw = Math.ceil(w / 2);
    const hh = Math.ceil(h / 2);
    const qw = Math.ceil(w / 4);
    const qh = Math.ceil(h / 4);
    rt = {
      w, h,
      sceneMS: tex(w, h, SCENE, T.RENDER_ATTACHMENT, SAMPLES),
      glowMS: tex(w, h, GLOW, T.RENDER_ATTACHMENT, SAMPLES),
      depthMS: tex(w, h, DEPTHF, T.RENDER_ATTACHMENT, SAMPLES),
      scene: tex(w, h, SCENE, R),
      glow: tex(w, h, GLOW, R),
      hA: tex(hw, hh, GLOW, R), hB: tex(hw, hh, GLOW, R),
      qA: tex(qw, qh, GLOW, R), qB: tex(qw, qh, GLOW, R),
    };
    for (const k of Object.keys(rt)) if (rt[k]?.createView) rt[`${k}V`] = rt[k].createView();
    device.queue.writeBuffer(blurBufs[0], 0, new Float32Array([1 / hw, 0, 0, 0]));
    device.queue.writeBuffer(blurBufs[1], 0, new Float32Array([0, 1 / hh, 0, 0]));
    device.queue.writeBuffer(blurBufs[2], 0, new Float32Array([1 / qw, 0, 0, 0]));
    device.queue.writeBuffer(blurBufs[3], 0, new Float32Array([0, 1 / qh, 0, 0]));
    const b = (pipe, entries) => device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: entries.map((resource, binding) => ({ binding, resource })) });
    rt.binds = {
      glowToH: b(copyPipe, [rt.glowV, linear]),
      hAtoB: b(blurPipe, [rt.hAV, linear, { buffer: blurBufs[0] }]),
      hBtoA: b(blurPipe, [rt.hBV, linear, { buffer: blurBufs[1] }]),
      hToQ: b(copyPipe, [rt.hAV, linear]),
      qAtoB: b(blurPipe, [rt.qAV, linear, { buffer: blurBufs[2] }]),
      qBtoA: b(blurPipe, [rt.qBV, linear, { buffer: blurBufs[3] }]),
      comp: b(compPipe, [rt.sceneV, rt.hAV, rt.qAV, linear, { buffer: compBuf }]),
    };
  }

  class Lines {
    constructor(segs, box, color, width, opacity, dash = false, space = 1, max = 0) {
      this.max = Math.max(1, max || segs.length);
      this.capacity = this.max;
      this.sbuf = buf(this.max * 32, B.STORAGE);
      this.ubuf = buf(64, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: objLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }, { binding: 1, resource: { buffer: this.sbuf } }] });
      Object.assign(this, { box, color, width, baseOpacity: opacity, opacity, dash, space, glow: 0.25 });
      this.set(segs);
    }
    set(segs) {
      const n = Math.min(segs.length, this.max);
      const a = new Float32Array(n * 8);
      for (let i = 0; i < n; i++) {
        const [p, q] = segs[i];
        a.set([p[0], p[1], p[2], p[3] ?? 1, q[0], q[1], q[2], q[3] ?? 1], i * 8);
      }
      this.count = n;
      if (n) device.queue.writeBuffer(this.sbuf, 0, a);
    }
    upload(dpr) {
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.box, ...this.color, this.hs ?? 1, this.opacity, this.width * dpr, this.space, this.dash ? 1 : 0, this.glow, 0, 0, 0]));
    }
    destroy() { drop(this.sbuf, this.ubuf); }
    draw(pass) {
      if (!this.count || this.opacity < 0.004) return;
      pass.setPipeline(P.line);
      pass.setBindGroup(1, this.bind);
      pass.draw(6, this.count);
    }
  }

  class Points {
    constructor(pts, box, color, size, opacity, glow = 0, max = 0) {
      this.max = Math.max(1, max || pts.length);
      this.capacity = this.max;
      this.sbuf = buf(this.max * 16, B.STORAGE);
      this.ubuf = buf(48, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: objLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }, { binding: 1, resource: { buffer: this.sbuf } }] });
      Object.assign(this, { box, color, size, baseOpacity: opacity, opacity, glow, count: 0, space: 1 });
      this.set(pts);
    }
    set(pts) {
      const n = Math.min(pts.length, this.max);
      const a = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) a.set([pts[i][0], pts[i][1], pts[i][2], pts[i][3] ?? 1], i * 4);
      this.count = n;
      if (n) device.queue.writeBuffer(this.sbuf, 0, a);
    }
    upload(dpr) {
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.box, ...this.color, this.hs ?? 1, this.opacity, this.size * dpr, this.space, this.glow]));
    }
    destroy() { drop(this.sbuf, this.ubuf); }
    draw(pass) {
      if (!this.count || this.opacity < 0.004) return;
      pass.setPipeline(P.point);
      pass.setBindGroup(1, this.bind);
      pass.draw(6, this.count);
    }
  }

  class Mesh {
    constructor(verts, box, color, alpha, freq, capacity = 0) {
      this.capacity = Math.max(verts.length, capacity);
      this.count = verts.length / 5;
      this.vbuf = device.createBuffer({ size: Math.max(20, this.capacity * 4), usage: B.VERTEX | B.COPY_DST });
      owned.push(this.vbuf);
      if (this.count) device.queue.writeBuffer(this.vbuf, 0, verts);
      this.ubuf = buf(64, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: camLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }] });
      Object.assign(this, { box, color, alpha, freq, baseOpacity: 1, opacity: 1, space: 1 });
    }
    upload() {
      const c = this.color;
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([
        ...this.box,
        c[0] * 0.55, c[1] * 0.55, c[2] * 0.55, 0.2 * this.alpha,
        c[0], c[1], c[2], 0.75 * this.alpha,
        this.opacity, this.freq, this.space, this.hs ?? 1,
      ]));
    }
    setVerts(verts) {
      this.count = Math.min(verts.length, this.capacity) / 5;
      if (this.count) device.queue.writeBuffer(this.vbuf, 0, verts, 0, this.count * 5);
    }
    destroy() { drop(this.vbuf, this.ubuf); }
    draw(pass) {
      if (!this.count || this.opacity < 0.004) return;
      pass.setPipeline(P.mesh);
      pass.setBindGroup(1, this.bind);
      pass.setVertexBuffer(0, this.vbuf);
      pass.draw(this.count);
    }
  }

  class Tile {
    constructor(texture, rect, segs) {
      this.ubuf = fixed(64, B.UNIFORM);
      this.texture = texture;
      this.view = texture.createView();
      this.bind = device.createBindGroup({ layout: texLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }, { binding: 1, resource: this.view }, { binding: 2, resource: aniso }] });
      Object.assign(this, { rect, segs });
    }
    upload(fog, spot) {
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.rect, 1, this.segs, spot.k, 0, ...fog, 1, ...spot.rect]));
    }
    destroy() { this.ubuf.destroy(); }
    draw(pass) {
      pass.setPipeline(P.tile);
      pass.setBindGroup(1, this.bind);
      pass.draw(this.segs * 6);
    }
  }

  // A card lifted off the page. It is drawn once per tile it overlaps.
  class Slab {
    constructor(card, tiles) {
      this.card = card;
      this.pieces = [];
      for (const t of tiles) {
        const s0 = Math.max(card[1], t.rect[1]);
        const s1 = Math.min(card[3], t.rect[3]);
        if (s1 <= s0) continue;
        const ubuf = buf(144, B.UNIFORM);
        const bind = device.createBindGroup({ layout: texLayout, entries: [{ binding: 0, resource: { buffer: ubuf } }, { binding: 1, resource: t.obj.view }, { binding: 2, resource: aniso }] });
        this.pieces.push({ s0, s1, tile: t.rect, ubuf, bind });
      }
      Object.assign(this, { h: 0, tilt: 0, thick: 0.006, opacity: 1, glow: 0, stack: 0, hinge: 0, hole: [0, 0, 0, 0], edge: [0.8, 0.84, 0.78] });
    }
    upload(fog, spot) {
      for (const p of this.pieces) {
        device.queue.writeBuffer(p.ubuf, 0, new Float32Array([
          ...this.card, p.s0, p.s1, 0, 0, ...p.tile,
          this.h, this.tilt, this.thick, this.opacity,
          spot.k, this.glow, this.stack, this.hinge, ...fog, 1, ...spot.rect, ...this.edge, 1, ...this.hole,
        ]));
      }
    }
    draw(pass) {
      if (this.opacity < 0.004) return;
      pass.setPipeline(P.slab);
      for (const p of this.pieces) {
        pass.setBindGroup(1, p.bind);
        pass.draw(30);
      }
    }
  }

  // The recess and soft shadow under a lifted card.
  class Shadow {
    constructor(card) {
      this.card = card;
      this.ubuf = buf(64, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: camLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }] });
      Object.assign(this, { amount: 0, radius: 20, offset: 10, opacity: 1, recess: [0.64, 0.69, 0.63] });
    }
    upload(spot) {
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.card, this.amount, this.radius, this.offset, this.opacity, ...this.recess, 1, ...spot.rect]));
    }
    draw(pass) {
      if (this.amount * this.opacity < 0.004) return;
      pass.setPipeline(P.shadow);
      pass.setBindGroup(1, this.bind);
      pass.draw(6);
    }
  }

  // A geometry drawn many times: each instance has a model matrix, a colour and
  // (specular, opacity, self-light, _). kind: 'solid' | 'glass'.
  class Solid {
    constructor(geo, { kind = 'solid', max = 1, shadow = kind === 'solid' } = {}) {
      const n = geo.pos.length / 3;
      const inter = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) inter.set([geo.pos[i * 3], geo.pos[i * 3 + 1], geo.pos[i * 3 + 2], geo.nrm[i * 3], geo.nrm[i * 3 + 1], geo.nrm[i * 3 + 2]], i * 6);
      this.vbuf = device.createBuffer({ size: Math.max(24, inter.byteLength), usage: B.VERTEX | B.COPY_DST });
      device.queue.writeBuffer(this.vbuf, 0, inter);
      this.ibuf = device.createBuffer({ size: Math.max(4, geo.idx.byteLength), usage: B.INDEX | B.COPY_DST });
      device.queue.writeBuffer(this.ibuf, 0, geo.idx);
      this.count = geo.idx.length;
      this.max = max;
      this.sbuf = device.createBuffer({ size: max * 96, usage: B.STORAGE | B.COPY_DST });
      this.bind = device.createBindGroup({ layout: instLayout, entries: [{ binding: 0, resource: { buffer: this.sbuf } }] });
      this.data = new Float32Array(max * 24);
      Object.assign(this, { kind, shadow, n: 0 });
    }
    // items: [{ m, color: [r, g, b, a], p: [spec, opacity, self, 0] }]
    set(items) {
      const n = Math.min(items.length, this.max);
      for (let i = 0; i < n; i++) {
        const it = items[i];
        this.data.set(it.m, i * 24);
        this.data.set(it.color, i * 24 + 16);
        this.data.set(it.p ?? [0, 1, 0, 0], i * 24 + 20);
      }
      this.n = n;
      if (n) device.queue.writeBuffer(this.sbuf, 0, this.data, 0, n * 24);
    }
    destroy() {
      this.vbuf.destroy();
      this.ibuf.destroy();
      this.sbuf.destroy();
    }
    draw(pass, pipe) {
      if (!this.n) return;
      pass.setPipeline(pipe);
      pass.setBindGroup(1, this.bind);
      pass.setVertexBuffer(0, this.vbuf);
      pass.setIndexBuffer(this.ibuf, 'uint32');
      pass.drawIndexed(this.count, this.n);
    }
  }

  // A part standing in space: model maps the unit card (x −½..½, y 0..1) to the world.
  class Card {
    constructor(texture) {
      this.ubuf = fixed(80, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: texLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }, { binding: 1, resource: texture.createView() }, { binding: 2, resource: aniso }] });
      Object.assign(this, { m: null, opacity: 1 });
    }
    upload() {
      if (!this.m) return;
      const d = new Float32Array(20);
      d.set(this.m, 0);
      d.set([this.opacity, 0, 0, 0], 16);
      device.queue.writeBuffer(this.ubuf, 0, d);
    }
    draw(pass) {
      if (!this.m || this.opacity < 0.01) return;
      pass.setPipeline(P.card);
      pass.setBindGroup(1, this.bind);
      pass.draw(6);
    }
    destroy() { this.ubuf.destroy(); }
  }

  // One component of a figure, on its own sheet over the page.
  class Sheet {
    constructor(texture) {
      this.texture = texture;
      this.ubuf = fixed(80, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: texLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }, { binding: 1, resource: texture.createView() }, { binding: 2, resource: aniso }] });
      Object.assign(this, { box: [0, 0, 1, 1], range: [0, 0, 1, 1], h: 0, opacity: 1, acetate: 0, wall: null, tint: [0.33, 0.45, 0.5] });
    }
    upload() {
      const w = this.wall;
      device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.box, ...this.range, this.h, this.opacity, this.acetate, w ? 1 : 0, w?.b ?? 0, w?.height ?? 0, 0, 0, ...this.tint, 1]));
    }
    draw(pass) {
      if (this.opacity < 0.004) return;
      pass.setPipeline(P.sheet);
      pass.setBindGroup(1, this.bind);
      pass.draw(48);
    }
    destroy() {
      this.ubuf.destroy();
      this.texture.destroy();
      this.host?.remove();
    }
  }

  class Catcher {
    constructor() {
      this.ubuf = fixed(32, B.UNIFORM);
      this.bind = device.createBindGroup({ layout: camLayout, entries: [{ binding: 0, resource: { buffer: this.ubuf } }] });
      Object.assign(this, { rect: [0, 0, 1, 1], strength: 0, segs: 64 });
    }
    upload() { device.queue.writeBuffer(this.ubuf, 0, new Float32Array([...this.rect, this.strength, this.segs, 0, 0])); }
    draw(pass) {
      if (this.strength < 0.004) return;
      pass.setPipeline(P.catcher);
      pass.setBindGroup(1, this.bind);
      pass.setBindGroup(2, shadowBind);
      pass.draw(this.segs * 6);
    }
  }
  const catcher = new Catcher();

  const post = (enc, pipe, bind, view) => {
    const pass = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, bind);
    pass.draw(3);
    pass.end();
  };

  return {
    freeScene() {
      for (const b of owned) b.destroy();
      owned = [];
    },
    lines: (...a) => new Lines(...a),
    points: (...a) => new Points(...a),
    mesh: (...a) => new Mesh(...a),
    tile: (...a) => new Tile(...a),
    solid: (...a) => new Solid(...a),
    card: (...a) => new Card(...a),
    sheet: (...a) => new Sheet(...a),
    // an html-in-canvas texture for a live element, with its mip chain
    texture: (w, h) => device.createTexture({
      size: [w, h], format: 'rgba8unorm', mipLevelCount: Math.floor(Math.log2(Math.max(w, h))) + 1,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }),
    slab: (...a) => new Slab(...a),
    shadow: (...a) => new Shadow(...a),
    resize(canvas, w, h) {
      if (canvas.width === w && canvas.height === h && rt) return;
      canvas.width = w;
      canvas.height = h;
      makeTargets(w, h);
    },
    mips(t) {
      const enc = device.createCommandEncoder();
      for (let i = 1; i < t.mipLevelCount; i++) {
        const bind = device.createBindGroup({
          layout: mipPipe.getBindGroupLayout(0),
          entries: [{ binding: 0, resource: t.createView({ baseMipLevel: i - 1, mipLevelCount: 1 }) }, { binding: 1, resource: linear }],
        });
        post(enc, mipPipe, bind, t.createView({ baseMipLevel: i, mipLevelCount: 1 }));
      }
      device.queue.submit([enc.finish()]);
    },
    // under: drawn before the sheet; over: after the lifted cards
    render({ ctx, cam, bg, fog, spot = { k: 0, rect: [0, 0, 0, 0] }, under, tiles, plates = [], shadows, slabs, solids = [], glass = [], cards = [], sheets = [], bench = null, over, bloom }) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const c = new Float32Array(52);
      c.set(cam.vp, 0);
      c.set([...cam.eye, 1], 16);
      c.set([cam.W, cam.H, cam.focus, cam.docW, cam.t, PX, BEND.k, BEND.u0, BEND.theta, cam.t, cam.time, 0], 20);
      if (bench) {
        c.set(bench.lightVP, 32);
        c.set([...bench.lightDir, bench.shadow], 48);
      }
      device.queue.writeBuffer(camBuf, 0, c);
      for (const t of plates) t.upload(fog, spot);
      for (const k of cards) k.upload();
      for (const q of sheets) q.upload();
      if (bench) {
        catcher.rect = bench.catchRect;
        catcher.strength = bench.catchStrength;
        catcher.upload();
      }
      device.queue.writeBuffer(bgBuf, 0, new Float32Array([...bg.inner, cam.t, ...bg.outer, 1, ...bg.center, bg.radius, cam.time]));
      device.queue.writeBuffer(compBuf, 0, new Float32Array([bloom * 0.9, bloom * 0.75, cam.t, 0]));
      for (const t of tiles) t.upload(fog, spot);
      for (const s of shadows) s.upload(spot);
      for (const s of slabs) s.upload(fog, spot);
      for (const o of under) o.upload(dpr);
      for (const o of over) o.upload(dpr);

      const enc = device.createCommandEncoder();
      // the light's view of everything that stands on the bench
      const sp = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: shadowView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } });
      sp.setBindGroup(0, camBind);
      if (bench) for (const s of solids) if (s.shadow) s.draw(sp, depthPipe);
      sp.end();

      const pass = enc.beginRenderPass({
        colorAttachments: [
          { view: rt.sceneMSV, resolveTarget: rt.sceneV, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'discard' },
          { view: rt.glowMSV, resolveTarget: rt.glowV, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'discard' },
        ],
        depthStencilAttachment: { view: rt.depthMSV, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
      });
      pass.setPipeline(P.bg);
      pass.setBindGroup(0, bgBind);
      pass.draw(3);
      pass.setBindGroup(0, camBind);
      for (const o of under) o.draw(pass);
      for (const t of tiles) t.draw(pass);
      for (const t of plates) t.draw(pass);
      if (bench) catcher.draw(pass);
      for (const s of shadows) s.draw(pass);
      for (const q of sheets) q.draw(pass);
      for (const s of slabs) s.draw(pass);
      pass.setBindGroup(2, shadowBind);
      for (const s of solids) s.draw(pass, P.solid);
      for (const k of cards) k.draw(pass);
      for (const s of glass) s.draw(pass, P.glass);
      for (const o of over) o.draw(pass);
      pass.end();

      post(enc, copyPipe, rt.binds.glowToH, rt.hAV);
      post(enc, blurPipe, rt.binds.hAtoB, rt.hBV);
      post(enc, blurPipe, rt.binds.hBtoA, rt.hAV);
      post(enc, copyPipe, rt.binds.hToQ, rt.qAV);
      post(enc, blurPipe, rt.binds.qAtoB, rt.qBV);
      post(enc, blurPipe, rt.binds.qBtoA, rt.qAV);
      post(enc, compPipe, rt.binds.comp, ctx.getCurrentTexture().createView());
      device.queue.submit([enc.finish()]);
    },
  };
}
