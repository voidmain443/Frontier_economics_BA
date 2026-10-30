// Solid geometry for the maquettes: a minimal GLB reader for the Blender models,
// and the plain cylinder and box that stand in when a model is missing. Every
// geometry is { pos: Float32Array, nrm: Float32Array, idx: Uint32Array }, +Y up.

const TAU = Math.PI * 2;

function builder() {
  const pos = [];
  const nrm = [];
  const idx = [];
  return {
    v(p, n) {
      pos.push(p[0], p[1], p[2]);
      nrm.push(n[0], n[1], n[2]);
      return pos.length / 3 - 1;
    },
    tri(a, b, c) { idx.push(a, b, c); },
    quad(a, b, c, d) { idx.push(a, b, c, a, c, d); },
    done: () => ({ pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint32Array(idx) }),
  };
}

const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// Cylinder of radius r from y = 0 to y = h. caps: [bottom, top].
export function cylinder(r = 1, h = 1, seg = 40, caps = [true, true]) {
  const B = builder();
  const ring = (y) => Array.from({ length: seg + 1 }, (_, i) => {
    const a = (i / seg) * TAU;
    return B.v([r * Math.cos(a), y, r * Math.sin(a)], [Math.cos(a), 0, Math.sin(a)]);
  });
  const lo = ring(0);
  const hi = ring(h);
  for (let i = 0; i < seg; i++) B.quad(lo[i], hi[i], hi[i + 1], lo[i + 1]);
  const cap = (y, up) => {
    const c = B.v([0, y, 0], [0, up ? 1 : -1, 0]);
    const rim = Array.from({ length: seg + 1 }, (_, i) => {
      const a = (i / seg) * TAU;
      return B.v([r * Math.cos(a), y, r * Math.sin(a)], [0, up ? 1 : -1, 0]);
    });
    for (let i = 0; i < seg; i++) (up ? B.tri(c, rim[i + 1], rim[i]) : B.tri(c, rim[i], rim[i + 1]));
  };
  if (caps[0]) cap(0, false);
  if (caps[1]) cap(h, true);
  return B.done();
}

export function box(w = 1, h = 1, d = 1) {
  const B = builder();
  const x = w / 2;
  const z = d / 2;
  const faces = [
    [[0, 1, 0], [[-x, h, -z], [-x, h, z], [x, h, z], [x, h, -z]]],
    [[0, -1, 0], [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z]]],
    [[1, 0, 0], [[x, 0, -z], [x, h, -z], [x, h, z], [x, 0, z]]],
    [[-1, 0, 0], [[-x, 0, -z], [-x, 0, z], [-x, h, z], [-x, h, -z]]],
    [[0, 0, 1], [[-x, 0, z], [x, 0, z], [x, h, z], [-x, h, z]]],
    [[0, 0, -1], [[-x, 0, -z], [-x, h, -z], [x, h, -z], [x, 0, -z]]],
  ];
  for (const [n, q] of faces) {
    const ids = q.map((p) => B.v(p, n));
    B.quad(...ids);
  }
  return B.done();
}

// ---------- GLB ----------

const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function nodeMatrix(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

// → [{ node, material, geometry }]; node transforms are baked in.
export async function loadGLB(url) {
  // revalidate, so that a rebuilt model is not served stale from the cache
  const buf = await (await fetch(url, { cache: 'no-cache' })).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error(`${url} is not a GLB file`);
  let off = 12;
  let json = null;
  let bin = null;
  while (off < buf.byteLength) {
    const len = dv.getUint32(off, true);
    const type = dv.getUint32(off + 4, true);
    const body = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === 0x004e4942) bin = body;
    off += 8 + len;
  }
  const acc = (i) => {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const C = COMP[a.componentType];
    const n = a.count * SIZE[a.type];
    const start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const stride = bv.byteStride;
    if (!stride || stride === C.BYTES_PER_ELEMENT * SIZE[a.type]) return new C(bin.slice(start, start + n * C.BYTES_PER_ELEMENT));
    const out = new C(n);
    const view = new DataView(bin);
    for (let k = 0; k < a.count; k++) for (let j = 0; j < SIZE[a.type]; j++) out[k * SIZE[a.type] + j] = view.getFloat32(start + k * stride + j * 4, true);
    return out;
  };
  const parts = [];
  const visit = (ni, parent) => {
    const n = json.nodes[ni];
    const m = mul(parent, nodeMatrix(n));
    if (n.mesh != null) {
      for (const pr of json.meshes[n.mesh].primitives) {
        const P = acc(pr.attributes.POSITION);
        const N = acc(pr.attributes.NORMAL);
        const I = pr.indices != null ? Uint32Array.from(acc(pr.indices)) : Uint32Array.from({ length: P.length / 3 }, (_, i) => i);
        const pos = new Float32Array(P.length);
        const nrm = new Float32Array(N.length);
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i];
          const y = P[i + 1];
          const z = P[i + 2];
          pos[i] = m[0] * x + m[4] * y + m[8] * z + m[12];
          pos[i + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
          pos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
          const nn = norm([m[0] * N[i] + m[4] * N[i + 1] + m[8] * N[i + 2], m[1] * N[i] + m[5] * N[i + 1] + m[9] * N[i + 2], m[2] * N[i] + m[6] * N[i + 1] + m[10] * N[i + 2]]);
          nrm.set(nn, i);
        }
        const material = pr.material != null ? json.materials[pr.material].name ?? '' : '';
        parts.push({ node: n.name ?? '', material, geometry: { pos, nrm, idx: I } });
      }
    }
    for (const c of n.children ?? []) visit(c, m);
  };
  const scene = json.scenes[json.scene ?? 0];
  for (const ni of scene.nodes) visit(ni, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return parts;
}

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
