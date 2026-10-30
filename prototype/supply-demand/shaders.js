// WGSL 셰이더. 출력은 모두 premultiplied alpha.

const CAMERA = /* wgsl */ `
struct Camera { viewProj: mat4x4f, viewport: vec2f, pad: vec2f };
@group(0) @binding(0) var<uniform> cam: Camera;
`;

// 화면 공간 굵은 선: 선분 하나 = 인스턴스 하나 = 사각형 하나
export const LINE = CAMERA + /* wgsl */ `
struct LineU { color: vec4f, offset: vec4f, width: f32, opacity: f32, reveal: f32, pad: f32 };
@group(1) @binding(0) var<uniform> lu: LineU;
@group(1) @binding(1) var<storage, read> segs: array<vec4f>;

struct VO { @builtin(position) pos: vec4f, @location(0) d: f32, @location(1) rz: f32 };

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let ra = segs[ii * 2u].xyz;
  let rb = segs[ii * 2u + 1u].xyz;
  let a = cam.viewProj * vec4f(ra + lu.offset.xyz, 1.0);
  let b = cam.viewProj * vec4f(rb + lu.offset.xyz, 1.0);
  let half = cam.viewport * 0.5;
  let sa = a.xy / a.w * half;
  let sb = b.xy / b.w * half;
  let delta = sb - sa;
  let len = length(delta);
  var dir = vec2f(1.0, 0.0);
  if (len > 1e-4) { dir = delta / len; }
  let n = vec2f(-dir.y, dir.x);
  var corners = array<vec2f, 6>(
    vec2f(0.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(0.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = corners[vi];
  let hw = lu.width * 0.5 + 1.0;
  var p = a;
  var rz = ra.z;
  if (c.x > 0.5) { p = b; rz = rb.z; }
  let px = n * hw * c.y + dir * hw * 0.5 * (c.x * 2.0 - 1.0);
  var o: VO;
  o.pos = p + vec4f(px / half * p.w, 0.0, 0.0);
  o.d = c.y * hw;
  o.rz = rz;
  return o;
}

@fragment fn fs(i: VO) -> @location(0) vec4f {
  if (i.rz > lu.reveal) { discard; }
  let a = clamp(lu.width * 0.5 + 0.5 - abs(i.d), 0.0, 1.0) * lu.color.a * lu.opacity;
  return vec4f(lu.color.rgb * a, a);
}
`;

// 원형 점 (SDF). mode 1이면 w 성분으로 색을 칠한다(소비자 구름).
export const POINT = CAMERA + /* wgsl */ `
struct PointU { color: vec4f, scale: vec4f, offset: vec4f, size: f32, opacity: f32, reveal: f32, mode: f32 };
@group(1) @binding(0) var<uniform> pu: PointU;
@group(1) @binding(1) var<storage, read> pts: array<vec4f>;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) col: vec4f };

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let d = pts[ii];
  let w = d.xyz * pu.scale.xyz + pu.offset.xyz;
  let c = cam.viewProj * vec4f(w, 1.0);
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let q = corners[vi];
  let r = pu.size * 0.5 + 1.0;
  var o: VO;
  o.pos = c + vec4f(q * r / (cam.viewport * 0.5) * c.w, 0.0, 0.0);
  o.uv = q * r;
  var col = pu.color.rgb;
  if (pu.mode > 0.5) { col = mix(vec3f(0.30, 0.55, 1.0), vec3f(1.0, 0.72, 0.30), d.w); }
  var a = pu.color.a * pu.opacity;
  if (d.z > pu.reveal) { a = 0.0; }
  o.col = vec4f(col, a);
  return o;
}

@fragment fn fs(i: VO) -> @location(0) vec4f {
  let a = clamp(pu.size * 0.5 + 0.5 - length(i.uv), 0.0, 1.0) * i.col.a;
  if (a <= 0.002) { discard; }
  return vec4f(i.col.rgb * a, a);
}
`;

