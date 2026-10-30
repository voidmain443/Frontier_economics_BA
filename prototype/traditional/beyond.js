// Part 2: what the flat textbook cannot show. Each figure is a small, live
// model: change one number and watch a structure the classical sequence
// holds fixed (who is connected, how unequal sizes are, how people play).

const $ = (s, r = document) => r.querySelector(s);
const TAU = Math.PI * 2;
const INK = '#1f231e';
const INK2 = '#545c51';
const COBALT = '#2a55a0';
const MADDER = '#b03b3b';
const OCHRE = '#a8761c';
const RULE = 'rgba(84, 132, 96, 0.35)';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(host, w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.width = '100%';
  c.style.aspectRatio = `${w} / ${h}`;
  host.replaceChildren(c);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  return g;
}

// ---------- graphs ----------
function bfsAll(adj) {
  const n = adj.length;
  let total = 0;
  let pairs = 0;
  for (let s = 0; s < n; s++) {
    const d = new Int32Array(n).fill(-1);
    d[s] = 0;
    const q = [s];
    for (let i = 0; i < q.length; i++) for (const v of adj[q[i]]) if (d[v] < 0) { d[v] = d[q[i]] + 1; q.push(v); }
    for (let t = 0; t < n; t++) if (t !== s && d[t] > 0) { total += d[t]; pairs++; }
  }
  return pairs ? total / pairs : 0;
}
function clustering(adj) {
  let c = 0;
  for (const nb of adj) {
    const k = nb.length;
    if (k < 2) continue;
    let links = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (adj[nb[i]].includes(nb[j])) links++;
    c += links / ((k * (k - 1)) / 2);
  }
  return c / adj.length;
}

// Watts–Strogatz: a ring where each person knows the k nearest; rewire each tie with probability p.
function smallWorld(n, k, p, s = 11) {
  seed = s;
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = 1; j <= k / 2; j++) edges.push([i, (i + j) % n]);
  const has = new Set(edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  for (const e of edges) {
    if (rnd() < p) {
      let t;
      let guard = 0;
      do { t = Math.floor(rnd() * n); guard++; } while ((t === e[0] || has.has(`${Math.min(e[0], t)}-${Math.max(e[0], t)}`)) && guard < 50);
      has.delete(`${Math.min(e[0], e[1])}-${Math.max(e[0], e[1])}`);
      e[1] = t;
      e.rewired = true;
      has.add(`${Math.min(e[0], t)}-${Math.max(e[0], t)}`);
    }
  }
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { edges, adj };
}

