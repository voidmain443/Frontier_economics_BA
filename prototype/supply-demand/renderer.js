// 최소 WebGPU 렌더러: 고정 캔버스 하나, MSAA 4x, 선·점·곡면·배경 파이프라인 + 소비자 compute.
// 나중에 packages/engine의 출발점이 된다.

import { LINE, POINT, SURFACE, BG, AGENTS, FLOW } from './shaders.js';

const SAMPLES = 4;
const PREMULT = {
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
};
const ADDITIVE = {
  color: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
};

export async function createRenderer(canvas) {
  if (!navigator.gpu) throw new Error('WebGPU 미지원 브라우저');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('GPU 어댑터를 얻지 못함');
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'premultiplied' });
  return new Renderer(device, ctx, format, canvas);
}

class Renderer {
  constructor(device, ctx, format, canvas) {
    this.device = device;
    this.ctx = ctx;
    this.format = format;
    this.canvas = canvas;
    this.msaa = null;

    device.addEventListener('uncapturederror', (e) => console.error('[webgpu]', e.error.message));
    device.lost.then((info) => console.error('[webgpu] device lost:', info.message));

    const S = GPUShaderStage;
    const layout = (entries) => device.createBindGroupLayout({ entries });
    const uniform = (binding) => ({ binding, visibility: S.VERTEX | S.FRAGMENT, buffer: { type: 'uniform' } });
    this.uniLayout = layout([uniform(0)]);
    this.objLayout = layout([uniform(0), { binding: 1, visibility: S.VERTEX, buffer: { type: 'read-only-storage' } }]);

    // 뷰마다 카메라·배경 uniform 한 벌 (캔버스 하나, 뷰 여러 개)
    this.viewSlots = [];

    this.pipes = {
      bg: this.pipeline('bg', BG, [this.uniLayout], PREMULT),
      line: this.pipeline('line', LINE, [this.uniLayout, this.objLayout], PREMULT),
      point: this.pipeline('point', POINT, [this.uniLayout, this.objLayout], PREMULT),
      pointAdd: this.pipeline('point-add', POINT, [this.uniLayout, this.objLayout], ADDITIVE),
      surface: this.pipeline('surface', SURFACE, [this.uniLayout, this.uniLayout], PREMULT),
    };
  }

  buffer(size, usage) {
    return this.device.createBuffer({ size, usage: usage | GPUBufferUsage.COPY_DST });
  }

