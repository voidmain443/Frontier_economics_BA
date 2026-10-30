// WGSL for the unfolded page. Every scene pass writes two targets: the colour,
// and an emissive channel that the bloom pass blurs and adds back.
// All passes share one ribbon: the sheet tilts back about the reading line and
// the part already read curls up into a wall.

export const COMMON = /* wgsl */ `
struct Cam {
  viewProj: mat4x4f,
  eye: vec4f,
  viewport: vec2f,
  focus: f32,
  docW: f32,
  t: f32,
  px: f32,
  k: f32,
  u0: f32,
  theta: f32,
  fog: f32,
  time: f32,
  pad1: f32,
  // the bench light: straight down the page normal, so a shadow is a projection
  lightVP: mat4x4f,
  light: vec4f,
};
@group(0) @binding(0) var<uniform> cam: Cam;

struct FO { @location(0) color: vec4f, @location(1) glow: vec4f };

// (a, n, phi): position along and off the page plane for along-page offset u.
fn bendAN(u: f32) -> vec3f {
  let kk = cam.k * cam.t;
  let w = -u - cam.u0;
  if (kk < 1e-5 || w <= 0.0) { return vec3f(u, 0.0, 0.0); }
  let L = cam.theta / kk;
  let s = min(w, L);
  let phi = kk * s;
  var a = -cam.u0 - sin(phi) / kk;
  var n = (1.0 - cos(phi)) / kk;
  if (w > L) {
    let r = w - L;
    a -= cos(cam.theta) * r;
    n += sin(cam.theta) * r;
  }
  return vec3f(a, n, phi);
}

fn pageDirs() -> mat2x3f {
  let tau = (1.0 - cam.t) * 1.5707963;
  return mat2x3f(vec3f(0.0, -sin(tau), cos(tau)), vec3f(0.0, cos(tau), sin(tau)));
}

fn ribbonPos(xpx: f32, spx: f32) -> vec3f {
  let b = bendAN((spx - cam.focus) * cam.px);
  let d = pageDirs();
  return vec3f((xpx - cam.docW * 0.5) * cam.px, 0.0, 0.0) + d[0] * b.x + d[1] * b.y;
}

fn ribbonNormal(spx: f32) -> vec3f {
  let phi = bendAN((spx - cam.focus) * cam.px).z;
  let d = pageDirs();
  return d[0] * sin(phi) + d[1] * cos(phi);
}

// space 0: world. space 1: figure-local (a, b in the plot box, h in plot widths).
// hs scales heights, so a construct can grow out of the page.
fn toWorld(p: vec3f, box: vec4f, space: f32, hs: f32) -> vec3f {
  if (space < 0.5) { return p; }
  let xp = mix(box.x, box.z, p.x);
  let sp = mix(box.w, box.y, p.y);
  return ribbonPos(xp, sp) + ribbonNormal(sp) * (p.z * hs * (box.z - box.x) * cam.px);
}

fn fogMix(wp: vec3f) -> f32 {
  return clamp((distance(wp, cam.eye.xyz) - 2.5) / 7.0, 0.0, 0.8) * cam.fog;
}

fn spotOut(page: vec2f, spot: vec4f) -> f32 {
  let dx = max(max(spot.x - page.x, page.x - spot.z), 0.0);
  let dy = max(max(spot.y - page.y, page.y - spot.w), 0.0);
  return smoothstep(0.0, 80.0, max(dx, dy));
}
`;

// The sheet itself, one draw per tile, textured from html-in-canvas.
export const TILE = COMMON + /* wgsl */ `
// params: (opacity, segments, spotlight strength, _); spot: the page rect kept lit during a dive
struct TileU { rect: vec4f, params: vec4f, fogColor: vec4f, spot: vec4f };
@group(1) @binding(0) var<uniform> tu: TileU;
@group(1) @binding(1) var tex: texture_2d<f32>;
@group(1) @binding(2) var samp: sampler;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) wp: vec3f, @location(2) page: vec2f };

@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  let seg = vi / 6u;
  var cs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi % 6u];
  let v = (f32(seg) + c.y) / tu.params.y;
  let page = vec2f(mix(tu.rect.x, tu.rect.z, c.x), mix(tu.rect.y, tu.rect.w, v));
  let wp = ribbonPos(page.x, page.y);
  var o: VO;
  o.pos = cam.viewProj * vec4f(wp, 1.0);
  o.uv = vec2f(c.x, v);
  o.wp = wp;
  o.page = page;
  return o;
}

@fragment fn fs(i: VO) -> FO {
  let c = textureSample(tex, samp, i.uv);
  let f = max(fogMix(i.wp), tu.params.z * 0.82 * spotOut(i.page, tu.spot));
  let rgb = mix(c.rgb, tu.fogColor.rgb * c.a, f);
  var o: FO;
  o.color = vec4f(rgb, c.a) * tu.params.x;
  o.glow = vec4f(0.0);
  return o;
}
`;

