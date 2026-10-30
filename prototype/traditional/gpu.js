// The renderer behind the fold: WebGPU pipelines, the ribbon that bends the
// captured page, and the HTML-in-Canvas copy. fold.js decides what to draw.

import { TILE, MESH, LINE, POINT, BG, MIP, BLUR, COPY, COMPOSITE, SOLID, DEPTH, CATCHER } from './shaders.js';
import { lerp } from './geom.js';

export const PX = 1 / 900;
// Bend: flat floor for u0 before the reading line, then an arc of radius r up to theta.
const BEND = { u0: 520 * PX, k: 1 / (720 * PX), theta: (92 * Math.PI) / 180 };
const SAMPLES = 4;

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
  // Depth: the page and its overlays never write it; solids do, and the drawn
  // constructs test against them.
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
    mesh: scenePipe('mesh', MESH, [camLayout, camLayout], [{ arrayStride: 20, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x2' }] }], TESTED),
    line: scenePipe('line', LINE, [camLayout, objLayout], [], TESTED),
    point: scenePipe('point', POINT, [camLayout, objLayout], [], TESTED),
    solid: scenePipe('solid', SOLID, [camLayout, instLayout, shadowLayout], SOLID_BUF, { depthWriteEnabled: true, depthCompare: 'less' }),
    catcher: scenePipe('catcher', CATCHER, [camLayout, camLayout, shadowLayout]),
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

  // An instanced solid: one maquette part, drawn once per agent that stands in the scene.
  class Solid {
    constructor(geo, { max = 1, shadow = true } = {}) {
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
      Object.assign(this, { shadow, n: 0 });
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

  // The shadow catcher: a band of the page that receives the maquettes' shadows.
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
    // an html-in-canvas texture for a live element, with its mip chain
    texture: (w, h) => device.createTexture({
      size: [w, h], format: 'rgba8unorm', mipLevelCount: Math.floor(Math.log2(Math.max(w, h))) + 1,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    }),
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
    // under: drawn before the page; over: after the maquettes
    render({ ctx, cam, bg, fog, spot = { k: 0, rect: [0, 0, 0, 0] }, under, tiles, solids = [], light = null, over, bloom }) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const c = new Float32Array(52);
      c.set(cam.vp, 0);
      c.set([...cam.eye, 1], 16);
      c.set([cam.W, cam.H, cam.focus, cam.docW, cam.t, PX, BEND.k, BEND.u0, BEND.theta, cam.fog ?? cam.t, cam.time, 0], 20);
      if (light) {
        c.set(light.VP, 32);
        c.set([...light.dir, light.shadow], 48);
      }
      device.queue.writeBuffer(camBuf, 0, c);
      if (light) {
        catcher.rect = light.catchRect;
        catcher.strength = light.catchStrength;
        catcher.upload();
      }
      device.queue.writeBuffer(bgBuf, 0, new Float32Array([...bg.inner, cam.t, ...bg.outer, 1, ...bg.center, bg.radius, cam.time]));
      device.queue.writeBuffer(compBuf, 0, new Float32Array([bloom * 0.9, bloom * 0.75, cam.t, 0]));
      for (const t of tiles) t.upload(fog, spot);
      for (const o of under) o.upload(dpr);
      for (const o of over) o.upload(dpr);

      const enc = device.createCommandEncoder();
      // the light's view of the maquettes
      const sp = enc.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: shadowView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } });
      sp.setBindGroup(0, camBind);
      if (light) for (const s of solids) if (s.shadow) s.draw(sp, depthPipe);
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
      if (light) catcher.draw(pass);
      pass.setBindGroup(2, shadowBind);
      for (const s of solids) s.draw(pass, P.solid);
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