// 매개변수 곡면. kind 0 = 수요 곡면 Q = 20I/P, kind 1 = 공급 시트 Q = P − 1
// 좌표: x = Q/10, y = P/10, z = I − 1
export const SURFACE = CAMERA + /* wgsl */ `
struct SurfU { color: vec4f, line: vec4f, p: vec4f };
@group(1) @binding(0) var<uniform> su: SurfU;

struct VO { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) pi: vec2f };

@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  let cells = u32(su.p.w) - 1u;
  let quad = vi / 6u;
  let corner = vi % 6u;
  var offs = array<vec2u, 6>(
    vec2u(0u, 0u), vec2u(1u, 0u), vec2u(1u, 1u),
    vec2u(0u, 0u), vec2u(1u, 1u), vec2u(0u, 1u));
  let g = vec2u(quad % cells, quad / cells) + offs[corner];
  let u = f32(g.x) / f32(cells);
  let v = f32(g.y) / f32(cells);
  var wp = vec3f(0.0);
  var pi = vec2f(0.0);
  if (su.p.x < 1.5) {
    let inc = mix(0.5, 1.5, v);
    var price = 0.0;
    var qty = 0.0;
    if (su.p.x < 0.5) {
      price = mix(2.0 * inc, 10.0, u);
      qty = 20.0 * inc / price;
    } else {
      price = mix(1.0, 10.0, u);
      qty = price - 1.0;
    }
    wp = vec3f(qty / 10.0, price / 10.0, inc - 1.0);
    pi = vec2f(price, inc);
  } else {
    // kind 2: 두 시장 가격 조정의 퍼텐셜 V(p) = ½ dᵀ(−A)d,  A = [[−1, c], [c, −1]]
    let p = vec2f(10.0 * u, 10.0 * v);
    let pot = potential(p, su.p.y);
    wp = vec3f(p.x / 10.0, potentialHeight(pot), p.y / 10.0 - 0.5);
    pi = vec2f(pot / 2.5, p.x / 10.0);
  }
  var o: VO;
  o.pos = cam.viewProj * vec4f(wp, 1.0);
  o.wp = wp;
  o.pi = pi;
  return o;
}

fn potential(p: vec2f, c: f32) -> f32 {
  let d = p - vec2f(5.0);
  return 0.5 * (d.x * d.x - 2.0 * c * d.x * d.y + d.y * d.y);
}

fn potentialHeight(v: f32) -> f32 {
  return 0.45 + 0.4 * tanh(v / 20.0);
}

fn gridLine(x: f32) -> f32 {
  let w = max(fwidth(x), 1e-4);
  return 1.0 - min(abs(fract(x - 0.5) - 0.5) / w, 1.0);
}

@fragment fn fs(i: VO) -> @location(0) vec4f {
  let cr = cross(dpdx(i.wp), dpdy(i.wp));
  let n = cr / max(length(cr), 1e-12);
  let lam = 0.5 + 0.5 * abs(dot(n, normalize(vec3f(0.35, 0.85, 0.4))));
  let lines = max(gridLine(i.pi.x), gridLine(i.pi.y * 10.0));
  var rgb = mix(su.color.rgb * lam, su.line.rgb, lines * su.line.a);
  var a = max(su.color.a, lines * su.line.a) * su.p.z;
  return vec4f(rgb * a, a);
}
`;

// 배경: 전체 화면 삼각형 + 방사형 그라데이션 (scissor로 사각형만 칠한다)
export const BG = /* wgsl */ `
struct BgU { inner: vec4f, outer: vec4f, geo: vec4f };
@group(0) @binding(0) var<uniform> bgu: BgU;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

@fragment fn fs(@builtin(position) fc: vec4f) -> @location(0) vec4f {
  let t = clamp(length(fc.xy - bgu.geo.xy) / max(bgu.geo.z, 1.0), 0.0, 1.0);
  let c = mix(bgu.inner, bgu.outer, t * t);
  return vec4f(c.rgb * c.a, c.a);
}
`;