// Lit translucent surfaces with contour lines (the folded-away dimensions).
export const MESH = COMMON + /* wgsl */ `
struct MeshU { box: vec4f, color: vec4f, line: vec4f, p: vec4f };
@group(1) @binding(0) var<uniform> mu: MeshU;

struct VI { @location(0) pos: vec3f, @location(1) attr: vec2f };
struct VO { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) attr: vec2f };

@vertex fn vs(v: VI) -> VO {
  let wp = toWorld(v.pos, mu.box, mu.p.z, mu.p.w);
  var o: VO;
  o.pos = cam.viewProj * vec4f(wp, 1.0);
  o.wp = wp;
  o.attr = v.attr;
  return o;
}

@fragment fn fs(i: VO) -> FO {
  let cr = cross(dpdx(i.wp), dpdy(i.wp));
  let n = cr / max(length(cr), 1e-12);
  let lam = 0.55 + 0.45 * abs(dot(n, normalize(vec3f(0.3, 0.9, 0.45))));
  let f = i.attr.x * mu.p.y;
  let w = max(fwidth(f), 1e-4);
  let line = (1.0 - min(abs(fract(f - 0.5) - 0.5) / w, 1.0)) * step(0.0001, mu.p.y);
  // fresnel: the surface brightens where it turns edge-on to the eye
  let view = normalize(cam.eye.xyz - i.wp);
  let fres = pow(1.0 - abs(dot(n, view)), 3.0);
  let rgb = mix(mu.color.rgb * lam + mu.line.rgb * fres * 0.35, mu.line.rgb, line * mu.line.a);
  let a = max(mu.color.a + fres * 0.12, line * mu.line.a) * mu.p.x * i.attr.y;
  var o: FO;
  o.color = vec4f(rgb * a, a);
  o.glow = vec4f(mu.line.rgb * (line * mu.line.a * 0.55 + fres * 0.08) * mu.p.x * i.attr.y, 0.0);
  return o;
}
`;

// Screen-space wide lines, one instance per segment. q.x: glow strength.
export const LINE = COMMON + /* wgsl */ `
struct LineU { box: vec4f, color: vec4f, p: vec4f, q: vec4f };
@group(1) @binding(0) var<uniform> lu: LineU;
@group(1) @binding(1) var<storage, read> segs: array<vec4f>;

struct VO { @builtin(position) pos: vec4f, @location(0) d: f32, @location(1) along: f32, @location(2) fade: f32 };

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let ra = segs[ii * 2u];
  let rb = segs[ii * 2u + 1u];
  let a = cam.viewProj * vec4f(toWorld(ra.xyz, lu.box, lu.p.z, lu.color.a), 1.0);
  let b = cam.viewProj * vec4f(toWorld(rb.xyz, lu.box, lu.p.z, lu.color.a), 1.0);
  let half = cam.viewport * 0.5;
  let sa = a.xy / a.w * half;
  let sb = b.xy / b.w * half;
  let delta = sb - sa;
  let len = length(delta);
  var dir = vec2f(1.0, 0.0);
  if (len > 1e-4) { dir = delta / len; }
  let nrm = vec2f(-dir.y, dir.x);
  var cs = array<vec2f, 6>(vec2f(0.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, -1.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi % 6u];
  let hw = lu.p.y * 0.5 + 1.0;
  var p = a;
  var fade = ra.w;
  if (c.x > 0.5) { p = b; fade = rb.w; }
  let off = nrm * hw * c.y + dir * hw * 0.5 * (c.x * 2.0 - 1.0);
  var o: VO;
  o.pos = p + vec4f(off / half * p.w, 0.0, 0.0);
  o.d = c.y * hw;
  o.along = c.x * len;
  o.fade = fade;
  return o;
}

@fragment fn fs(i: VO) -> FO {
  if (lu.p.w > 0.5 && fract(i.along / 14.0) > 0.55) { discard; }
  let a = clamp(lu.p.y * 0.5 + 0.5 - abs(i.d), 0.0, 1.0) * lu.p.x * clamp(i.fade, 0.0, 1.0);
  var o: FO;
  o.color = vec4f(lu.color.rgb * a, a);
  o.glow = vec4f(lu.color.rgb * a * lu.q.x, 0.0);
  return o;
}
`;