function initSmallWorld() {
  const host = $('#fig-smallworld .viz');
  const range = $('#sw-p');
  const out = $('#sw-out');
  const n = 80;
  const base = smallWorld(n, 6, 0);
  const L0 = bfsAll(base.adj);
  const C0 = clustering(base.adj);
  // the Watts–Strogatz curves, averaged over a few networks
  const ps = [0, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];
  const curve = ps.map((p) => {
    let L = 0;
    let C = 0;
    for (let r = 0; r < 3; r++) {
      const g = smallWorld(n, 6, p, 11 + r * 17);
      L += bfsAll(g.adj) / 3;
      C += clustering(g.adj) / 3;
    }
    return { p, L: L / L0, C: C / C0 };
  });
  const draw = () => {
    const p = Number(range.value);
    const g = smallWorld(n, 6, p);
    const L = bfsAll(g.adj);
    const C = clustering(g.adj);
    out.innerHTML = `average distance <b>${L.toFixed(2)}</b> steps (ring: ${L0.toFixed(2)}) &nbsp; clustering <b>${C.toFixed(2)}</b> (ring: ${C0.toFixed(2)})`;
    const ctx = canvas(host, 820, 380);
    // the network
    const cx = 190;
    const cy = 190;
    const R = 160;
    const pos = Array.from({ length: n }, (_, i) => [cx + R * Math.cos((i / n) * TAU - Math.PI / 2), cy + R * Math.sin((i / n) * TAU - Math.PI / 2)]);
    for (const e of g.edges) {
      ctx.strokeStyle = e.rewired ? MADDER : 'rgba(31,35,30,0.35)';
      ctx.lineWidth = e.rewired ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(...pos[e[0]]);
      ctx.lineTo(...pos[e[1]]);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    for (const [x, y] of pos) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); }
    // the curves: distance falls long before clustering does
    const ox = 430;
    const oy = 330;
    const w = 360;
    const h = 270;
    const X = (p) => ox + ((Math.log10(Math.max(p, 0.0005)) + 3.3) / 3.3) * w;
    const Y = (v) => oy - v * h;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ox, oy - h - 6); ctx.lineTo(ox, oy); ctx.lineTo(ox + w + 6, oy); ctx.stroke();
    ctx.font = 'italic 13px "CMU Serif", serif';
    ctx.fillStyle = INK2;
    for (const t of [0.001, 0.01, 0.1, 1]) ctx.fillText(String(t), X(t) - 10, oy + 18);
    ctx.fillText('rewiring probability p (log scale)', ox + 120, oy + 36);
    for (const [key, col, lab] of [['L', COBALT, 'distance L(p)/L(0)'], ['C', OCHRE, 'clustering C(p)/C(0)']]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      curve.forEach((q, i) => (i ? ctx.lineTo(X(q.p), Y(q[key])) : ctx.moveTo(X(q.p), Y(q[key]))));
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.fillText(lab, X(0.0012), Y(curve[2][key]) - 8);
    }
    ctx.strokeStyle = MADDER;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X(p), oy); ctx.lineTo(X(p), oy - h); ctx.stroke();
    ctx.setLineDash([]);
  };
  range.addEventListener('input', draw);
  draw();
}

// A long chain, as found at "Jefferson High": a schematic, not the study's data.
function initChain() {
  const host = $('#fig-chain .viz');
  const ctx = canvas(host, 820, 300);
  seed = 5;
  // a spanning-tree-like chain with short side branches, against a dense core
  const pts = [];
  let x = 40;
  let y = 150;
  let dir = 0;
  for (let i = 0; i < 70; i++) {
    dir += (rnd() - 0.5) * 0.9;
    x += 9 * Math.cos(dir) + 1.5;
    y = Math.max(30, Math.min(270, y + 9 * Math.sin(dir)));
    pts.push([x, y]);
  }
  ctx.strokeStyle = COBALT;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
  ctx.stroke();
  for (let i = 3; i < pts.length; i += 5) {
    const [px, py] = pts[i];
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (rnd() - 0.5) * 30, py + (rnd() > 0.5 ? 1 : -1) * (12 + rnd() * 14));
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  for (const [px, py] of pts) { ctx.beginPath(); ctx.arc(px, py, 2.4, 0, TAU); ctx.fill(); }
  // a dense core for contrast
  const core = Array.from({ length: 18 }, (_, i) => [650 + 60 * Math.cos((i / 18) * TAU), 150 + 60 * Math.sin((i / 18) * TAU)]);
  ctx.strokeStyle = 'rgba(176,59,59,0.35)';
  for (let i = 0; i < 18; i++) for (let j = i + 1; j < 18; j++) if ((i * 7 + j * 3) % 4 === 0) { ctx.beginPath(); ctx.moveTo(...core[i]); ctx.lineTo(...core[j]); ctx.stroke(); }
  ctx.fillStyle = MADDER;
  for (const [px, py] of core) { ctx.beginPath(); ctx.arc(px, py, 2.6, 0, TAU); ctx.fill(); }
  ctx.font = 'italic 14px "CMU Serif", serif';
  ctx.fillStyle = INK2;
  ctx.fillText('a long chain: cut one tie and the network splits', 40, 290);
  ctx.fillText('a dense core: many redundant paths', 560, 290);
}

