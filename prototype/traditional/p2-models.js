// Part 2's models, shared by the flat figures (p2-figs.js) and what the fold
// raises (p2-fold.js). All random draws are seeded, so a figure is the same
// every time it is drawn.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 2.1 the small world (Watts and Strogatz 1998) ----------

export function smallWorld(n, k, p, seed = 11) {
  const rnd = rng(seed);
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = 1; j <= k / 2; j++) edges.push({ a: i, b: (i + j) % n, rewired: false });
  const key = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const has = new Set(edges.map((e) => key(e.a, e.b)));
  for (const e of edges) {
    if (rnd() >= p) continue;
    let t;
    let guard = 0;
    do { t = Math.floor(rnd() * n); guard++; } while ((t === e.a || has.has(key(e.a, t))) && guard < 60);
    if (guard >= 60) continue;
    has.delete(key(e.a, e.b));
    e.b = t;
    e.rewired = true;
    has.add(key(e.a, t));
  }
  const adj = Array.from({ length: n }, () => []);
  for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
  return { n, edges, adj };
}

export function distances(adj, from) {
  const d = new Array(adj.length).fill(Infinity);
  d[from] = 0;
  const q = [from];
  for (let i = 0; i < q.length; i++) for (const v of adj[q[i]]) if (d[v] === Infinity) { d[v] = d[q[i]] + 1; q.push(v); }
  return d;
}

export function meanDistance(adj) {
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < adj.length; i++) for (const d of distances(adj, i)) if (d > 0 && d < Infinity) { sum += d; cnt++; }
  return cnt ? sum / cnt : Infinity;
}

export function clustering(adj) {
  let total = 0;
  for (const nb of adj) {
    const k = nb.length;
    if (k < 2) continue;
    let links = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (adj[nb[i]].includes(nb[j])) links++;
    total += links / ((k * (k - 1)) / 2);
  }
  return total / adj.length;
}

// path length and clustering relative to the ring, averaged over three networks
export const SW = { n: 80, k: 6 };
export const SW_PS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
let swCurve = null;
export function smallWorldCurve() {
  if (swCurve) return swCurve;
  const ring = smallWorld(SW.n, SW.k, 0);
  const L0 = meanDistance(ring.adj);
  const C0 = clustering(ring.adj);
  swCurve = SW_PS.map((p) => {
    let L = 0;
    let C = 0;
    for (const s of [11, 12, 13]) {
      const g = smallWorld(SW.n, SW.k, p, s);
      L += meanDistance(g.adj) / 3;
      C += clustering(g.adj) / 3;
    }
    return { p, L: L / L0, C: C / C0 };
  });
  return swCurve;
}

// ---------- 2.2 chains and cores (after Bearman, Moody and Stovel 2004) ----------

// two schematic networks of 24 students: a long chain with short branches, and a core
export function chainAndCore() {
  const chain = [];
  for (let i = 0; i < 15; i++) chain.push([i, i + 1]);
  const branches = [[3, 16], [16, 17], [7, 18], [10, 19], [19, 20], [12, 21], [5, 22], [14, 23]];
  chain.push(...branches, [2, 4], [11, 13]);
  const core = [];
  for (let i = 0; i < 12; i++) core.push([i, (i + 1) % 12]);
  core.push([0, 4], [1, 7], [2, 9], [3, 6], [5, 10], [8, 11], [0, 6]);
  for (let i = 12; i < 24; i++) core.push([i, (i - 12) % 12]);
  return { chain, core, n: 24 };
}

// for each tie, how many pairs of students would be cut off from each other if it broke
export function cutPairs(n, edges) {
  return edges.map((_, skip) => {
    const adj = Array.from({ length: n }, () => []);
    edges.forEach(([a, b], i) => { if (i !== skip) { adj[a].push(b); adj[b].push(a); } });
    const seen = new Array(n).fill(false);
    let reachable = 0;
    for (let s = 0; s < n; s++) {
      if (seen[s]) continue;
      let size = 0;
      const q = [s];
      seen[s] = true;
      for (let i = 0; i < q.length; i++) { size++; for (const v of adj[q[i]]) if (!seen[v]) { seen[v] = true; q.push(v); } }
      reachable += (size * (size - 1)) / 2;
    }
    return (n * (n - 1)) / 2 - reachable;
  });
}