// Round points with a soft halo. w of each point scales its size.
export const POINT = COMMON + /* wgsl */ `
struct PointU { box: vec4f, color: vec4f, p: vec4f };
@group(1) @binding(0) var<uniform> pu: PointU;
@group(1) @binding(1) var<storage, read> pts: array<vec4f>;

struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) r: f32 };

@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VO {
  let d = pts[ii];
  let c = cam.viewProj * vec4f(toWorld(d.xyz, pu.box, pu.p.z, pu.color.a), 1.0);
  var cs = array<vec2f, 6>(vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  let q = cs[vi % 6u];
  let r = pu.p.y * max(d.w, 0.0001) * 0.5;
  let ext = r * (1.0 + pu.p.w * 3.0) + 1.0;
  var o: VO;
  o.pos = c + vec4f(q * ext / (cam.viewport * 0.5) * c.w, 0.0, 0.0);
  o.uv = q * ext;
  o.r = r;
  return o;
}

@fragment fn fs(i: VO) -> FO {
  let d = length(i.uv);
  let core = clamp(i.r + 0.5 - d, 0.0, 1.0);
  let halo = pu.p.w * 0.35 * exp(-max(d - i.r, 0.0) / max(i.r * 1.2, 1.0));
  let a = max(core, halo) * pu.p.x;
  if (a <= 0.003) { discard; }
  var o: FO;
  o.color = vec4f(pu.color.rgb * a, a);
  o.glow = vec4f(pu.color.rgb * core * pu.p.x * (0.5 + pu.p.w), 0.0);
  return o;
}
`;

// Background: cyanotype gradient (flat desk colour at t = 0) with a slow drift of
// drafting dust, so the space reads as deep rather than painted.
export const BG = /* wgsl */ `
struct BgU { inner: vec4f, outer: vec4f, geo: vec4f };
@group(0) @binding(0) var<uniform> bgu: BgU;
struct FO { @location(0) color: vec4f, @location(1) glow: vec4f };

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vi], 0.0, 1.0);
}

fn hash2(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
}

@fragment fn fs(@builtin(position) fc: vec4f) -> FO {
  let t = clamp(length(fc.xy - bgu.geo.xy) / max(bgu.geo.z, 1.0), 0.0, 1.0);
  var c = mix(bgu.inner, bgu.outer, t * t).rgb;
  // drafting dust: sparse specks that twinkle slowly, only once the page has unfolded
  let cell = floor(fc.xy / 6.0);
  let h = hash2(cell);
  let tw = 0.5 + 0.5 * sin(bgu.geo.w * 0.7 + h * 40.0);
  let speck = step(0.9965, h) * tw * bgu.inner.a;
  c += vec3f(0.55, 0.7, 0.9) * speck * 0.35;
  var o: FO;
  o.color = vec4f(c, 1.0);
  o.glow = vec4f(vec3f(0.55, 0.7, 0.9) * speck * 0.6, 0.0);
  return o;
}
`;

// Mip chain generation: downsample level i-1 into level i.
export const MIP = /* wgsl */ `
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

// Bloom: separable 9-tap Gaussian (linear-sampled), and the final composite.
const FULLSCREEN = /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var o: VO;
  o.pos = vec4f(p[vi], 0.0, 1.0);
  o.uv = vec2f(p[vi].x * 0.5 + 0.5, 0.5 - p[vi].y * 0.5);
  return o;
}
`;

