// The bench: physical instruments standing on the unfolded page.
//
// Over a figure, an instrument is built so that the overhead light casts the
// figure itself: wires cast the curves, a rod casts the price line, beads cast
// the points. When the instrument moves by its own dynamics, its shadow (the
// textbook graph) moves with it, and a live redraw of the figure shows the
// states between equilibria that the book never draws.
//
// Beside the page stands the machine. It is assembled course by course: the
// capital tank with the Solow model, households and the consumption loop with
// the Euler equation, the central bank with money, the investment and
// government valves with IS–LM, the inflation column with the Phillips curve,
// trade with the open economy, the record with econometrics, and modules for
// the field courses. It follows the reader to the end, where real data drive it.

import { cylinder, sphere, box, tube, polyline, loadGLB } from './geo3d.js';
import { basis } from './math.js';
import { lerp, clamp, smooth, ease } from './geom.js';
import { LIVE } from './live.js';
import { createStage } from './stage.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const unit = (a) => scl(a, 1 / (len(a) || 1));
const approach = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));

const C = {
  plaster: [0.95, 0.945, 0.92, 1],
  shade: [0.7, 0.73, 0.72, 1],
  ink: [0.2, 0.24, 0.3, 1],
  water: [0.22, 0.44, 0.76, 1],
  cobalt: [0.27, 0.45, 0.84, 1],
  madder: [0.8, 0.31, 0.28, 1],
  ochre: [0.86, 0.62, 0.25, 1],
  accent: [0.95, 0.45, 0.36, 1],
  glass: [0.85, 0.92, 1, 1],
  soot: [0.32, 0.33, 0.33, 1],
};
const MAT = { matte: [0.04, 1, 0, 0], ink: [0.6, 1, 0, 0], water: [0.9, 1, 0.1, 0], bead: [0.8, 1, 0.06, 0], glass: [0, 1, 0, 0] };

// ---------- assets ----------

const ASSETS = ['household', 'firm', 'government', 'central_bank', 'bank', 'rest_of_world', 'person', 'valve',
  'market_hall', 'exchange', 'globe', 'containers', 'power_plant', 'farm', 'city', 'coins', 'university', 'crate'];

export async function loadAssets() {
  const out = {};
  await Promise.all(ASSETS.map(async (name) => {
    try {
      out[name] = await loadGLB(`assets/agents/${name}.glb`);
    } catch {
      out[name] = fallback(name);
    }
  }));
  return out;
}

// Plain massing models, used only if a maquette is missing.
function fallback(name) {
  const g = name === 'valve' ? cylinder(0.2, 0.4, 16) : name === 'person' ? cylinder(0.12, 1, 12) : box(1, 0.55, 0.7);
  return [{ node: name === 'valve' ? 'body' : name, material: 'plaster', geometry: g, fallback: true }];
}

// ---------- the module ----------