// Preferential attachment: newcomers link to the well connected. Degrees follow a power law.
function initPower() {
  const host = $('#fig-power .viz');
  const btn = $('#pw-grow');
  const out = $('#pw-out');
  let deg = [];
  let ends = [];
  const reset = () => {
    seed = 3;
    deg = [1, 1, 1];
    ends = [0, 1, 1, 2, 2, 0];
  };
  const grow = (m) => {
    for (let s = 0; s < m; s++) {
      const id = deg.length;
      deg.push(0);
      const picked = new Set();
      while (picked.size < 2) picked.add(ends[Math.floor(rnd() * ends.length)]);
      for (const t of picked) { deg[t]++; deg[id]++; ends.push(t, id); }
    }
  };
  const draw = () => {
    const ctx = canvas(host, 820, 340);
    const counts = new Map();
    for (const d of deg) counts.set(d, (counts.get(d) ?? 0) + 1);
    const n = deg.length;
    // left: the histogram on ordinary axes; right: the same on log–log axes
    const pts = [...counts.entries()].map(([d, c]) => [d, c / n]).sort((a, b) => a[0] - b[0]);
    const panel = (ox, log) => {
      const w = 340;
      const h = 250;
      const oy = 290;
      const xmax = Math.max(...deg);
      const X = log ? (d) => ox + (Math.log10(d) / Math.log10(xmax * 1.2)) * w : (d) => ox + (d / Math.min(xmax, 40)) * w;
      const Y = log ? (f) => oy - ((Math.log10(f) + Math.log10(n) + 0.2) / (Math.log10(n) + 0.2)) * h : (f) => oy - (f / 0.5) * h;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ox, oy - h - 6); ctx.lineTo(ox, oy); ctx.lineTo(ox + w + 6, oy); ctx.stroke();
      ctx.fillStyle = COBALT;
      for (const [d, f] of pts) {
        if (!log && d > 40) continue;
        ctx.beginPath(); ctx.arc(X(d), Y(f), 3, 0, TAU); ctx.fill();
      }
      ctx.font = 'italic 13px "CMU Serif", serif';
      ctx.fillStyle = INK2;
      ctx.fillText(log ? 'log degree vs log share: a straight line' : 'degree vs share of people', ox + 10, oy + 26);
      if (log) {
        ctx.strokeStyle = MADDER;
        ctx.setLineDash([4, 4]);
        const d0 = 2;
        const d1 = xmax;
        const f0 = pts.find((p) => p[0] === 2)?.[1] ?? 0.3;
        ctx.beginPath(); ctx.moveTo(X(d0), Y(f0)); ctx.lineTo(X(d1), Y(f0 * (d1 / d0) ** -3)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = MADDER;
        ctx.fillText('slope −3', X(10), Y(f0 * 5 ** -3) - 10);
      }
    };
    panel(50, false);
    panel(440, true);
    const top = [...deg].sort((a, b) => b - a);
    out.innerHTML = `<b>${n}</b> people &nbsp; most connected: <b>${top[0]}</b> ties &nbsp; median: <b>${top[Math.floor(n / 2)]}</b>`;
  };
  btn.addEventListener('click', () => { grow(400); draw(); });
  $('#pw-reset').addEventListener('click', () => { reset(); grow(60); draw(); });
  reset();
  grow(60);
  draw();
}

