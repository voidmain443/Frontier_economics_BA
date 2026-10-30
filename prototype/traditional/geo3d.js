// Solid geometry for the bench: procedural parts (tanks, pipes, rods, springs)
// and a minimal GLB reader for the Blender maquettes. Every geometry is
// { pos: Float32Array, nrm: Float32Array, idx: Uint32Array }, +Y up.

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
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

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

export function sphere(r = 1, seg = 24) {
  const B = builder();
  const rows = [];
  for (let j = 0; j <= seg; j++) {
    const th = (j / seg) * Math.PI;
    const row = [];
    for (let i = 0; i <= seg * 2; i++) {
      const ph = (i / (seg * 2)) * TAU;
      const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      row.push(B.v([n[0] * r, n[1] * r, n[2] * r], n));
    }
    rows.push(row);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg * 2; i++) B.quad(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
  return B.done();
}

// Axis-aligned box with its base on y = 0.
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

// A tube of radius r swept along a polyline (parallel-transported frame).
export function tube(path, r = 0.01, seg = 12, caps = true) {
  const B = builder();
  const n = path.length;
  const T = path.map((p, i) => norm(sub(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])));
  let N = Math.abs(T[0][1]) < 0.9 ? norm(cross(T[0], [0, 1, 0])) : norm(cross(T[0], [1, 0, 0]));
  const rings = [];
  const frames = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) {
      const b = cross(T[i - 1], T[i]);
      if (Math.hypot(...b) > 1e-6) {
        // rotate N by the turn between consecutive tangents
        const axis = norm(b);
        const ang = Math.acos(Math.max(-1, Math.min(1, T[i - 1][0] * T[i][0] + T[i - 1][1] * T[i][1] + T[i - 1][2] * T[i][2])));
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        const d = axis[0] * N[0] + axis[1] * N[1] + axis[2] * N[2];
        const k = cross(axis, N);
        N = norm([N[0] * c + k[0] * s + axis[0] * d * (1 - c), N[1] * c + k[1] * s + axis[1] * d * (1 - c), N[2] * c + k[2] * s + axis[2] * d * (1 - c)]);
      }
    }
    const Bn = cross(T[i], N);
    const dirs = Array.from({ length: seg + 1 }, (_, j) => {
      const a = (j / seg) * TAU;
      return [N[0] * Math.cos(a) + Bn[0] * Math.sin(a), N[1] * Math.cos(a) + Bn[1] * Math.sin(a), N[2] * Math.cos(a) + Bn[2] * Math.sin(a)];
    });
    frames.push(dirs);
    rings.push(dirs.map((d) => B.v([path[i][0] + d[0] * r, path[i][1] + d[1] * r, path[i][2] + d[2] * r], d)));
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) B.quad(rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]);
  if (caps) {
    for (const [i, s] of [[0, -1], [n - 1, 1]]) {
      const t = T[i].map((v) => v * s);
      const c = B.v(path[i], t);
      const rim = frames[i].map((d) => B.v([path[i][0] + d[0] * r, path[i][1] + d[1] * r, path[i][2] + d[2] * r], t));
      for (let j = 0; j < seg; j++) (s > 0 ? B.tri(c, rim[j], rim[j + 1]) : B.tri(c, rim[j + 1], rim[j]));
    }
  }
  return B.done();
}

// A unit helix spring along +Y (length 1), wire radius rw, coil radius rc.
export function spring(coils = 8, rc = 0.25, rw = 0.04) {
  const pts = [];
  const n = coils * 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * coils * TAU;
    pts.push([rc * Math.cos(a), t, rc * Math.sin(a)]);
  }
  return tube(pts, rw, 6, false);
}

// Quarter-circle bends and straight runs for pipes: points at a fixed spacing.
export function polyline(points, step = 0.01, bend = 0.03) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const L = Math.hypot(...sub(b, a));
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push(a.map((v, j) => v + ((b[j] - v) * k) / n));
  }
  // round the corners by averaging neighbours over the bend length
  const r = Math.max(1, Math.round(bend / step));
  return out.map((p, i) => {
    if (i < r || i > out.length - 1 - r) return p;
    const acc = [0, 0, 0];
    for (let k = -r; k <= r; k++) for (let j = 0; j < 3; j++) acc[j] += out[i + k][j];
    return acc.map((v) => v / (2 * r + 1));
  });
}

export function merge(...gs) {
  let nv = 0;
  let ni = 0;
  for (const g of gs) {
    nv += g.pos.length;
    ni += g.idx.length;
  }
  const pos = new Float32Array(nv);
  const nrm = new Float32Array(nv);
  const idx = new Uint32Array(ni);
  let ov = 0;
  let oi = 0;
  for (const g of gs) {
    pos.set(g.pos, ov);
    nrm.set(g.nrm, ov);
    for (let i = 0; i < g.idx.length; i++) idx[oi + i] = g.idx[i] + ov / 3;
    ov += g.pos.length;
    oi += g.idx.length;
  }
  return { pos, nrm, idx };
}

export function transform(g, { t = [0, 0, 0], s = [1, 1, 1], ry = 0, rx = 0, rz = 0 } = {}) {
  const pos = new Float32Array(g.pos.length);
  const nrm = new Float32Array(g.nrm.length);
  const rot = (v) => {
    let [x, y, z] = v;
    if (rx) [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    if (rz) [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
    if (ry) [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    return [x, y, z];
  };
  for (let i = 0; i < g.pos.length; i += 3) {
    const p = rot([g.pos[i] * s[0], g.pos[i + 1] * s[1], g.pos[i + 2] * s[2]]);
    pos.set([p[0] + t[0], p[1] + t[1], p[2] + t[2]], i);
    nrm.set(norm(rot([g.nrm[i] / s[0], g.nrm[i + 1] / s[1], g.nrm[i + 2] / s[2]])), i);
  }
  return { pos, nrm, idx: g.idx };
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
  const buf = await (await fetch(url)).arrayBuffer();
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