export function createBench({ G, sheet, labelsRoot, toWorld, PX, figs, ctx, sheetBox, assets, figureAgents = [], record, plates }) {
  const solids = [];
  const mk = (geo, opts) => {
    const s = G.solid(geo, opts);
    solids.push(s);
    return s;
  };
  const GEO = {
    cyl: mk(cylinder(1, 1, 28), { max: 400 }),
    sph: mk(sphere(1, 18), { max: 220 }),
    box: mk(box(1, 1, 1), { max: 80 }),
    glass: mk(cylinder(1, 1, 56, [true, false]), { kind: 'glass', max: 24 }),
  };
  const AG = {};
  for (const name of ASSETS) {
    AG[name] = (assets[name] ?? []).map((p) => {
      const g = p.geometry;
      // the wheel of a valve turns about its own vertical axis
      let cx = 0;
      let cz = 0;
      if (p.node === 'wheel') {
        for (let i = 0; i < g.pos.length; i += 3) {
          cx += g.pos[i];
          cz += g.pos[i + 2];
        }
        cx /= g.pos.length / 3;
        cz /= g.pos.length / 3;
      }
      return { solid: mk(g, { max: 10 }), color: p.material === 'shade' ? C.shade : C.plaster, wheel: p.node === 'wheel', cx, cz };
    });
  }

  // per-frame instance queues
  const Q = new Map();
  const put = (solid, m, color, p = MAT.matte) => {
    if (!Q.has(solid)) Q.set(solid, []);
    Q.get(solid).push({ m, color, p });
  };

  // ---- frames on the ribbon ----
  const onPage = (x, s, P) => toWorld([0, 0, 0], [x, s, x, s], P);
  const pageFrame = (x, s, P) => {
    const o = onPage(x, s, P);
    const N = unit(sub(toWorld([0, 0, 1], [x, s, x + 1, s], P), o));
    const D = unit(sub(onPage(x, s + 3, P), onPage(x, s - 3, P)));
    return { o, X: [1, 0, 0], N, D };
  };
  const at = (F, p) => add(add(add(F.o, scl(F.X, p[0])), scl(F.N, p[1])), scl(F.D, p[2]));
  const fm = (F, pos, sc = [1, 1, 1], ry = 0) => {
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const ax = add(scl(F.X, c), scl(F.D, -s));
    const az = add(scl(F.X, s), scl(F.D, c));
    return basis(at(F, pos), scl(ax, sc[0]), scl(F.N, sc[1]), scl(az, sc[2]));
  };
  const frameMat = (F) => basis(F.o, F.X, F.N, F.D);
  const rodM = (a, b, r) => {
    const d = sub(b, a);
    const u = unit(d);
    const t = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const x = unit(cross(t, u));
    const z = unit(cross(x, u));
    return basis(a, scl(x, r), d, scl(z, r));
  };
  const sphM = (p, r) => basis(p, [r, 0, 0], [0, r, 0], [0, 0, r]);
  const rod = (a, b, r, color = C.ink, p = MAT.ink) => put(GEO.cyl, rodM(a, b, r), color, p);
  const bead = (p, r, color) => put(GEO.sph, sphM(p, r), color, MAT.bead);
  // springs are drawn as helices of constant wire width, however far they stretch
  const springSegs = { accent: [], grey: [] };
  const springBetween = (a, b, rc, color = C.accent) => {
    const d = sub(b, a);
    const L = len(d);
    if (L < 1e-4) return;
    const u = scl(d, 1 / L);
    const t = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e1 = unit(cross(t, u));
    const e2 = cross(u, e1);
    const coils = clamp(Math.round(L / 0.0035), 5, 40);
    const n = coils * 10;
    let prev = a;
    for (let i = 1; i <= n; i++) {
      const s = i / n;
      const th = s * coils * Math.PI * 2;
      const end = i === n;
      const p = end ? b : add(add(a, scl(d, s)), add(scl(e1, rc * Math.cos(th)), scl(e2, rc * Math.sin(th))));
      (color === C.accent ? springSegs.accent : springSegs.grey).push([prev, p]);
      prev = p;
    }
  };
  // a maquette in a page frame; sc is its footprint in world units
  const agent = (name, F, pos, sc, ry = 0, grow = 1, wheel = 0) => {
    if (grow < 0.03) return;
    for (const part of AG[name] ?? []) {
      let m = fm(F, pos, [sc, sc * grow, sc], ry);
      if (part.wheel && wheel) {
        // rotate the wheel about its own centre: translate, turn, translate back
        const c = Math.cos(wheel);
        const s = Math.sin(wheel);
        const R = new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, part.cx - (c * part.cx + s * part.cz), 0, part.cz - (-s * part.cx + c * part.cz), 1]);
        m = mul4(m, R);
      }
      put(part.solid, m, part.color);
    }
  };

  // ---- labels ----
  const labels = [];
  const label = (html, cls = '') => {
    const el = document.createElement('div');
    el.className = `xl bench ${cls}`;
    el.innerHTML = html;
    labelsRoot.appendChild(el);
    const L = { el, p: null, o: 0 };
    labels.push(L);
    return L;
  };

  // ---- figure helpers ----
  const fw = (f, x, y, h, P) => {
    const a = (x - f.dom.x[0]) / (f.dom.x[1] - f.dom.x[0]);
    const b = (y - f.dom.y[0]) / (f.dom.y[1] - f.dom.y[0]);
    return toWorld([a, b, h / ((f.box[2] - f.box[0]) * PX)], f.box, P);
  };
  const figCenter = (f) => (f.box[1] + f.box[3]) / 2;
  const pageY = (sel, frac = 0) => {
    const el = sheet.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.top + scrollY + r.height * frac;
  };

  // ---- live plates: the figure redrawn while its instrument moves ----
  function livePlate(id) {
    const f = figs[id];
    if (!f || !LIVE[id]) return null;
    const art = f.el.querySelector('.fig-art');
    const r = art.getBoundingClientRect();
    const sr = sheet.getBoundingClientRect();
    const rect = [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY];
    const host = plates.host(r.width, r.height, r.left - sr.left, r.top - sr.top);
    return { id, rect, host, plate: null, key: '', draw: (state) => LIVE[id](host, state) };
  }

  // the stage beside the page uses the same kit
  const kit = {
    G, pageFrame, at, fm, put, rod, bead, agent, label, GEO, C, MAT,
    has: (name) => Boolean(assets[name]?.length) && !assets[name][0].fallback,
  };
  const stage = createStage({ kit, sheet, plates, ctx, sheetBox });

  // ======================================================================
  // Instruments over figures
  // ======================================================================
  const instruments = [];
  const HW = 0.045; // wire height above the page, world units

  // --- supply and demand: wires cast the curves, a rod casts the price line ---
  if (figs.sd) {
    const f = figs.sd;
    const s = { I: 1, p: 5.5 };
    const live = livePlate('sd');
    const L = { hh: label('Households: demand'), firm: label('Firms: supply'), price: label('the price') };
    instruments.push({
      f, live, center: figCenter(f),
      state: () => ({ I: s.I, p: s.p }),
      step(dt, focus) {
        // income rises as the figure reaches the reading line
        s.I = approach(s.I, 1 + 0.2 * smooth(f.box[1] + 60, figCenter(f) + 60, focus), dt, 2.2);
        for (let i = 0; i < 4; i++) s.p += 0.32 * ((10 * s.I - s.p) - (s.p - 1)) * (dt / 4);
      },
      draw(P) {
        const W = (x, y, h = HW) => fw(f, x, y, h, P);
        const P0 = Math.max(0, 10 * s.I - 12);
        const P1 = Math.min(12, 10 * s.I);
        const d0 = W(10 * s.I - P0, P0);
        const d1 = W(10 * s.I - P1, P1);
        rod(d0, d1, 0.0026, C.cobalt, MAT.bead);
        rod(W(0, 1), W(11, 12), 0.0026, C.madder, MAT.bead);
        for (const [x, y] of [[10 * s.I - P0, P0], [10 * s.I - P1, P1], [0, 1], [11, 12]]) post(W(x, y, 0), W(x, y));
        // rails and the price rod
        const H2 = HW + 0.006;
        for (const x of [-0.5, 12.5]) {
          rod(W(x, 0, H2), W(x, 12, H2), 0.0014);
          post(W(x, 0, 0), W(x, 0, H2));
          post(W(x, 12, 0), W(x, 12, H2));
        }
        rod(W(-0.5, s.p, H2), W(12.5, s.p, H2), 0.0019);
        const qd = clamp(10 * s.I - s.p, 0, 12);
        const qs = clamp(s.p - 1, 0, 12);
        bead(W(qd, s.p, H2), 0.0062, C.cobalt);
        bead(W(qs, s.p, H2), 0.0062, C.madder);
        springBetween(W(Math.min(qd, qs), s.p, H2), W(Math.max(qd, qs), s.p, H2), 0.0042);
        const FH = pageFrame(f.box[2] + 70, f.box[3] - 30, P);
        agent('household', FH, [0, 0, 0], 0.07, -0.4);
        const FF = pageFrame(f.box[2] + 70, f.box[1] + 50, P);
        agent('firm', FF, [0, 0, 0], 0.075, -0.3);
        L.hh.p = at(FH, [0, 0.07, 0]);
        L.firm.p = at(FF, [0, 0.075, 0]);
        L.price.p = W(12.5, s.p, H2 + 0.01);
      },
      labels: Object.values(L),
    });
  }

  // --- the Edgeworth box: a budget wire pivoting on the endowment ---
  if (figs.edgeworth) {
    const f = figs.edgeworth;
    const s = { lp: Math.log(0.35), xa: 0, xb: 0 };
    const demand = (p) => ({ xa: (8 * p + 2) / (2 * p), xbB: (2 * p + 8) / (2 * p) });
    const d0 = demand(Math.exp(s.lp));
    s.xa = d0.xa;
    s.xb = 10 - d0.xbB;
    const live = livePlate('edgeworth');
    const L = { a: label('Household A'), b: label('Household B'), w: label('the price wire turns on ω') };
    instruments.push({
      f, live, center: figCenter(f),
      state: () => ({ p: Math.exp(s.lp), xa: s.xa, xb: s.xb }),
      step(dt, focus) {
        const released = focus > f.box[1] + 120;
        const p = Math.exp(s.lp);
        const d = demand(p);
        if (released) {
          const z = d.xa + d.xbB - 10;
          s.lp += clamp(0.12 * z, -1.2, 1.2) * dt;
        } else s.lp = approach(s.lp, Math.log(0.35), dt, 3);
        const dn = demand(Math.exp(s.lp));
        s.xa = approach(s.xa, clamp(dn.xa, 0, 10), dt, 5);
        s.xb = approach(s.xb, clamp(10 - dn.xbB, 0, 10), dt, 5);
      },
      draw(P) {
        const W = (x, y, h = HW) => fw(f, x, y, h, P);
        const p = Math.exp(s.lp);
        const line = (x) => 2 - p * (x - 8);
        const x0 = Math.max(0, 8 - 8 / p);
        const x1 = Math.min(10, 8 + 2 / p);
        rod(W(x0, line(x0)), W(x1, line(x1)), 0.0022);
        post(W(8, 2, 0), W(8, 2, HW - 0.003), 0.004);
        bead(W(8, 2, HW), 0.0045, C.ink);
        const ya = line(s.xa);
        const yb = line(s.xb);
        bead(W(s.xa, ya), 0.0064, C.cobalt);
        bead(W(s.xb, yb), 0.0064, C.madder);
        springBetween(W(Math.min(s.xa, s.xb), line(Math.min(s.xa, s.xb))), W(Math.max(s.xa, s.xb), line(Math.max(s.xa, s.xb))), 0.004);
        const FA = pageFrame(f.box[0] - 60, f.box[3] + 10, P);
        agent('household', FA, [0, 0, 0], 0.065, 0.5);
        const FB = pageFrame(f.box[2] + 60, f.box[1] + 20, P);
        agent('household', FB, [0, 0, 0], 0.065, Math.PI + 0.5);
        L.a.p = at(FA, [0, 0.065, 0]);
        L.b.p = at(FB, [0, 0.065, 0]);
        L.w.p = W(8, 2, HW + 0.012);
      },
      labels: Object.values(L),
    });
  }

  // --- least squares: springs pull a rod onto the data ---
  if (figs.regression && ctx.regData) {
    const f = figs.regression;
    const pts = ctx.regData;
    const fit = ctx.regFit;
    const start = { a: 9.5, b: -0.35 };
    const s = { a: start.a, b: start.b, va: 0, vb: 0 };
    const L = { r: label('springs come to rest at least squares') };
    instruments.push({
      f, live: null, center: figCenter(f),
      step(dt, focus) {
        if (focus < f.box[1] + 80) {
          s.a = approach(s.a, start.a, dt, 3);
          s.b = approach(s.b, start.b, dt, 3);
          s.va = 0;
          s.vb = 0;
          return;
        }
        // a damped oscillator toward the minimum of ½Σ residual², per mode
        const w = 3.2;
        const z = 0.42;
        for (let i = 0; i < 4; i++) {
          const h = dt / 4;
          s.va += (-w * w * (s.a - fit.a) - 2 * z * w * s.va) * h;
          s.vb += (-w * w * (s.b - fit.b) - 2 * z * w * s.vb) * h;
          s.a += s.va * h;
          s.b += s.vb * h;
        }
      },
      draw(P) {
        const W = (x, y, h = HW) => fw(f, x, y, h, P);
        const yAt = (x) => s.a + s.b * x;
        rod(W(0, yAt(0)), W(10, yAt(10)), 0.002, C.madder, MAT.bead);
        for (const x of [0, 10]) post(W(x, yAt(x), 0), W(x, yAt(x)), 0.0018);
        for (const [x1, , y] of pts) {
          bead(W(x1, y), 0.0038, C.cobalt);
          springBetween(W(x1, y), W(x1, yAt(x1)), 0.0016, C.shade);
        }
        L.r.p = W(10, yAt(10), HW + 0.015);
      },
      labels: Object.values(L),
    });
  }

  // --- the agents a figure names stand on the page beside it ---
  const ASSET_OF = { Households: 'household', Firms: 'firm', Government: 'government', 'Central bank': 'central_bank', 'Rest of world': 'rest_of_world', Banks: 'bank' };
  const cast = figureAgents.filter((a) => ASSET_OF[a.name]).map((a) => ({ ...a, L: label(a.name), center: a.group.center }));
  function drawCast(P, focus) {
    for (const a of cast) {
      if (Math.abs(a.center - focus) > 2400) {
        a.L.p = null;
        continue;
      }
      const x = lerp(a.box[0], a.box[2], a.local[0]);
      const sPx = lerp(a.box[3], a.box[1], a.local[1]);
      const gr = ease(smooth(a.center - 1150, a.center - 250, focus));
      const F = pageFrame(x, sPx, P);
      agent(ASSET_OF[a.name], F, [0, 0, 0], 0.085, 0, gr);
      a.L.p = gr > 0.5 ? at(F, [0, 0.07, 0]) : null;
    }
  }

  function post(a, b, r = 0.0016) {
    rod(a, b, r, C.plaster, MAT.matte);
    put(GEO.cyl, rodM(a, add(a, scl(unit(sub(b, a)), 0.002)), r * 3.2), C.plaster);
  }

  // ======================================================================
  // The machine
  // ======================================================================
  const solowY = figs.solow ? figCenter(figs.solow) : pageY('#ch4', 0.3);
  const reveal = {
    capital: figs.solow ? figs.solow.box[1] - 200 : solowY,
    income: pageY('#macro-5') ?? solowY + 1500,
    central: pageY('#macro-6') ?? solowY + 2500,
    valves: figs.islm ? figs.islm.box[1] - 300 : solowY + 3500,
    fiscal: figs.islm ? figCenter(figs.islm) : solowY + 3800,
    pi: pageY('#macro-10') ?? solowY + 5000,
    rule: pageY('#macro-11') ?? solowY + 6000,
    trade: pageY('#macro-13') ?? solowY + 7000,
    record: pageY('#ch5', 0) ?? solowY + 8000,
    labor: pageY('#field-labor') ?? solowY + 12000,
    bank: pageY('#field-banking') ?? solowY + 11000,
    commons: pageY('#field-environmental') ?? solowY + 13000,
  };
  const K = {
    k: 2, s: 0.3,
    Y: 9.09, g: 0, m: 6, r: 2.18,
    pi: 2, pie: 2,
    er: 1, reserves: 0.7, run: 0,
    smoke: 0,
    history: [],
    driven: null,
    flowPhase: {},
  };
  const Yn = (12 + (4 / 3) * 6) / 2.2;

  // pipes in machine coordinates: centrelines and their glass tubes
  const PIPES = {
    C: [[-0.03, 0.014, 0.03], [-0.13, 0.014, 0.03], [-0.13, 0.014, 0.1], [-0.13, 0.25, 0.1], [-0.13, 0.25, 0.0], [-0.012, 0.25, 0.0], [-0.012, 0.2, 0.0]],
    S: [[-0.026, 0.012, -0.034], [-0.06, 0.012, -0.15], [-0.11, 0.012, -0.15], [-0.11, 0.135, -0.15], [-0.125, 0.135, -0.15]],
    T: [[0.026, 0.012, -0.034], [0.06, 0.012, -0.15], [0.11, 0.012, -0.15], [0.11, 0.135, -0.15], [0.125, 0.135, -0.15]],
    I: [[-0.14, 0.012, -0.12], [-0.075, 0.03, -0.07], [-0.04, 0.03, -0.03], [-0.02, 0.24, -0.01], [-0.006, 0.24, -0.006], [-0.006, 0.2, -0.006]],
    Gv: [[0.14, 0.012, -0.12], [0.075, 0.03, -0.07], [0.04, 0.03, -0.03], [0.02, 0.24, -0.01], [0.006, 0.24, -0.006], [0.006, 0.2, -0.006]],
    NX: [[0.0, 0.014, -0.3], [0.0, 0.03, -0.24], [0.0, 0.25, -0.12], [0.0, 0.25, -0.02], [0.0, 0.2, 0.0]],
    sav: [[-0.36, 0.3, -0.02], [-0.3, 0.3, -0.02], [-0.3, 0.275, -0.02]],
  };
  const PIPE = {};
  for (const k in PIPES) {
    const path = polyline(PIPES[k], 0.005, 0.02);
    PIPE[k] = { path, solid: mk(tube(path, 0.0042, 10, false), { kind: 'glass', max: 1 }), len: path.reduce((a, p, i) => a + (i ? len(sub(p, path[i - 1])) : 0), 0) };
  }
  const along = (path, u) => {
    const n = path.length - 1;
    const x = clamp(u, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(x));
    const t = x - i;
    return path[i].map((v, j) => lerp(v, path[i + 1][j], t));
  };
  // the double-well track of the bank module: two hollows, the right one a run
  const WELL = polyline(Array.from({ length: 61 }, (_, i) => {
    const u = i / 60;
    const x = (u - 0.5) * 2;
    return [-0.44 + u * 0.17, 0.006 + 0.11 * (x * x - 0.55) ** 2, 0.24];
  }), 0.003, 0.004);
  const WELL_SOLID = mk(tube(WELL, 0.0022, 8, true), { max: 1 });

  // which part each name belongs to, so only the part being taught is named
  const PART = { k: 'capital', sav: 'capital', dep: 'capital', Y: 'income', hh: 'income', C: 'income', cb: 'central', firm: 'valves', gov: 'valves', pi: 'pi', trade: 'trade', rec: 'record', bank: 'bank', commons: 'commons', workers: 'labor' };
  const ML = {
    k: label('capital k'), sav: label('saving s f(k)'), dep: label('(n + δ) k'),
    Y: label('income Y'), hh: label('households'), C: label('consumption'),
    cb: label('central bank: r'), firm: label('firms: investment I(r)'), gov: label('government: G, T'),
    pi: label('inflation π, expectations πᵉ'), trade: label('rest of world: NX, reserves'),
    rec: label('the record'), bank: label('banks: normal or run'), commons: label('the commons: unpriced'), workers: label('workers'),
    year: label('', 'year'),
  };

  const flows = G.points([], [0, 0, 1, 1], [0.5, 0.72, 1.0], 3.4, 0.9, 0, 700);
  flows.space = 0;
  flows.glow = 0;
  const smokePts = G.points([], [0, 0, 1, 1], [0.62, 0.64, 0.66], 4.2, 0.75, 0, 120);
  smokePts.space = 0;
  smokePts.glow = 0;
  const trace = G.lines([], [0, 0, 1, 1], [0.12, 0.16, 0.22], 1.4, 1, false, 0, 260);
  trace.glow = 0;
  const springA = G.lines([], [0, 0, 1, 1], [0.95, 0.45, 0.36], 1.5, 1, false, 0, 1200);
  const springG = G.lines([], [0, 0, 1, 1], [0.42, 0.47, 0.52], 1.0, 0.9, false, 0, 9000);
  springA.glow = 0;
  springG.glow = 0;
  const machineOver = [flows, smokePts, trace, springA, springG];

  function stepMachine(dt, focus) {
    const d = K.driven;
    K.dt = dt;
    K.time = (K.time ?? 0) + dt;
    const T = dt * 3;
    // Solow
    const sTarget = d?.s ?? (0.3 + 0.1 * smooth(reveal.capital + 900, reveal.capital + 1300, focus));
    K.s = approach(K.s, sTarget, dt, 2);
    const nd = d?.nd ?? 0.08;
    K.nd = approach(K.nd ?? 0.08, nd, dt, 3);
    if (d?.k != null) K.k = approach(K.k, d.k, dt, 5);
    else for (let i = 0; i < 4; i++) K.k += (K.s * Math.pow(Math.max(K.k, 0), 0.35) - nd * K.k) * (T / 4);
    if (focus < reveal.capital - 300) K.k = approach(K.k, 2, dt, 2);
    // IS–LM with a fiscal step, then a policy rule
    if (!d) {
      const gT = 1.5 * smooth(reveal.fiscal - 100, reveal.fiscal + 200, focus);
      K.g = approach(K.g, gT, dt, 1.5);
      if (focus > reveal.rule) K.m += (-0.9 * (K.Y - Yn) - 0.3 * (K.pi - 2)) * dt;
      else K.m = approach(K.m, 6, dt, 1);
      K.m = clamp(K.m, 2, 10);
    } else {
      if (d.m != null) K.m = approach(K.m, d.m, dt, 4);
      if (d.g != null) K.g = approach(K.g, d.g, dt, 4);
    }
    K.r = Math.max(0, 0.9 * K.Y - K.m);
    const Yis = d?.Y ?? 12 + K.g - (4 / 3) * K.r;
    K.Y += (Yis - K.Y) * Math.min(1, (d?.Y != null ? 4 : 1.3) * dt);
    // Phillips: inflation from the output gap and expectations; expectations adapt
    if (d?.pi != null) {
      K.pi = approach(K.pi, d.pi, dt, 4);
      K.pie = approach(K.pie, d.pie ?? K.pie, dt, 4);
    } else {
      K.pi = approach(K.pi, K.pie + 0.9 * (K.Y - Yn), dt, 2);
      K.pie = approach(K.pie, K.pi, dt, focus > reveal.pi ? 0.5 : 4);
    }
    K.er = approach(K.er, d?.er ?? 1, dt, 4);
    K.reserves = approach(K.reserves, d?.reserves ?? 0.7, dt, 4);
    K.run = approach(K.run, d?.run ?? 0, dt, d?.run != null ? 3 : 1.5);
    K.smoke = clamp(K.smoke + dt * 0.04 * smooth(reveal.commons - 400, reveal.commons, focus) - dt * 0.004, 0, 1);
    // the record: a noisy trace of income
    K.clock = (K.clock ?? 0) + dt;
    if (K.clock > 0.08) {
      K.clock = 0;
      K.history.push(K.Y + (Math.random() - 0.5) * 0.35);
      if (K.history.length > 120) K.history.shift();
    }
  }

  function drawMachine(P, focus) {
    // the machine belongs to the textbook's macro chapter; pages without it have no machine
    const vis = figs.solow ? smooth(reveal.capital - 900, reveal.capital - 300, focus) : 0;
    if (vis <= 0.001) {
      flows.set([]);
      smokePts.set([]);
      trace.set([]);
      for (const L of Object.values(ML)) L.p = null;
      return;
    }
    const sAnchor = Math.max(reveal.capital + 200, focus + 70);
    const F = pageFrame(sheetBox[0] - 270, sAnchor, P);
    const g = (key) => ease(smooth(reveal[key] - 500, reveal[key], focus)) * vis;
    const FM = frameMat(F);
    const lm = (p, sc, ry = 0) => fm(F, p, sc, ry);
    const tank = (pos, r, H, level, gr, color = C.water) => {
      if (gr < 0.01) return;
      put(GEO.glass, lm(pos, [r, H * gr, r]), C.glass, MAT.glass);
      put(GEO.cyl, lm([pos[0], 0, pos[2]], [r * 1.18, 0.006 * gr, r * 1.18]), C.plaster);
      put(GEO.cyl, lm([pos[0], H * gr - 0.003, pos[2]], [r * 1.06, 0.003, r * 1.06]), C.plaster);
      const lv = clamp(level, 0.002, 0.98) * H * gr;
      put(GEO.cyl, lm([pos[0], 0.0065 * gr, pos[2]], [r * 0.97, Math.max(0.001, lv - 0.0065 * gr), r * 0.97]), color, MAT.water);
    };
    const pipe = (k, gr) => {
      if (gr < 0.02) return;
      put(PIPE[k].solid, gr > 0.98 ? FM : fm(F, [0, 0, 0], [1, gr, 1]), C.glass, MAT.glass);
    };
    const dots = [];
    const flow = (k, rate, gr) => {
      if (gr < 0.5 || rate <= 0.001) return;
      const pth = PIPE[k].path;
      const n = Math.max(4, Math.round(PIPE[k].len / 0.016));
      K.flowPhase[k] = ((K.flowPhase[k] ?? 0) + (rate * 0.05 * K.dt) / PIPE[k].len) % 1;
      for (let i = 0; i < n; i++) dots.push([...at(F, along(pth, (i / n + K.flowPhase[k]) % 1)), 1]);
    };
    const stream = (from, to, rate, gr) => {
      if (gr < 0.3 || rate <= 0.001) return;
      const a = at(F, from);
      const b = at(F, to);
      put(GEO.cyl, rodM(b, a, 0.0007 + 0.0016 * Math.sqrt(rate)), C.water, MAT.water);
    };

    // capital (Solow)
    const gk = g('capital');
    const kLevel = K.k / 20;
    tank([-0.3, 0, -0.02], 0.045, 0.22, kLevel, gk);
    pipe('sav', gk);
    const inflow = K.s * Math.pow(K.k, 0.35);
    const outflow = (K.nd ?? 0.08) * K.k;
    stream([-0.3, 0.272, -0.02], [-0.3, kLevel * 0.22 * gk, -0.02], inflow, gk);
    put(GEO.cyl, lm([-0.255, 0.008, -0.02], [0.005, 0.004, 0.005]), C.plaster);
    stream([-0.245, 0.01, -0.02], [-0.232, 0.006, 0.05], outflow, gk);
    put(GEO.cyl, lm([-0.232, 0, 0.055], [0.026 * gk, 0.006, 0.026 * gk]), C.plaster);
    ML.k.p = gk > 0.5 ? at(F, [-0.3, 0.24, -0.02]) : null;
    ML.sav.p = gk > 0.5 ? at(F, [-0.36, 0.31, -0.02]) : null;
    ML.dep.p = gk > 0.5 ? at(F, [-0.232, 0.012, 0.075]) : null;

    // income, households and the consumption loop
    const gy = g('income');
    tank([0, 0, 0], 0.042, 0.2, K.Y / 14, gy);
    pipe('C', gy);
    const hhs = [[-0.16, 0.13], [-0.1, 0.17], [-0.2, 0.19]];
    hhs.forEach(([x, z], i) => agent('household', F, [x, 0, z], 0.045, 0.3 + i * 0.4, gy));
    flow('C', 0.6 * K.Y * 0.3, gy);
    ML.Y.p = gy > 0.5 ? at(F, [0, 0.22, 0]) : null;
    ML.hh.p = gy > 0.5 ? at(F, [-0.16, 0.06, 0.15]) : null;
    ML.C.p = gy > 0.5 ? at(F, [-0.13, 0.26, 0.05]) : null;

    // central bank: a dial reading the interest rate
    const gc = g('central');
    agent('central_bank', F, [0.13, 0, 0.13], 0.06, -0.4, gc);
    if (gc > 0.05) {
      const dc = [0.13, 0.085 * gc, 0.13];
      put(GEO.cyl, fm(F, dc, [0.024, 0.003, 0.024]), C.plaster);
      const ang = -Math.PI * 0.75 + clamp(K.r / 8, 0, 1) * Math.PI * 1.5;
      const tip = [dc[0] + 0.02 * Math.cos(ang), dc[1] + 0.0035, dc[2] - 0.02 * Math.sin(ang)];
      rod(at(F, [dc[0], dc[1] + 0.0035, dc[2]]), at(F, tip), 0.0011, C.accent);
    }
    ML.cb.p = gc > 0.5 ? at(F, [0.13, 0.1, 0.13]) : null;

    // investment and government: reservoirs, valves, injections and leakages
    const gv = g('valves');
    tank([-0.16, 0, -0.15], 0.034, 0.12, 0.62, gv);
    tank([0.16, 0, -0.15], 0.034, 0.12, 0.62, gv);
    for (const k of ['S', 'T', 'I', 'Gv']) pipe(k, gv);
    const I = Math.max(0, 3.3 - 0.533 * K.r);
    const Gx = 1.5 + 0.4 * K.g;
    agent('valve', F, [-0.075, 0.018, -0.07], 0.05, -0.85, gv, K.r * 0.9);
    agent('valve', F, [0.075, 0.018, -0.07], 0.05, 0.85, gv, -K.g * 1.6);
    agent('firm', F, [-0.17, 0, -0.04], 0.06, 0.6, gv);
    agent('government', F, [0.18, 0, -0.04], 0.06, -0.6, gv);
    flow('S', 0.25 * K.Y * 0.3, gv);
    flow('T', 0.15 * K.Y * 0.3, gv);
    flow('I', I * 0.3, gv);
    flow('Gv', Gx * 0.3, gv);
    ML.firm.p = gv > 0.5 ? at(F, [-0.17, 0.07, -0.04]) : null;
    ML.gov.p = gv > 0.5 ? at(F, [0.18, 0.07, -0.04]) : null;

    // inflation column with the expectations float
    const gp = g('pi');
    if (gp > 0.01) {
      const H = 0.18;
      put(GEO.glass, lm([0.22, 0, 0.05], [0.011, H * gp, 0.011]), C.glass, MAT.glass);
      put(GEO.cyl, lm([0.22, 0, 0.05], [0.016, 0.005, 0.016]), C.plaster);
      const lv = clamp((K.pi + 1) / 15, 0.02, 0.97) * H * gp;
      put(GEO.cyl, lm([0.22, 0.005, 0.05], [0.0095, lv, 0.0095]), C.accent, MAT.water);
      const le = clamp((K.pie + 1) / 15, 0.02, 0.97) * H * gp;
      put(GEO.cyl, lm([0.22, le, 0.05], [0.017, 0.003, 0.017]), C.ink, MAT.ink);
    }
    ML.pi.p = gp > 0.5 ? at(F, [0.22, 0.2, 0.05]) : null;

    // trade: the rest of the world, an exchange valve, reserves
    const gt = g('trade');
    if (gt > 0.01) {
      agent('rest_of_world', F, [0.0, 0, -0.34], 0.1, 0, gt);
      tank([-0.11, 0, -0.3], 0.03, 0.12, K.reserves, gt, C.ochre);
      pipe('NX', gt);
      agent('valve', F, [0.0, 0.02, -0.24], 0.045, Math.PI / 2, gt, (K.er - 1) * 3);
      flow('NX', 0.25 + 0.2 * (K.er - 1), gt);
    }
    ML.trade.p = gt > 0.5 ? at(F, [0.0, 0.06, -0.34]) : null;

    // the record: income, measured with noise
    const gr = g('record');
    if (gr > 0.01) {
      const o = [0.27, 0, -0.08];
      put(GEO.box, lm(o, [0.09, 0.012 * gr, 0.05]), C.plaster);
      const top = 0.012 * gr + 0.0006;
      const segs = [];
      const n = K.history.length;
      for (let i = 1; i < n; i++) {
        const xa = o[0] - 0.042 + (0.084 * (i - 1)) / 119;
        const xb = o[0] - 0.042 + (0.084 * i) / 119;
        const za = o[2] + 0.02 - clamp((K.history[i - 1] - 6) / 8, 0, 1) * 0.04;
        const zb = o[2] + 0.02 - clamp((K.history[i] - 6) / 8, 0, 1) * 0.04;
        segs.push([at(F, [xa, top, za]), at(F, [xb, top, zb])]);
      }
      trace.set(gr > 0.9 ? segs : []);
    } else trace.set([]);
    ML.rec.p = gr > 0.5 ? at(F, [0.27, 0.02, -0.11]) : null;

    // labor: workers beside the firms
    const gw = g('labor');
    agent('person', F, [-0.21, 0, -0.08], 0.03, 0.2, gw);
    agent('person', F, [-0.225, 0, -0.03], 0.03, -0.3, gw);
    ML.workers.p = gw > 0.5 ? at(F, [-0.22, 0.035, -0.06]) : null;

    // banks: a ball in a double well; the right-hand hollow is a run
    const gb = g('bank');
    if (gb > 0.01) {
      agent('bank', F, [-0.36, 0, 0.14], 0.065, 0.35, gb);
      put(WELL_SOLID, fm(F, [0, 0, 0], [1, gb, 1]), C.ink, MAT.ink);
      for (const x of [-0.44, -0.27]) put(GEO.cyl, lm([x, 0, 0.24], [0.0022, 0.03 * gb, 0.0022]), C.plaster);
      const p = along(WELL, lerp(0.13, 0.87, clamp(K.run, 0, 1)));
      bead(at(F, [p[0], p[1] * gb + 0.0095, p[2]]), 0.0075, K.run > 0.5 ? C.accent : C.plaster);
    }
    ML.bank.p = gb > 0.5 ? at(F, [-0.36, 0.075, 0.14]) : null;

    // the commons: soot from production settles where no price is charged
    const ge = g('commons');
    const smoke = [];
    if (ge > 0.01) {
      put(GEO.cyl, lm([0.05, 0, 0.25], [0.04 * ge, 0.006, 0.04 * ge]), C.plaster);
      put(GEO.cyl, lm([0.05, 0.006, 0.25], [0.034 * ge, 0.0015 + 0.004 * K.smoke, 0.034 * ge]), C.soot);
      const src = [-0.17, 0.08, -0.04];
      const dst = [0.05, 0.02, 0.25];
      for (let i = 0; i < 40; i++) {
        const u = (i / 40 + K.time * 0.04) % 1;
        const p = [lerp(src[0], dst[0], u), lerp(src[1], dst[1], u) + 0.12 * Math.sin(Math.PI * u), lerp(src[2], dst[2], u)];
        smoke.push([...at(F, p), 1]);
      }
    }
    smokePts.set(ge > 0.6 ? smoke : []);
    ML.commons.p = ge > 0.5 ? at(F, [0.05, 0.02, 0.29]) : null;

    flows.set(dots);
    ML.year.p = K.driven?.label ? at(F, [0, 0.33, -0.05]) : null;
    if (K.driven?.label && ML.year.el.dataset.t !== K.driven.label) {
      ML.year.el.textContent = K.driven.label;
      ML.year.el.dataset.t = K.driven.label;
    }
  }

  // the machine redraws the macro figures it embodies
  const machineFigs = [
    { f: figs.solow, live: livePlate('solow'), state: () => ({ s: K.s, k: K.k }) },
    { f: figs.islm, live: livePlate('islm'), state: () => ({ g: K.g, Y: K.Y, r: K.r, m: K.m }) },
  ].filter((m) => m.f && m.live);

  // ======================================================================
  // per frame
  // ======================================================================
  // redraw a live figure only when its state has moved visibly
  function refresh(it) {
    const key = JSON.stringify(it.state(), (k, v) => (typeof v === 'number' ? Math.round(v * 400) / 400 : v));
    if (key === it.live.key) return;
    it.live.key = key;
    it.live.host.replaceChildren();
    it.live.draw(it.state());
    plates.mark(it.live);
  }
  let lastFocus = 0;
  let exhibiting = false;
  function update(P, { dt, appear, dv, exhibit = null, cast: diveCast = null }) {
    Q.clear();
    springSegs.accent.length = 0;
    springSegs.grey.length = 0;
    const focus = P.focus;
    lastFocus = focus;
    // the record chapter drives the machine with data when it is on the reading line
    exhibiting = Boolean(exhibit);
    K.driven = record && !exhibit ? record.drive(focus) : null;
    stepMachine(dt, focus);
    const platesOut = [];
    if (diveCast && dv > 0.02) {
      // inside a concept anatomy only its own agents stand on the page
      flows.set([]);
      smokePts.set([]);
      trace.set([]);
      for (const L of Object.values(ML)) L.p = null;
      for (const a of cast) a.L.p = null;
      for (const c of diveCast) agent(c.name, pageFrame(c.x, c.s, P), [0, c.h, 0], c.scale, c.ry, c.o);
    } else if (exhibit) {
      flows.set([]);
      smokePts.set([]);
      trace.set([]);
      for (const L of Object.values(ML)) L.p = null;
      for (const a of cast) a.L.p = null;
    } else if (appear > 0.02) {
      for (const it of instruments) {
        const near = Math.abs(it.center - focus) < 2400;
        if (!near) continue;
        it.step(dt, focus);
        it.draw(P);
        if (it.live) {
          refresh(it);
          if (it.live.plate) platesOut.push(it.live.plate);
        }
      }
      drawMachine(P, focus);
      drawCast(P, focus);
      for (const mf of machineFigs) {
        if (Math.abs(figCenter(mf.f) - focus) > 2400) continue;
        refresh(mf);
        if (mf.live.plate) platesOut.push(mf.live.plate);
      }
    } else {
      flows.set([]);
      smokePts.set([]);
      trace.set([]);
    }
    const staged = stage.update(P, dt, appear * (1 - dv), exhibit);
    springA.set(springSegs.accent);
    springG.set(springSegs.grey);
    if (record) for (const pl of record.plates(focus)) platesOut.push(pl);
    for (const s of solids) s.set(Q.get(s) ?? []);
    const k = appear * (1 - 0.9 * dv);
    for (const o of machineOver) o.opacity = k * o.baseOpacity;
    return {
      solids: solids.filter((s) => s.kind === 'solid'),
      glass: solids.filter((s) => s.kind === 'glass'),
      over: [...machineOver, ...staged.over],
      plates: platesOut,
      cards: staged.cards,
    };
  }

  function placeLabels(project, vp, W, H, { appear, dv }) {
    const current = (key) => {
      if (K.driven) return (K.driven.show ?? []).includes(key);
      const s = reveal[key];
      return s != null && lastFocus > s - 700 && lastFocus < s + 1900;
    };
    const named = Object.entries(ML).filter(([k]) => k === 'year' || current(PART[k])).map(([, L]) => L);
    const all = exhibiting ? stage.labels : [...instruments.flatMap((i) => (Math.abs(i.center - lastFocus) < 2400 ? i.labels : [])), ...named, ...cast.map((a) => a.L), ...stage.labels];
    const shown = new Set(all);
    for (const L of labels) {
      const pr = shown.has(L) && L.p ? project(vp, L.p, W, H) : null;
      const o = appear * (1 - dv);
      if (!pr || o < 0.03 || pr[0] < -200 || pr[0] > W + 200 || pr[1] < -60 || pr[1] > H + 60) {
        L.el.style.opacity = '0';
        L.el.style.pointerEvents = 'none';
        continue;
      }
      L.el.style.opacity = String(o);
      if (L.el.tagName === 'A') L.el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      // names that are doors stay large enough to read and to hit
      const sz = clamp(2.2 / pr[2], L.el.tagName === 'A' ? 0.95 : 0.5, L.el.tagName === 'A' ? 1.25 : 1.1);
      L.el.style.transform = `translate(${pr[0].toFixed(1)}px, ${pr[1].toFixed(1)}px) scale(${sz.toFixed(3)}) translate(-50%, -110%)`;
    }
  }

  // Instruments that cast a figure hide that figure's drawn construct, except in its dive.
  const owns = new Set([...instruments.map((i) => i.f), ...machineFigs.map((m) => m.f)]);

  return {
    update,
    labels: placeLabels,
    owns: (f) => owns.has(f),
    exhibitInfo: (id) => stage.exhibitInfo(id),
    machine: K,
    destroy() {
      stage.destroy();
      for (const s of solids) s.destroy?.();
      for (const L of labels) L.el.remove();
    },
  };
}

function mul4(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