// a layout: the chain snakes along, its branches hang off it; the core is a ring with its outer students
export function chainLayout() {
  const pos = [];
  for (let i = 0; i <= 15; i++) pos[i] = [0.06 + (i / 15) * 0.88, 0.5 + 0.18 * Math.sin(i * 0.9)];
  const off = (a, dx, dy) => [pos[a][0] + dx, pos[a][1] + dy];
  pos[16] = off(3, 0.02, 0.2); pos[17] = off(16, 0.03, 0.14); pos[18] = off(7, -0.02, -0.2); pos[19] = off(10, 0.02, 0.22);
  pos[20] = off(19, 0.05, 0.1); pos[21] = off(12, -0.03, -0.22); pos[22] = off(5, 0.03, -0.2); pos[23] = off(14, 0.02, 0.2);
  return pos.map(([x, y]) => [x, Math.min(0.96, Math.max(0.04, y))]);
}
export function coreLayout() {
  const pos = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * Math.PI; pos[i] = [0.5 + 0.22 * Math.cos(a), 0.5 + 0.3 * Math.sin(a)]; }
  for (let i = 12; i < 24; i++) { const a = ((i - 12) / 12) * 2 * Math.PI; pos[i] = [0.5 + 0.4 * Math.cos(a), 0.5 + 0.44 * Math.sin(a)]; }
  return pos;
}

// ---------- 2.3 no typical size (Barabási and Albert 1999) ----------

let paCache = null;
export function preferential(n = 400, m = 2, seed = 3) {
  if (paCache) return paCache;
  const rnd = rng(seed);
  const deg = [1, 1, 1];
  const ends = [0, 1, 1, 2, 2, 0];
  while (deg.length < n) {
    const id = deg.length;
    deg.push(0);
    const picked = new Set();
    while (picked.size < m) picked.add(ends[Math.floor(rnd() * ends.length)]);
    for (const t of picked) { deg[t]++; deg[id]++; ends.push(t, id); }
  }
  // the firms are laid out on a 20 × 20 plan in an order unrelated to their size
  const order = Array.from({ length: n }, (_, i) => i);
  const r2 = rng(seed + 7);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r2() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  paCache = { deg, order, mean: deg.reduce((a, b) => a + b, 0) / n };
  return paCache;
}

// ---------- 2.4 the beauty contest (Nagel 1995) ----------

export const LEVELS = [
  { name: 'level 0', guess: 50 },
  { name: 'level 1', guess: 50 * (2 / 3) },
  { name: 'level 2', guess: 50 * (2 / 3) ** 2 },
  { name: 'level 3', guess: 50 * (2 / 3) ** 3 },
  { name: 'Nash', guess: 0 },
];
export function beauty(mix) {
  const total = mix.reduce((a, b) => a + b, 0) || 1;
  const avg = mix.reduce((a, w, i) => a + (w / total) * LEVELS[i].guess, 0);
  return { total, avg, target: (2 / 3) * avg };
}

// ---------- 2.9 contagion between banks (after Acemoglu, Ozdaglar and Tahbaz-Salehi 2015) ----------

// bank 0 loses `shock`; a failed bank passes its loss beyond its buffer equally to the banks it owes.
// Rounds are simultaneous, so each bank's round of failure is well defined.
export function contagion(shock, complete, n = 10, buffer = 1) {
  const loss = new Array(n).fill(0);
  const round = new Array(n).fill(0);
  loss[0] = shock;
  for (let r = 1; r <= 40; r++) {
    const now = [];
    for (let i = 0; i < n; i++) if (!round[i] && loss[i] > buffer + 1e-9) now.push(i);
    if (!now.length) break;
    for (const i of now) round[i] = r;
    for (const i of now) {
      const excess = loss[i] - buffer;
      const owes = complete ? [...Array(n).keys()].filter((j) => j !== i) : [(i + 1) % n];
      for (const j of owes) loss[j] += excess / owes.length;
    }
  }
  return round;
}

// ---------- 2.4 unlike households (KOSIS, data/korea-households.json) ----------

// the five fifths and all households: disposable income and consumption
// spending a month per household, in million won; shares of the total
export function fifths(doc) {
  const get = (key) => Object.fromEntries(doc.series.find((x) => x.key === key).points);
  const y = get('disp_income');
  const c = get('consumption');
  const names = ['bottom fifth', 'second fifth', 'middle fifth', 'fourth fifth', 'top fifth'];
  const rows = names.map((name) => ({ name, y: y[name] / 1000, c: c[name] / 1000 }));
  const Y = rows.reduce((a, r) => a + r.y, 0);
  const C = rows.reduce((a, r) => a + r.c, 0);
  for (const r of rows) Object.assign(r, { apc: r.c / r.y, ys: r.y / Y, cs: r.c / C });
  const all = { y: y['all households'] / 1000, c: c['all households'] / 1000 };
  return { rows, all: { ...all, apc: all.c / all.y }, year: doc.year };
}

