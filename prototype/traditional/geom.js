// Geometry for the folded constructs. Everything is in figure-local
// coordinates: (a, b) in the plot box, h in plot widths.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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