// The 2/3 beauty contest: a mix of level-0, 1, 2 and Nash players.
function initBeauty() {
  const host = $('#fig-beauty .viz');
  const sliders = [...document.querySelectorAll('#fig-beauty input')];
  const out = $('#bc-out');
  const draw = () => {
    const w = sliders.map((s) => Number(s.value));
    const total = w.reduce((a, b) => a + b, 0) || 1;
    const guess = [50, 50 * 2 / 3, 50 * (2 / 3) ** 2, 0];
    const avg = w.reduce((a, x, i) => a + (x / total) * guess[i], 0);
    const target = (2 / 3) * avg;
    const ctx = canvas(host, 820, 220);
    const X = (v) => 40 + (v / 100) * 740;
    ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(X(0), 160); ctx.lineTo(X(100), 160); ctx.stroke();
    ctx.font = 'italic 13px "CMU Serif", serif';
    ctx.fillStyle = INK2;
    for (let v = 0; v <= 100; v += 10) ctx.fillText(String(v), X(v) - 6, 180);
    const labels = ['level 0: guesses 50', 'level 1: 33', 'level 2: 22', 'Nash: 0'];
    guess.forEach((gv, i) => {
      const hgt = (w[i] / total) * 120;
      ctx.fillStyle = [INK2, COBALT, OCHRE, MADDER][i];
      ctx.fillRect(X(gv) - 9, 160 - hgt, 18, hgt);
      ctx.fillText(labels[i], X(gv) - 30, 152 - hgt);
    });
    ctx.strokeStyle = MADDER;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(target), 20); ctx.lineTo(X(target), 160); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = MADDER;
    ctx.fillText(`winning number ⅔ × average = ${target.toFixed(1)}`, X(target) + 6, 30);
    out.innerHTML = `average guess <b>${avg.toFixed(1)}</b>; the Nash player, who guessed 0, ${target > 5 ? 'loses' : 'is close'}.`;
  };
  sliders.forEach((s) => s.addEventListener('input', draw));
  draw();
}

// Contagion between banks: the same shock on a ring and on a complete network.
function initContagion() {
  const host = $('#fig-contagion .viz');
  const range = $('#ct-shock');
  const out = $('#ct-out');
  const n = 10;
  const buffer = 1;
  const simulate = (shock, complete) => {
    // bank 0 loses `shock`; a failed bank's excess loss is passed equally to its creditors
    const loss = new Float64Array(n);
    const failed = new Array(n).fill(false);
    loss[0] = shock;
    for (let round = 0; round < 40; round++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        if (!failed[i] && loss[i] > buffer) {
          failed[i] = true;
          changed = true;
          const excess = loss[i] - buffer;
          const nb = complete ? [...Array(n).keys()].filter((j) => j !== i) : [(i + 1) % n];
          for (const j of nb) loss[j] += excess / nb.length;
        }
      }
      if (!changed) break;
    }
    return failed;
  };
  const draw = () => {
    const s = Number(range.value);
    const ring = simulate(s, false);
    const full = simulate(s, true);
    const ctx = canvas(host, 820, 300);
    const net = (cx, failed, complete, title) => {
      const pos = Array.from({ length: n }, (_, i) => [cx + 110 * Math.cos((i / n) * TAU - Math.PI / 2), 150 + 110 * Math.sin((i / n) * TAU - Math.PI / 2)]);
      ctx.strokeStyle = 'rgba(31,35,30,0.3)';
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (complete ? j > i : j === (i + 1) % n) { ctx.beginPath(); ctx.moveTo(...pos[i]); ctx.lineTo(...pos[j]); ctx.stroke(); }
      }
      pos.forEach(([x, y], i) => {
        ctx.fillStyle = failed[i] ? MADDER : COBALT;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
      });
      ctx.font = 'italic 14px "CMU Serif", serif';
      ctx.fillStyle = INK;
      ctx.fillText(`${title}: ${failed.filter(Boolean).length} of ${n} fail`, cx - 80, 290);
    };
    net(200, ring, false, 'a ring');
    net(610, full, true, 'everyone lends to everyone');
    out.innerHTML = s <= 1 ? 'The first bank’s own buffer absorbs the shock.' : s <= 10 ? 'The dense network spreads the loss thin and only the first bank fails; the ring passes it down the line, bank by bank.' : 'A shock larger than all the buffers together: the dense network now carries it to every bank.';
  };
  range.addEventListener('input', draw);
  draw();
}

addEventListener('DOMContentLoaded', () => {
  initSmallWorld();
  initChain();
  initPower();
  initBeauty();
  initContagion();
});