export const BLUR = FULLSCREEN + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> dir: vec4f;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let o1 = 1.3846153846;
  let o2 = 3.2307692308;
  var c = textureSample(src, samp, i.uv) * 0.2270270270;
  c += textureSample(src, samp, i.uv + dir.xy * o1) * 0.3162162162;
  c += textureSample(src, samp, i.uv - dir.xy * o1) * 0.3162162162;
  c += textureSample(src, samp, i.uv + dir.xy * o2) * 0.0702702703;
  c += textureSample(src, samp, i.uv - dir.xy * o2) * 0.0702702703;
  return c;
}
`;

export const COPY = FULLSCREEN + /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@fragment fn fs(i: VO) -> @location(0) vec4f { return textureSample(src, samp, i.uv); }
`;

export const COMPOSITE = FULLSCREEN + /* wgsl */ `
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var glowA: texture_2d<f32>;
@group(0) @binding(2) var glowB: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;
@group(0) @binding(4) var<uniform> k: vec4f;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let c = textureSample(scene, samp, i.uv);
  let g = textureSample(glowA, samp, i.uv).rgb * k.x + textureSample(glowB, samp, i.uv).rgb * k.y;
  // a gentle shoulder so stacked glow never clips to flat white
  let rgb = c.rgb + g * (1.0 - 0.5 * c.rgb);
  // vignette, only once unfolded
  let v = 1.0 - k.z * 0.35 * pow(length(i.uv - vec2f(0.5)) * 1.3, 2.4);
  return vec4f(rgb * v, 1.0);
}
`;

// ---------- the maquettes and their shadows ----------

// Shadow lookup with contact-hardening penumbrae: a blocker search sets the
// filter width, so a shadow is sharp where an object touches the page and
// softens with height, the way light falls in a studio.
const SHADOWFN = /* wgsl */ `
@group(2) @binding(0) var shadowMap: texture_depth_2d;
@group(2) @binding(1) var shadowCmp: sampler_comparison;

fn shadowAt(wp: vec3f) -> f32 {
  let lp = cam.lightVP * vec4f(wp, 1.0);
  let uv = vec2f(lp.x * 0.5 + 0.5, 0.5 - lp.y * 0.5);
  let z = lp.z - 0.0008;
  let dim = vec2f(textureDimensions(shadowMap));
  let inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0) * step(z, 1.0);
  // blocker search
  var blk = 0.0;
  var nb = 0.0;
  for (var i = -2; i <= 2; i++) {
    for (var j = -2; j <= 2; j++) {
      let q = clamp(vec2i((uv + vec2f(f32(i), f32(j)) * 3.0 / dim) * dim), vec2i(0), vec2i(dim) - 1);
      let d = textureLoad(shadowMap, q, 0);
      if (d < z) { blk += d; nb += 1.0; }
    }
  }
  if (nb < 0.5) { return 1.0; }
  let pen = clamp((z - blk / nb) * 260.0, 0.6, 9.0);
  var sum = 0.0;
  for (var i = -3; i <= 3; i++) {
    for (var j = -3; j <= 3; j++) {
      let o = vec2f(f32(i), f32(j)) * pen / 3.0 / dim;
      sum += textureSampleCompareLevel(shadowMap, shadowCmp, uv + o, z);
    }
  }
  return mix(1.0, sum / 49.0, inside * cam.light.w);
}
`;

const SOLID_VS = /* wgsl */ `
struct Inst { model: mat4x4f, color: vec4f, p: vec4f };
@group(1) @binding(0) var<storage, read> inst: array<Inst>;

struct VI { @location(0) pos: vec3f, @location(1) nrm: vec3f };
struct VO { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) @interpolate(flat) ii: u32 };

@vertex fn vs(v: VI, @builtin(instance_index) ii: u32) -> VO {
  let m = inst[ii].model;
  let wp = (m * vec4f(v.pos, 1.0)).xyz;
  var o: VO;
  o.pos = cam.viewProj * vec4f(wp, 1.0);
  o.wp = wp;
  // inverse-transpose for a basis of orthogonal, unequally scaled axes
  let ax = m[0].xyz;
  let ay = m[1].xyz;
  let az = m[2].xyz;
  o.n = normalize(ax * (v.nrm.x / max(dot(ax, ax), 1e-12)) + ay * (v.nrm.y / max(dot(ay, ay), 1e-12)) + az * (v.nrm.z / max(dot(az, az), 1e-12)));
  o.ii = ii;
  return o;
}
`;

