// Concept anatomy: a textbook figure taken apart where it stands.
//
// Each figure is drawn as separate transparent sheets (axes, a curve, a point,
// an area...), one per component of the concept. The sheets are copied into
// WebGPU with html-in-canvas and float in a small 3D view that stays pinned
// beside the text. Reading down the steps separates the sheets, lights one
// component at a time, brings out the variable the flat figure held fixed,
// lets the reader move it, and lays the sheets back into the flat figure.

import { perspective, lookAt, multiply, project } from './math.js';
import { SPECS } from './dissect-specs.js';

const SVG_W = 640;
const SVG_H = 420;
const SHEET_W = 6.4;
const SHEET_H = 4.2;
const PAD = { l: 58, r: 34, t: 26, b: 50 };
const SAMPLES = 4;
const TEX_SCALE = 1.6;

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (cur, tgt, dt, rate) => cur + (tgt - cur) * (1 - Math.exp(-dt * rate));

// data → sheet-local world units, for a plot with the shared padding
export function mapper(dom) {
  const X = (v) => PAD.l + ((v - dom.x[0]) / (dom.x[1] - dom.x[0])) * (SVG_W - PAD.l - PAD.r);
  const Y = (v) => SVG_H - PAD.b - ((v - dom.y[0]) / (dom.y[1] - dom.y[0])) * (SVG_H - PAD.t - PAD.b);
  return (x, y) => [(X(x) - SVG_W / 2) / 100, (SVG_H / 2 - Y(y)) / 100];
}