// ---------- 2.8 connected firms (Bank of Korea, data/korea-io.json) ----------

export const SECTOR_NAMES = {
  A: 'farming and fishing', B: 'mining', C01: 'food', C02: 'textiles', C03: 'wood and paper', C04: 'petroleum',
  C05: 'chemicals', C06: 'non-metallic minerals', C07: 'basic metals', C08: 'fabricated metal', C09: 'electronics',
  C10: 'electrical equipment', C11: 'machinery', C12: 'transport equipment', C13: 'other manufacturing', C14: 'repair',
  D: 'power and gas', E: 'water and waste', F: 'construction', G: 'trade', H: 'transport', I: 'restaurants and hotels',
  J: 'communications', K: 'finance', L: 'real estate', M: 'professional services', N: 'business support',
  O: 'public administration', P: 'education', Q: 'health', R: 'arts and leisure', S: 'other services', T: 'other',
};

// The table gives the Leontief inverse L = (I − A)⁻¹; the input coefficients
// are A = I − L⁻¹. For one won of final demand for sector j, the output it
// draws from each sector, by round: the won itself, A (its suppliers), A²
// (theirs), and the rest, which sum to L's column j.
let IO = null;
export function io(doc) {
  if (IO?.doc === doc) return IO;
  const codes = doc.sectors.map((x) => x.code);
  const n = codes.length;
  const cell = Object.fromEntries(doc.series[0].points);
  const L = codes.map((i) => codes.map((j) => cell[`${i}>${j}`]));
  // Gauss–Jordan inverse of L
  const a = L.map((row, i) => [...row, ...codes.map((_, k) => (i === k ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    const pv = a[c][c];
    a[c] = a[c].map((v) => v / pv);
    for (let r = 0; r < n; r++) if (r !== c && a[r][c]) { const f = a[r][c]; a[r] = a[r].map((v, k) => v - f * a[c][k]); }
  }
  const A = codes.map((_, i) => codes.map((__, j) => Math.max(0, (i === j ? 1 : 0) - a[i][n + j])));
  IO = { doc, codes, n, L, A, names: codes.map((c) => SECTOR_NAMES[c] ?? c), year: doc.year };
  return IO;
}
export function rounds(m, j) {
  const r1 = m.A.map((row) => row[j]);
  const r2 = m.A.map((row) => row.reduce((s, v, k) => s + v * m.A[k][j], 0));
  return m.L.map((row, i) => {
    const r0 = i === j ? 1 : 0;
    return { i, r0, r1: r1[i], r2: r2[i], rest: Math.max(0, row[j] - r0 - r1[i] - r2[i]), total: row[j] };
  });
}

// ---------- 2.10 prices that never settle (Scarf 1960) ----------

// Three people each own one unit of one good. In Scarf's economy person i
// wants goods i and i + 1 in fixed proportion, so spends income p_i on equal
// amounts of both; with one representative consumer (Cobb–Douglas, equal
// shares) the same endowments give demand Σp / 3p_j for each good. Prices
// adjust in proportion to excess demand, dp/dt = z(p) (tâtonnement), which
// keeps Σp² fixed; Scarf's path also keeps p₁p₂p₃ fixed, so it is a closed
// loop around the equilibrium (1, 1, 1)/√3·r, and never reaches it.
export function excessScarf(p) {
  return p.map((pj, j) => pj / (pj + p[(j + 1) % 3]) + p[(j + 2) % 3] / (p[(j + 2) % 3] + pj) - 1);
}
export function excessOne(p) {
  const s = p[0] + p[1] + p[2];
  return p.map((pj) => s / (3 * pj) - 1);
}
// the path from p0 for time T, every dt, with fourth-order Runge–Kutta
export function tatonnement(z, p0, T, dt = 0.02) {
  const out = [{ t: 0, p: p0 }];
  let p = p0;
  const add = (a, b, h) => a.map((v, i) => v + h * b[i]);
  for (let t = dt; t <= T + 1e-9; t += dt) {
    const k1 = z(p);
    const k2 = z(add(p, k1, dt / 2));
    const k3 = z(add(p, k2, dt / 2));
    const k4 = z(add(p, k3, dt));
    p = p.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    out.push({ t, p });
  }
  return out;
}
// relative prices on the triangle: each corner is one good at its dearest
export const SIMPLEX = { h: Math.sqrt(3) / 2 };
export function onSimplex(p) {
  const s = p[0] + p[1] + p[2];
  const q = p.map((v) => v / s);
  return [q[1] + q[2] / 2, q[2] * SIMPLEX.h];
}
export const SCARF_P0 = [0.9, 0.35, 0.3];