// 두 시장 가격 조정 dp/dt = A(p − p*) 위의 입자 흐름. 입자마다 꼬리 선분 하나를 낸다.
export const FLOW = /* wgsl */ `
struct FP { a: f32, c: f32, dt: f32, time: f32, n: u32, p0: u32, p1: u32, p2: u32 };
@group(0) @binding(0) var<uniform> fp: FP;
@group(0) @binding(1) var<storage, read_write> st: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> segsOut: array<vec4f>;

fn hash(u: u32) -> f32 {
  var x = u * 747796405u + 2891336453u;
  x = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
  x = (x >> 22u) ^ x;
  return f32(x) / 4294967295.0;
}

fn vel(p: vec2f) -> vec2f {
  let d = p - vec2f(5.0);
  return vec2f(-fp.a * d.x + fp.c * d.y, fp.c * d.x - fp.a * d.y);
}

fn world(p: vec2f) -> vec3f {
  let d = p - vec2f(5.0);
  let pot = 0.5 * (d.x * d.x - 2.0 * fp.c * d.x * d.y + d.y * d.y);
  return vec3f(p.x / 10.0, 0.45 + 0.4 * tanh(pot / 20.0) + 0.006, p.y / 10.0 - 0.5);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= fp.n) { return; }
  var s = st[i];
  s = vec4f(s.xy + vel(s.xy) * fp.dt, s.z + fp.dt, s.w);
  let outside = s.x < 0.0 || s.x > 10.0 || s.y < 0.0 || s.y > 10.0;
  if (outside || s.z > s.w || length(s.xy - vec2f(5.0)) < 0.06) {
    let seed = i * 9781u + u32(fp.time * 997.0);
    s = vec4f(hash(seed) * 10.0, hash(seed + 1u) * 10.0, 0.0, 1.5 + hash(seed + 2u) * 4.5);
  }
  st[i] = s;
  let v = vel(s.xy);
  let lv = length(v);
  var k = 0.0;
  if (lv > 1e-5) { k = min(0.07, 0.45 / lv); }
  segsOut[i * 2u] = vec4f(world(s.xy - v * k), 1.0);
  segsOut[i * 2u + 1u] = vec4f(world(s.xy), 1.0);
}
`;

// 소비자 집계: 가격 수준 하나 = 워크그룹 하나.
// 각 소비자의 최적 수요 qᵢ = wᵢ·I / P 를 구하고, 워크그룹 스캔으로 누적 합(수평 합)을 낸다.
// 출력: (누적 수량, 가격, 소비자 순번 i/N, 색)
export const AGENTS = /* wgsl */ `
struct CP { income: f32, n: u32, k: u32, pad: u32 };
@group(0) @binding(0) var<uniform> cp: CP;
@group(0) @binding(1) var<storage, read> cons: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> outp: array<vec4f>;

var<workgroup> sums: array<f32, 256>;

@compute @workgroup_size(256)
fn main(@builtin(workgroup_id) wg: vec3u, @builtin(local_invocation_index) li: u32) {
  let k = wg.x;
  let inc = cp.income;
  let price = mix(10.0, 2.0 * inc, f32(k) / f32(cp.k - 1u));
  let per = cp.n / 256u;
  let base = li * per;

  var local = 0.0;
  for (var j = 0u; j < per; j++) {
    local += cons[base + j].x * inc / price;
  }
  sums[li] = local;
  workgroupBarrier();

  for (var off = 1u; off < 256u; off = off * 2u) {
    var v = 0.0;
    if (li >= off) { v = sums[li - off]; }
    workgroupBarrier();
    sums[li] = sums[li] + v;
    workgroupBarrier();
  }

  var run = sums[li] - local;
  for (var j = 0u; j < per; j++) {
    let c = cons[base + j];
    run += c.x * inc / price;
    outp[k * cp.n + base + j] = vec4f(run, price, f32(base + j) / f32(cp.n), c.y);
  }
}
`;