// ---------- WGSL ----------
const CAM = /* wgsl */ `
struct Cam { vp: mat4x4f, viewport: vec4f };
@group(0) @binding(0) var<uniform> cam: Cam;
`;
const LAYER = CAM + /* wgsl */ `
struct LayerU { m: mat4x4f, p: vec4f, tint: vec4f };
@group(1) @binding(0) var<uniform> lu: LayerU;
@group(1) @binding(1) var tex: texture_2d<f32>;
@group(1) @binding(2) var samp: sampler;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  var cs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi];
  var o: VO;
  o.pos = cam.vp * (lu.m * vec4f((c.x - 0.5) * ${SHEET_W}, (c.y - 0.5) * ${SHEET_H}, 0.0, 1.0));
  o.uv = vec2f(c.x, 1.0 - c.y);
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let t = textureSample(tex, samp, i.uv);
  // the acetate: a faint tint and a hairline edge, shown only while the sheets stand apart
  let e = min(min(i.uv.x, 1.0 - i.uv.x) * ${SHEET_W}, min(i.uv.y, 1.0 - i.uv.y) * ${SHEET_H});
  let edge = 1.0 - smoothstep(0.0, 0.035, e);
  let sa = lu.p.y * (0.06 + 0.55 * edge);
  let sheet = vec4f(lu.tint.rgb * sa, sa);
  return (t + sheet * (1.0 - t.a)) * lu.p.x;
}
`;
const LINE = CAM + /* wgsl */ `
struct Seg { a: vec4f, b: vec4f, c: vec4f };
@group(1) @binding(0) var<storage, read> segs: array<Seg>;
struct VO { @builtin(position) pos: vec4f, @location(0) c: vec4f, @location(1) d: f32, @location(2) along: f32, @location(3) dash: f32, @location(4) hw: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let s = segs[ii];
  let a = cam.vp * vec4f(s.a.xyz, 1.0);
  let b = cam.vp * vec4f(s.b.xyz, 1.0);
  let half = cam.viewport.xy * 0.5;
  let sa = a.xy / a.w * half;
  let sb = b.xy / b.w * half;
  let dl = sb - sa;
  let len = max(length(dl), 1e-4);
  let dir = dl / len;
  let nrm = vec2f(-dir.y, dir.x);
  var cs = array<vec2f, 6>(vec2f(0.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi];
  let hw = s.a.w * 0.5 + 1.0;
  var p = a;
  if (c.x > 0.5) { p = b; }
  let off = nrm * hw * c.y + dir * hw * 0.5 * (c.x * 2.0 - 1.0);
  var o: VO;
  o.pos = p + vec4f(off / half * p.w, 0.0, 0.0);
  o.c = s.c;
  o.d = c.y * hw;
  o.along = c.x * len;
  o.dash = s.b.w;
  o.hw = s.a.w * 0.5;
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  if (i.dash > 0.5 && fract(i.along / 10.0) > 0.55) { discard; }
  let a = clamp(i.hw + 0.5 - abs(i.d), 0.0, 1.0) * i.c.a;
  return vec4f(i.c.rgb * a, a);
}
`;
const DOT = CAM + /* wgsl */ `
struct Dot { p: vec4f, c: vec4f };
@group(1) @binding(0) var<storage, read> dots: array<Dot>;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) c: vec4f, @location(2) r: f32 };
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let d = dots[ii];
  let c = cam.vp * vec4f(d.p.xyz, 1.0);
  var cs = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let q = cs[vi];
  let r = d.p.w + 1.0;
  var o: VO;
  o.pos = c + vec4f(q * r / (cam.viewport.xy * 0.5) * c.w, 0.0, 0.0);
  o.uv = q * r;
  o.c = d.c;
  o.r = d.p.w;
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let a = clamp(i.r + 0.5 - length(i.uv), 0.0, 1.0) * i.c.a;
  if (a <= 0.002) { discard; }
  return vec4f(i.c.rgb * a, a);
}
`;
const MIP = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[vi], 0.0, 1.0);
  o.uv = vec2f(p[vi].x * 0.5 + 0.5, 0.5 - p[vi].y * 0.5);
  return o;
}
@fragment fn fs(i: VO) -> @location(0) vec4f { return textureSample(src, samp, i.uv); }
`;

// ---------- shared GPU ----------
let GPU = null;
async function gpu() {
  if (GPU) return GPU;
  if (!('gpu' in navigator) || !('requestPaint' in HTMLCanvasElement.prototype)) throw new Error('WebGPU with HTML-in-Canvas is needed');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();
  const B = GPUBufferUsage;
  const blend = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } };
  const camLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  const texLayout = device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {} },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
  ] });
  const stLayout = device.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } }] });
  const pipe = (code, layouts) => {
    const m = device.createShaderModule({ code });
    m.getCompilationInfo().then((info) => info.messages.forEach((x) => x.type === 'error' && console.error('[dissect wgsl]', x.lineNum, x.message)));
    return device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module: m, entryPoint: 'vs' },
      fragment: { module: m, entryPoint: 'fs', targets: [{ format, blend }] },
      primitive: { topology: 'triangle-list' },
      multisample: { count: SAMPLES },
    });
  };
  const mipMod = device.createShaderModule({ code: MIP });
  GPU = {
    device, format, B, camLayout, texLayout, stLayout,
    layer: pipe(LAYER, [camLayout, texLayout]),
    line: pipe(LINE, [camLayout, stLayout]),
    dot: pipe(DOT, [camLayout, stLayout]),
    mip: device.createRenderPipeline({ layout: 'auto', vertex: { module: mipMod, entryPoint: 'vs' }, fragment: { module: mipMod, entryPoint: 'fs', targets: [{ format: 'rgba8unorm' }] }, primitive: { topology: 'triangle-list' } }),
    sampler: device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 16, addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' }),
    linear: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }),
  };
  device.addEventListener('uncapturederror', (e) => console.error('[dissect]', e.error.message));
  return GPU;
}

function mips(g, tex) {
  const enc = g.device.createCommandEncoder();
  for (let i = 1; i < tex.mipLevelCount; i++) {
    const bind = g.device.createBindGroup({ layout: g.mip.getBindGroupLayout(0), entries: [{ binding: 0, resource: tex.createView({ baseMipLevel: i - 1, mipLevelCount: 1 }) }, { binding: 1, resource: g.linear }] });
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: tex.createView({ baseMipLevel: i, mipLevelCount: 1 }), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    pass.setPipeline(g.mip);
    pass.setBindGroup(0, bind);
    pass.draw(3);
    pass.end();
  }
  g.device.queue.submit([enc.finish()]);
}

// ---------- matrices ----------
const rotX = (a) => [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1];
const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const mul = (a, b) => multiply(new Float32Array(a), new Float32Array(b));
const apply = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

// ---------- one view ----------
class View {
  constructor(block, spec, g) {
    this.block = block;
    this.spec = spec;
    this.g = g;
    this.view = block.querySelector('.ds-view');
    this.canvas = block.querySelector('.ds-canvas');
    this.labelsRoot = block.querySelector('.ds-labels');
    this.steps = [...block.querySelectorAll('.ds-step')];
    this.ctx = this.canvas.getContext('webgpu');
    this.ctx.configure({ device: g.device, format: g.format, alphaMode: 'premultiplied' });
    this.camBuf = g.device.createBuffer({ size: 80, usage: g.B.UNIFORM | g.B.COPY_DST });
    this.camBind = g.device.createBindGroup({ layout: g.camLayout, entries: [{ binding: 0, resource: { buffer: this.camBuf } }] });
    this.segBuf = g.device.createBuffer({ size: 48 * 4000, usage: g.B.STORAGE | g.B.COPY_DST });
    this.segBind = g.device.createBindGroup({ layout: g.stLayout, entries: [{ binding: 0, resource: { buffer: this.segBuf } }] });
    this.dotBuf = g.device.createBuffer({ size: 32 * 400, usage: g.B.STORAGE | g.B.COPY_DST });
    this.dotBind = g.device.createBindGroup({ layout: g.stLayout, entries: [{ binding: 0, resource: { buffer: this.dotBuf } }] });
    this.state = { explode: 0, az: 0, el: 0, dist: 1, ty: 0, tz: 0, params: { ...spec.params } };
    this.dirty = new Set();
    this.layers = spec.layers.map((L) => this.makeLayer(L));
    this.names = new Map();
    this.canvas.addEventListener('paint', () => this.copyDirty());
    this.time = 0;
    this.last = performance.now();
    this.visible = false;
  }

  makeLayer(L) {
    const g = this.g;
    const host = document.createElement('div');
    host.className = 'ds-layer';
    host.style.cssText = `width:${SVG_W}px;`;
    this.canvas.appendChild(host);
    const w = Math.round(SVG_W * TEX_SCALE);
    const h = Math.round(SVG_H * TEX_SCALE);
    const tex = g.device.createTexture({ size: [w, h], format: 'rgba8unorm', mipLevelCount: Math.floor(Math.log2(Math.max(w, h))) + 1, usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    const ubuf = g.device.createBuffer({ size: 96, usage: g.B.UNIFORM | g.B.COPY_DST });
    const bind = g.device.createBindGroup({ layout: g.texLayout, entries: [{ binding: 0, resource: { buffer: ubuf } }, { binding: 1, resource: tex.createView() }, { binding: 2, resource: g.sampler }] });
    const layer = { ...L, host, tex, ubuf, bind, key: null, op: 0, ready: false };
    this.redraw(layer);
    return layer;
  }

  redraw(layer) {
    const key = JSON.stringify(layer.live ? layer.live.map((k) => Math.round((this.state.params[k] ?? 0) * 200) / 200) : 0);
    if (key === layer.key) return;
    layer.key = key;
    layer.host.replaceChildren();
    layer.draw(layer.host, this.state.params);
    this.dirty.add(layer);
    this.canvas.requestPaint();
  }

  copyDirty() {
    for (const L of this.dirty) {
      try {
        const q = this.g.device.queue;
        const src = { source: L.host, sx: 0, sy: 0, swidth: SVG_W, sheight: SVG_H };
        if (q.copyElementImageToTexture) q.copyElementImageToTexture(src, { destination: { texture: L.tex, premultipliedAlpha: true }, width: L.tex.width, height: L.tex.height });
        else q.drawElementImageToTexture({ source: L.host, sourceX: 0, sourceY: 0, sourceWidth: SVG_W, sourceHeight: SVG_H }, { texture: L.tex, size: { width: L.tex.width, height: L.tex.height }, premultipliedAlpha: true });
        mips(this.g, L.tex);
        L.ready = true;
      } catch (err) {
        console.error(err);
      }
    }
    this.dirty.clear();
  }

  // the reading line decides the step and how far into it the reader is
  scrollState() {
    const line = innerHeight * 0.55;
    let s = 0;
    let t = 0;
    this.steps.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.top < line) {
        s = i;
        t = clamp((line - r.top) / Math.max(1, r.height), 0, 1);
      }
    });
    return { s, t };
  }

  name(id, html, cls = '') {
    let el = this.names.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = `ds-name ${cls}`;
      this.labelsRoot.appendChild(el);
      this.names.set(id, el);
    }
    if (el.dataset.h !== html) {
      el.innerHTML = html;
      el.dataset.h = html;
    }
    return el;
  }

  frame(now) {
    if (this.recopy > 0) {
      // ask for a few fresh paints while the view settles on screen
      this.recopy--;
      for (const L of this.layers) this.dirty.add(L);
      this.canvas.requestPaint();
    }
    const dt = clamp((now - this.last) / 1000, 0, 0.05);
    this.last = now;
    this.time += dt;
    const g = this.g;
    const rect = this.view.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(rect.width * dpr));
    const H = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
      this.ms?.destroy();
      this.ms = g.device.createTexture({ size: [W, H], format: g.format, sampleCount: SAMPLES, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    }
    // the target state of the current step
    const { s, t } = this.scrollState();
    this.steps.forEach((el, i) => el.classList.toggle('on', i === s));
    const step = this.spec.steps[s];
    const T = step.state(t, this.state.params);
    const st = this.state;
    st.explode = approach(st.explode, T.explode ?? 0, dt, 3);
    st.tilt = approach(st.tilt ?? 0, T.tilt ?? 0, dt, 2.4);
    const cam = { az: 0, el: 0, dist: 1, ty: 0, tz: 0, ...(T.cam ?? {}) };
    for (const k of ['az', 'el', 'dist', 'ty', 'tz']) st[k] = approach(st[k], cam[k], dt, 2.6);
    for (const k in T.params ?? {}) st.params[k] = approach(st.params[k], T.params[k], dt, 4);
    const show = T.show ?? this.spec.layers.map((L) => L.id);
    // the sheets in focus come forward and lie together, so the parts they show
    // register; the rest stay apart, dimmed, behind them
    const n0 = this.layers.length;
    const front = 0.5 * st.explode;
    for (const [i, L] of this.layers.entries()) {
      const on = show.includes(L.id);
      const lit = !T.focus || T.focus.includes(L.id);
      L.op = approach(L.op, on ? (lit ? 1 : 0.13) : 0, dt, 5);
      const zApart = (i - (n0 - 1) / 2) * 0.9 * st.explode;
      L.zt = !T.focus ? zApart : lit ? front : zApart * 0.6 - 1.5 * st.explode;
      L.zc = approach(L.zc ?? zApart, L.zt, dt, 3.2);
      if (L.live) this.redraw(L);
    }

    // camera: a slow drift keeps the depth legible
    const target = [0, st.ty, st.tz];
    // fit the sheet in both directions of the view, then step back for the pose
    const tanH = Math.tan((14 * Math.PI) / 180);
    const D = Math.max((SHEET_H / 2) * 1.12 / tanH, (SHEET_W / 2) * 1.06 / (tanH * (W / H))) * st.dist;
    const az = st.az + Math.sin(this.time * 0.25) * 0.025 * Math.min(1, st.explode * 2);
    const el = st.el;
    const eye = [target[0] + D * Math.sin(az) * Math.cos(el), target[1] + D * Math.sin(el), target[2] + D * Math.cos(az) * Math.cos(el)];
    const vp = multiply(perspective((28 * Math.PI) / 180, W / H, 0.5, 80), lookAt(eye, target, [0, 1, 0]));
    g.device.queue.writeBuffer(this.camBuf, 0, new Float32Array([...vp, W, H, 0, 0]));

    // sheets: explode along z, in the order the spec lists them; TILT lays them back about the x axis line
    const TILT = mul(mul(trans(0, -1.6, 0), rotX(-st.tilt * Math.PI / 2)), trans(0, 1.6, 0));
    const n = this.layers.length;
    const draws = [];
    this.layers.forEach((L, i) => {
      if (L.op < 0.01 || !L.ready) return;
      let m;
      if (L.floor) m = mul(trans(0, -1.6, -1.6), rotX(-Math.PI / 2));
      else m = mul(TILT, trans(0, 0, L.zc + (L.z ?? 0)));
      const c = apply(m, [0, 0, 0]);
      const d2 = (c[0] - eye[0]) ** 2 + (c[1] - eye[1]) ** 2 + (c[2] - eye[2]) ** 2;
      g.device.queue.writeBuffer(L.ubuf, 0, new Float32Array([...m, L.op, L.floor ? 0.6 : st.explode, 0, 0, ...(L.tint ?? [0.33, 0.45, 0.5]), 1]));
      draws.push({ L, d2, m });
      // the sheet's name, at its upper-left corner while the sheets stand apart
      const corner = apply(m, [-SHEET_W / 2 + 0.1, SHEET_H / 2 - 0.05, 0]);
      const pr = project(vp, corner, rect.width, rect.height);
      const nm = this.name(`sheet-${L.id}`, L.title, 'sheet');
      const o = (L.floor ? 1 : clamp((st.explode - 0.35) / 0.4, 0, 1)) * (L.op > 0.5 ? L.op : L.op * 2.5);
      if (pr && o > 0.02) {
        nm.style.opacity = String(o);
        nm.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) translate(0, -100%)`;
      } else nm.style.opacity = '0';
    });
    for (const L of this.layers) if (L.op < 0.01) { const nm = this.names.get(`sheet-${L.id}`); if (nm) nm.style.opacity = '0'; }
    draws.sort((a, b) => b.d2 - a.d2);

    // helper geometry in three dimensions, from the spec
    const segs = [];
    const dots = [];
    const tags = [];
    const sheetZ = (id) => this.layers.find((L) => L.id === id)?.zc ?? 0;
    // helper points are given in sheet space and tilted with the sheets (floor points are already in world space)
    const tw = (p, world) => (world ? p : apply(TILT, p));
    const geo = {
      line: (a, b, c, w = 2, dash = false, world = false) => segs.push([...tw(a, world), w * dpr, ...tw(b, world), dash ? 1 : 0, ...c]),
      dot: (p, c, r = 4, world = false) => dots.push([...tw(p, world), r * dpr, ...c]),
      tag: (id, p, html, cls = '', world = false) => tags.push({ id, p: tw(p, world), html, cls }),
      z: sheetZ,
      explode: st.explode,
    };
    if (T.geo) T.geo(geo, st.params, t);
    const sd = new Float32Array(segs.length * 12);
    segs.forEach((q, i) => sd.set(q, i * 12));
    if (segs.length) g.device.queue.writeBuffer(this.segBuf, 0, sd);
    const dd = new Float32Array(dots.length * 8);
    dots.forEach((q, i) => dd.set(q, i * 8));
    if (dots.length) g.device.queue.writeBuffer(this.dotBuf, 0, dd);
    const live = new Set();
    for (const tg of tags) {
      const pr = project(vp, tg.p, rect.width, rect.height);
      const el2 = this.name(tg.id, tg.html, tg.cls);
      live.add(tg.id);
      if (!pr) { el2.style.opacity = '0'; continue; }
      el2.style.opacity = '1';
      el2.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) translate(-50%, -120%)`;
    }
    for (const [id, el2] of this.names) if (!id.startsWith('sheet-') && !live.has(id)) el2.style.opacity = '0';

    const enc = g.device.createCommandEncoder();
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: this.ms.createView(), resolveTarget: this.ctx.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'discard', clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    pass.setBindGroup(0, this.camBind);
    pass.setPipeline(g.layer);
    for (const { L } of draws) {
      pass.setBindGroup(1, L.bind);
      pass.draw(6);
    }
    if (segs.length) {
      pass.setPipeline(g.line);
      pass.setBindGroup(1, this.segBind);
      pass.draw(6, segs.length);
    }
    if (dots.length) {
      pass.setPipeline(g.dot);
      pass.setBindGroup(1, this.dotBind);
      pass.draw(6, dots.length);
    }
    pass.end();
    g.device.queue.submit([enc.finish()]);
  }
}

// ---------- page ----------
export function renderDissections(root) {
  for (const spec of SPECS) {
    const anchor = root.querySelector(spec.after);
    if (!anchor) continue;
    const el = document.createElement(anchor.tagName === 'LI' ? 'li' : 'section');
    el.className = 'dissect';
    el.id = `anat-${spec.id}`;
    el.innerHTML = `<p class="an-title"><span>Anatomy</span>${spec.title}</p>` +
      `<p class="ds-eq">${spec.eq}</p>` +
      '<div class="ds-grid"><div class="ds-steps">' +
      spec.steps.map((s, i) => `<div class="ds-step" data-i="${i}"><p class="ds-k">${i + 1}. ${s.k}</p>${s.html}</div>`).join('') +
      '</div><div class="ds-view"><canvas class="ds-canvas" layoutsubtree aria-hidden="true"></canvas><div class="ds-labels" aria-hidden="true"></div>' +
      `<div class="ds-flat"></div></div></div>`;
    // without WebGPU, the reader still gets the textbook figure
    spec.flat?.(el.querySelector('.ds-flat'));
    anchor.after(el);
  }
}

export async function startDissections(root) {
  const blocks = [...root.querySelectorAll('.dissect')];
  if (!blocks.length) return;
  let g;
  try {
    g = await gpu();
  } catch (err) {
    for (const b of blocks) b.classList.add('no-gpu');
    return;
  }
  const views = blocks.map((b) => new View(b, SPECS.find((s) => `anat-${s.id}` === b.id), g));
  // an element inside a canvas is only painted while the canvas is on screen,
  // so the sheets are copied again whenever a view comes into sight
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = views.find((x) => x.block === e.target);
      if (!v) continue;
      if (e.isIntersecting && !v.visible) v.recopy = 3;
      v.visible = e.isIntersecting;
    }
  }, { rootMargin: '0px' });
  for (const v of views) io.observe(v.block);
  for (const b of blocks) b.classList.add('gpu');
  const loop = (now) => {
    for (const v of views) if (v.visible) v.frame(now);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export { lerp, clamp };