// Plaster (white study models), ink rods, and water: lit by a soft sky, the
// overhead key light with its shadow, and a dim fill from the viewer.
export const SOLID = COMMON + SHADOWFN + SOLID_VS + /* wgsl */ `
@fragment fn fs(i: VO, @builtin(front_facing) ff: bool) -> FO {
  let it = inst[i.ii];
  var n = normalize(i.n);
  if (!ff) { n = -n; }
  let v = normalize(cam.eye.xyz - i.wp);
  let L = -cam.light.xyz;
  let sh = shadowAt(i.wp + n * 0.0015);
  let sky = mix(vec3f(0.42, 0.47, 0.55), vec3f(0.92, 0.95, 1.0), n.y * 0.5 + 0.5);
  let key = max(dot(n, L), 0.0) * sh;
  let fill = max(dot(n, v), 0.0);
  let wrap = max(dot(n, normalize(vec3f(-0.6, 0.35, 0.7))), 0.0);
  var rgb = it.color.rgb * (sky * 0.5 + key * 0.48 + fill * 0.16 + wrap * 0.14);
  // a polished material (water, ink) picks up a highlight of the overhead light
  let h = normalize(L + v);
  rgb += vec3f(1.0) * pow(max(dot(n, h), 0.0), 60.0) * it.p.x * sh;
  rgb += it.color.rgb * it.p.z;
  let f = fogMix(i.wp);
  rgb = mix(rgb, vec3f(0.03, 0.09, 0.17), f);
  let a = it.color.a * it.p.y;
  var o: FO;
  o.color = vec4f(rgb * a, a);
  o.glow = vec4f(0.0);
  return o;
}
`;

// Depth only, from the light.
export const DEPTH = COMMON + /* wgsl */ `
struct Inst { model: mat4x4f, color: vec4f, p: vec4f };
@group(1) @binding(0) var<storage, read> inst: array<Inst>;
struct VI { @location(0) pos: vec3f, @location(1) nrm: vec3f };
@vertex fn vs(v: VI, @builtin(instance_index) ii: u32) -> @builtin(position) vec4f {
  let m = inst[ii].model;
  return cam.lightVP * (m * vec4f(v.pos, 1.0));
}
`;

// The bench under the page and beside it: invisible except where something
// stands on it, so every object is grounded by its own shadow.
export const CATCHER = COMMON + SHADOWFN + /* wgsl */ `
struct CatchU { rect: vec4f, p: vec4f };
@group(1) @binding(0) var<uniform> cu: CatchU;
struct VO { @builtin(position) pos: vec4f, @location(0) wp: vec3f, @location(1) page: vec2f };

@vertex fn vs(@builtin(vertex_index) vi: u32) -> VO {
  let seg = vi / 6u;
  var cs = array<vec2f, 6>(vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 0.0), vec2f(1.0, 1.0), vec2f(0.0, 1.0));
  let c = cs[vi % 6u];
  let v = (f32(seg) + c.y) / cu.p.y;
  let page = vec2f(mix(cu.rect.x, cu.rect.z, c.x), mix(cu.rect.y, cu.rect.w, v));
  let wp = ribbonPos(page.x, page.y) + ribbonNormal(page.y) * 0.0003;
  var o: VO;
  o.pos = cam.viewProj * vec4f(wp, 1.0);
  o.wp = wp;
  o.page = page;
  return o;
}

@fragment fn fs(i: VO) -> FO {
  let sh = shadowAt(i.wp);
  // fade toward the ends of the strip
  let e = smoothstep(0.0, 0.18, min(i.page.y - cu.rect.y, cu.rect.w - i.page.y) / (cu.rect.w - cu.rect.y));
  let a = (1.0 - sh) * cu.p.x * e;
  var o: FO;
  o.color = vec4f(vec3f(0.035, 0.07, 0.12) * a, a);
  o.glow = vec4f(0.0);
  return o;
}
`;