  bind(layout, buffers) {
    return this.device.createBindGroup({
      layout,
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })),
    });
  }

  module(label, code) {
    const m = this.device.createShaderModule({ label, code });
    m.getCompilationInfo().then((info) => {
      for (const msg of info.messages) {
        if (msg.type === 'error') console.error(`[wgsl:${label}] ${msg.lineNum}:${msg.linePos} ${msg.message}`);
      }
    });
    return m;
  }

  pipeline(label, code, layouts, blend) {
    const module = this.module(label, code);
    return this.device.createRenderPipeline({
      label,
      layout: this.device.createPipelineLayout({ bindGroupLayouts: layouts }),
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format: this.format, blend }] },
      primitive: { topology: 'triangle-list' },
      multisample: { count: SAMPLES },
    });
  }

  resize(w, h) {
    if (this.canvas.width === w && this.canvas.height === h && this.msaa) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.msaa?.destroy();
    this.msaa = this.device.createTexture({
      size: [w, h],
      sampleCount: SAMPLES,
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.msaaView = this.msaa.createView();
  }

  lines(max, external = null) {
    return new LineObj(this, max, external);
  }

  flow(N) {
    const d = this.device;
    const init = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) init.set([Math.random() * 10, Math.random() * 10, Math.random() * 4, 1.5 + Math.random() * 4.5], i * 4);
    const stateBuf = this.buffer(N * 16, GPUBufferUsage.STORAGE);
    d.queue.writeBuffer(stateBuf, 0, init);
    const segBuf = d.createBuffer({ size: N * 32, usage: GPUBufferUsage.STORAGE });
    const paramBuf = this.buffer(32, GPUBufferUsage.UNIFORM);
    const pipe = d.createComputePipeline({
      label: 'flow',
      layout: 'auto',
      compute: { module: this.module('flow', FLOW), entryPoint: 'main' },
    });
    const bindGroup = this.bind(pipe.getBindGroupLayout(0), [paramBuf, stateBuf, segBuf]);
    const params = new ArrayBuffer(32);
    const f = new Float32Array(params);
    const u = new Uint32Array(params);
    return {
      buffer: segBuf,
      count: N,
      encode(enc, { a, c, dt, time }) {
        f[0] = a;
        f[1] = c;
        f[2] = dt;
        f[3] = time;
        u[4] = N;
        d.queue.writeBuffer(paramBuf, 0, params);
        const pass = enc.beginComputePass({ label: 'flow' });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(N / 256));
        pass.end();
      },
    };
  }

  slot(i) {
    while (this.viewSlots.length <= i) {
      const camBuf = this.buffer(80, GPUBufferUsage.UNIFORM);
      const bgBuf = this.buffer(48, GPUBufferUsage.UNIFORM);
      this.viewSlots.push({
        camBuf,
        bgBuf,
        camBind: this.bind(this.uniLayout, [camBuf]),
        bgBind: this.bind(this.uniLayout, [bgBuf]),
      });
    }
    return this.viewSlots[i];
  }

  points(max, external = null, externalCount = 0) {
    return new PointObj(this, max, external, externalCount);
  }

  surface(kind, res) {
    return new SurfaceObj(this, kind, res);
  }

  agents(consumers, N, K) {
    const d = this.device;
    const consBuf = this.buffer(consumers.byteLength, GPUBufferUsage.STORAGE);
    d.queue.writeBuffer(consBuf, 0, consumers);
    const outBuf = d.createBuffer({ size: N * K * 16, usage: GPUBufferUsage.STORAGE });
    const paramBuf = this.buffer(16, GPUBufferUsage.UNIFORM);
    const pipe = d.createComputePipeline({
      label: 'agents',
      layout: 'auto',
      compute: { module: this.module('agents', AGENTS), entryPoint: 'main' },
    });
    const bindGroup = this.bind(pipe.getBindGroupLayout(0), [paramBuf, consBuf, outBuf]);
    const params = new ArrayBuffer(16);
    const f = new Float32Array(params);
    const u = new Uint32Array(params);
    return {
      buffer: outBuf,
      count: N * K,
      encode(enc, income) {
        f[0] = income;
        u[1] = N;
        u[2] = K;
        d.queue.writeBuffer(paramBuf, 0, params);
        const pass = enc.beginComputePass({ label: 'agents' });
        pass.setPipeline(pipe);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(K);
        pass.end();
      },
    };
  }

  // views: [{ viewProj, bg: { inner, outer, center, radius } (device px), scissor (device px), objects, compute }]
  render(views) {
    const d = this.device;
    const W = this.canvas.width;
    const H = this.canvas.height;
    views.forEach((v, i) => {
      const s = this.slot(i);
      const cam = new Float32Array(20);
      cam.set(v.viewProj, 0);
      cam[16] = W;
      cam[17] = H;
      d.queue.writeBuffer(s.camBuf, 0, cam);
      const { inner, outer, center, radius } = v.bg;
      d.queue.writeBuffer(s.bgBuf, 0, new Float32Array([...inner, 1, ...outer, 1, center[0], center[1], radius, 0]));
      for (const o of v.objects) o.upload();
    });

    const enc = d.createCommandEncoder();
    for (const v of views) if (v.compute) v.compute(enc);
    const pass = enc.beginRenderPass({
      colorAttachments: [{
        view: this.msaaView,
        resolveTarget: this.ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'discard',
      }],
    });

    views.forEach((v, i) => {
      const s = this.viewSlots[i];
      const sc = v.scissor;
      const x0 = Math.max(0, Math.floor(sc.x));
      const y0 = Math.max(0, Math.floor(sc.y));
      const x1 = Math.min(W, Math.ceil(sc.x + sc.w));
      const y1 = Math.min(H, Math.ceil(sc.y + sc.h));
      if (x1 <= x0 || y1 <= y0) return;
      pass.setScissorRect(x0, y0, x1 - x0, y1 - y0);
      pass.setPipeline(this.pipes.bg);
      pass.setBindGroup(0, s.bgBind);
      pass.draw(3);
      pass.setBindGroup(0, s.camBind);
      for (const o of v.objects) o.draw(pass);
    });
    pass.end();
    d.queue.submit([enc.finish()]);
  }
}

