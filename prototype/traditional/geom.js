// Geometry shared by the unfold scene and the dives. Everything is in
// figure-local coordinates: (a, b) in the plot box, h in plot widths.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Data coordinates → figure-local coordinates.
export const toLocal = (dom) => ([x, y, h]) => [(x - dom.x[0]) / (dom.x[1] - dom.x[0]), (y - dom.y[0]) / (dom.y[1] - dom.y[0]), h];

// Triangles for a parametric surface; each vertex carries (contour value, alpha).
export function surfaceVerts(s, L, n = 46) {
  const [v0, v1] = s.v;
  const grid = [];
  for (let j = 0; j <= n; j++) {
    const v = v0 + ((v1 - v0) * j) / n;
    const [u0, u1] = typeof s.u === 'function' ? s.u(v) : s.u;
    const row = [];
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n;
      const p = s.param(u, v);
      row.push({ p: L(p), c: s.contour ? s.contour(u, v) : p[2] * 10 });
    }
    grid.push(row);
  }
  const out = [];
  const push = (q) => out.push(q.p[0], q.p[1], q.p[2], q.c, 1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      if (![a, b, c, d].every((q) => q.p.every(Number.isFinite))) continue;
      push(a); push(b); push(c); push(a); push(c); push(d);
    }
  }
  return new Float32Array(out);
}

export function quadVerts(q) {
  const out = [];
  for (const i of [0, 1, 2, 0, 2, 3]) out.push(...q[i], 0, 1);
  return new Float32Array(out);
}

export const poly = (pts) => pts.slice(1).map((p, i) => [pts[i], p]);

export function curve(L, f, t0, t1, n = 120) {
  return poly(Array.from({ length: n + 1 }, (_, i) => L(f(t0 + ((t1 - t0) * i) / n))).filter((p) => p.every(Number.isFinite)));
}

export function dashed(p, q, n = 14) {
  const out = [];
  for (let i = 0; i < n; i += 2) {
    const a = i / n;
    const b = (i + 1) / n;
    out.push([p.map((v, k) => lerp(v, q[k], a)), p.map((v, k) => lerp(v, q[k], b))]);
  }
  return out;
}

// An arrow in local space, its head drawn in the vertical plane through the shaft.
export function arrow(p, q, head = 0.05) {
  const d = q.map((v, i) => v - p[i]);
  const len = Math.hypot(...d) || 1;
  const u = d.map((v) => v / len);
  const side = Math.hypot(u[0], u[1]) > 0.2 ? [-u[1], u[0], 0].map((v) => v / Math.hypot(u[0], u[1])) : [1, 0, 0];
  const back = q.map((v, i) => v - u[i] * head);
  return [[p, q], [q, back.map((v, i) => v + side[i] * head * 0.5)], [q, back.map((v, i) => v - side[i] * head * 0.5)]];
}

// A horizontal section plane over the plot box at height h, and a vertical wall
// standing on the bottom edge of the plot (b = 0) up to height h.
export const planeQuad = (h, a0 = 0, a1 = 1, b0 = 0, b1 = 1) => [[a0, b0, h], [a1, b0, h], [a1, b1, h], [a0, b1, h]];
export const wallQuad = (h, a0 = 0, a1 = 1, b = 0) => [[a0, b, 0], [a1, b, 0], [a1, b, h], [a0, b, h]];
export const outline = (q) => q.map((p, i) => [p, q[(i + 1) % q.length]]);

export function alongPath(pts, f) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], (p[2] - pts[i][2]) * 0.5));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = f * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const t = d / lens[i];
      return pts[i].map((v, k) => v + (pts[i + 1][k] - v) * t);
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}