class LineObj {
  constructor(r, max, external) {
    this.r = r;
    this.max = max;
    this.count = external ? max : 0;
    this.ubuf = r.buffer(48, GPUBufferUsage.UNIFORM);
    this.sbuf = external ?? r.buffer(max * 32, GPUBufferUsage.STORAGE);
    this.bindGroup = r.bind(r.objLayout, [this.ubuf, this.sbuf]);
    this.u = new Float32Array(12);
    this.color = [0, 0, 0, 1];
    this.offset = [0, 0, 0];
    this.width = 2;
    this.opacity = 1;
    this.reveal = 1e6;
  }

  set(segs) {
    this.count = Math.min(segs.length / 8, this.max);
    this.r.device.queue.writeBuffer(this.sbuf, 0, segs, 0, this.count * 8);
  }

  upload() {
    const u = this.u;
    u.set(this.color, 0);
    u.set(this.offset, 4);
    u[8] = this.width;
    u[9] = this.opacity;
    u[10] = this.reveal;
    this.r.device.queue.writeBuffer(this.ubuf, 0, u);
  }

  draw(pass) {
    if (!this.count || this.opacity < 0.003) return;
    pass.setPipeline(this.r.pipes.line);
    pass.setBindGroup(1, this.bindGroup);
    pass.draw(6, this.count);
  }
}

class PointObj {
  constructor(r, max, external, externalCount) {
    this.r = r;
    this.max = max;
    this.count = external ? externalCount : 0;
    this.ubuf = r.buffer(64, GPUBufferUsage.UNIFORM);
    this.sbuf = external ?? r.buffer(max * 16, GPUBufferUsage.STORAGE);
    this.bindGroup = r.bind(r.objLayout, [this.ubuf, this.sbuf]);
    this.u = new Float32Array(16);
    this.color = [0, 0, 0, 1];
    this.scale = [1, 1, 1];
    this.offset = [0, 0, 0];
    this.size = 8;
    this.opacity = 1;
    this.reveal = 1e6;
    this.mode = 0;
    this.additive = false;
  }

  set(pts) {
    this.count = Math.min(pts.length / 4, this.max);
    this.r.device.queue.writeBuffer(this.sbuf, 0, pts, 0, this.count * 4);
  }

  upload() {
    const u = this.u;
    u.set(this.color, 0);
    u.set(this.scale, 4);
    u.set(this.offset, 8);
    u[12] = this.size;
    u[13] = this.opacity;
    u[14] = this.reveal;
    u[15] = this.mode;
    this.r.device.queue.writeBuffer(this.ubuf, 0, u);
  }

  draw(pass) {
    if (!this.count || this.opacity < 0.003) return;
    pass.setPipeline(this.additive ? this.r.pipes.pointAdd : this.r.pipes.point);
    pass.setBindGroup(1, this.bindGroup);
    pass.draw(6, this.count);
  }
}

class SurfaceObj {
  constructor(r, kind, res) {
    this.r = r;
    this.kind = kind;
    this.res = res;
    this.ubuf = r.buffer(48, GPUBufferUsage.UNIFORM);
    this.bindGroup = r.bind(r.uniLayout, [this.ubuf]);
    this.u = new Float32Array(12);
    this.color = [0, 0, 0, 0.2];
    this.line = [0, 0, 0, 0.4];
    this.opacity = 1;
  }

  upload() {
    const u = this.u;
    u.set(this.color, 0);
    u.set(this.line, 4);
    u[8] = this.kind;
    u[9] = this.param ?? 0;
    u[10] = this.opacity;
    u[11] = this.res;
    this.r.device.queue.writeBuffer(this.ubuf, 0, u);
  }

  draw(pass) {
    if (this.opacity < 0.003) return;
    pass.setPipeline(this.r.pipes.surface);
    pass.setBindGroup(1, this.bindGroup);
    pass.draw((this.res - 1) * (this.res - 1) * 6);
  }
}
