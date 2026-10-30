import { mat4, project } from './math.js';
import * as SD from './econ.js';
import { createRenderer } from './renderer.js';
import { createHero } from './hero.js';
import { CONCEPTS, EDGES } from './ontology.js';

const $ = (s) => document.querySelector(s);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
const mixc = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const approach = (cur, target, dt, rate) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
const lerpRect = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 종이 ↔ 설계 공간 팔레트
const PAPER = {
  bg: [0.957, 0.937, 0.902], ink: [0.12, 0.12, 0.13], grid: [0.85, 0.82, 0.76],
  dem: [0.15, 0.27, 0.62], sup: [0.70, 0.22, 0.14], acc: [0.62, 0.45, 0.08],
};
const SPACE = {
  bg: [0.035, 0.047, 0.066], ink: [0.80, 0.85, 0.92], grid: [0.20, 0.27, 0.36],
  dem: [0.42, 0.66, 1.0], sup: [1.0, 0.53, 0.36], acc: [1.0, 0.85, 0.40],
};
const STABLE = [0.45, 0.95, 0.62];
const UNSTABLE = [1.0, 0.4, 0.36];

const N = 8192;
const K = 48;
const T = 14;
const KAPPA = 0.22;
const FLOW_N = 24576;

const S = {
  income: 1,
  cross: 0.4,
  expo: 0,
  expoTarget: 0,
  stage: 1,
  layer: { 1: 0, 2: 0, 3: 0, 4: 0 },
  az: 0.72, el: 0.34, azT: 0.72, elT: 0.34,
  zoom: 1,
  zBase: 0,
  reveal2: -0.5,
  reveal3: 0,
  time: 0,
  agentsDirty: true,
};

const fmt = (x) => x.toFixed(2);
const sgn = (x) => (x >= 0 ? `+ ${fmt(x)}` : `− ${fmt(-x)}`);

// 두 시장 퍼텐셜 (shaders.js와 같은 식)
const potential = (p1, p2, c) => {
  const d1 = p1 - 5;
  const d2 = p2 - 5;
  return 0.5 * (d1 * d1 - 2 * c * d1 * d2 + d2 * d2);
};
const potWorld = (p1, p2, c, lift = 0.008) => [p1 / 10, 0.45 + 0.4 * Math.tanh(potential(p1, p2, c) / 20) + lift, p2 / 10 - 0.5];

const STAGES = {
  1: {
    title: '① 곡면: 곡선의 이동은 단면을 옮기는 것',
    body: '교과서의 수요곡선은 소득 I를 하나의 값으로 고정해 자른 단면이다. 실제 수요는 가격과 소득을 함께 받는 함수 D(P, I)이고, 그 그래프는 곡면이다. 소득이 바뀌면 곡선이 "이동"하는 것이 아니라, 이 곡면 위에서 다른 단면으로 미끄러진다. 노란 곡선은 소득마다의 균형점을 이은 것이고, 그 기울기가 비교정학의 답이다. 소득 슬라이더를 움직여 보라.',
    formula: () => {
      const e = SD.equilibrium(S.income);
      return `dP*/dI = −D<sub>I</sub> / (D<sub>P</sub> − S<sub>P</sub>) = <b>${fmt(SD.dPdI(S.income))}</b>` +
        `<small>I = ${fmt(S.income)} · P* = ${fmt(e.P)} · Q* = ${fmt(e.Q)}</small>`;
    },
    math: ['다변수 미적분', '음함수 정리'],
    az: 0.72, el: 0.34,
    zBase: () => S.income - 1,
    zText: 'I  소득 →',
    slider: 'income',
  },
  2: {
    title: '② 시간: 균형으로 가는 길',
    body: '2D 그래프는 균형이 어디인지만 말한다. 가격이 그곳에 어떻게 도착하는지는 시간축 위의 미분방정식이다. 가격은 초과수요, 곧 두 곡선 사이의 가로 간격에 비례해 움직인다. 위에서 출발해도 아래에서 출발해도 간격이 0이 되는 같은 점으로 수렴한다. 이것이 균형의 안정성이다. 맨 앞 평면이 교과서의 그림이고, 뒤로 펼쳐진 것이 그 그림에 이르는 시간이다.',
    formula: () => `dP/dt = k · (D(P) − S(P))<small>k = ${KAPPA} · RK4 · 출발 가격 9.5와 ${fmt(2.2 * S.income)}</small>`,
    math: ['미분방정식', '안정성 분석'],
    az: 0.95, el: 0.30,
    zBase: () => 0.5,
    zText: 't  시간 →',
    slider: 'income',
  },
  3: {
    title: '③ 소비자: 수요는 어디서 오는가',
    body: `시장 수요곡선 뒤에는 ${N.toLocaleString()}명의 소비자가 있다. 소득과 취향이 저마다 다르고, 각자 예산 안에서 효용을 극대화한다. 가격마다 이들의 수요량을 차례로 옆으로 이어 붙이면(수평 합), 맨 앞 가장자리에 우리가 아는 시장 수요곡선이 생긴다. 소득을 움직일 때마다 GPU compute 셰이더가 ${(N * K).toLocaleString()}개의 점을 다시 계산한다.`,
    formula: () => `q<sub>i</sub> = a<sub>i</sub>·y<sub>i</sub>·I / P &nbsp;&nbsp; D(P) = Σ<sub>i</sub> q<sub>i</sub>(P)<small>소비자 정렬: 지출 aᵢ·yᵢ 오름차순 · 색 = 선호 aᵢ (파랑 → 주황)</small>`,
    math: ['제약 최적화', '합(집계)'],
    az: 0.62, el: 0.42,
    zBase: () => 0.5,
    zText: 'i  소비자 (누적) →',
    slider: 'income',
  },
  4: {
    title: '④ 여러 시장: 안정성은 고유값이 정한다',
    body: `시장이 둘 이상이면 한 시장의 가격이 다른 시장의 수요를 움직인다. 가격 벡터 p = (p₁, p₂)는 연립 미분방정식을 따르고, 균형 근처의 움직임은 행렬 A 하나로 요약된다. A가 대칭이면 이 동학은 곡면 V를 따라 내려가는 경사 흐름이다. ${FLOW_N.toLocaleString()}개의 입자가 compute 셰이더 위에서 그 경사를 따라 흐른다. 교차효과 c를 키워 보라. 교차효과가 자기가격 효과(대각)보다 커지는 순간 고유값 하나가 양수가 되고, 그릇이 안장으로 뒤집힌다.`,
    formula: () => {
      const l1 = -1 + S.cross;
      const l2 = -1 - S.cross;
      const ok = l1 < 0 && l2 < 0;
      return `dp/dt = A(p − p*)<br>A = [ −1, c ; c, −1 ],&nbsp; c = ${fmt(S.cross)}` +
        `<br>λ₁ = −1 ${sgn(S.cross)} = <b style="color:${l1 < 0 ? '#74f29e' : '#ff6b5c'}">${fmt(l1)}</b>` +
        `<br>λ₂ = −1 ${sgn(-S.cross)} = <b style="color:${l2 < 0 ? '#74f29e' : '#ff6b5c'}">${fmt(l2)}</b>` +
        `<small>${ok ? '안정: 두 고유값이 모두 음수 → 모든 경로가 p*로 모인다 (그릇)' : '불안정: 양의 고유값 → 안장점, 균형에서 멀어지는 방향이 생긴다'}</small>`;
    },
    math: ['선형대수', '고유값·고유벡터', '연립 미분방정식'],
    az: 0.62, el: 0.62,
    zBase: () => 0.5,
    zText: 'p₂  재화 2 가격 →',
    slider: 'cross',
  },
};

// ---------- 기하 ----------

function segs(list) {
  const a = new Float32Array(list.length * 8);
  list.forEach(([p, q], i) => a.set([p[0], p[1], p[2], 1, q[0], q[1], q[2], 1], i * 8));
  return a;
}
const pairs = (pts) => pts.slice(1).map((p, i) => [pts[i], p]);
const sample = (fn, n, t0, t1) => Array.from({ length: n + 1 }, (_, i) => fn(lerp(t0, t1, i / n)));
function dashed(p, q, dash = 0.02, gap = 0.014) {
  const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
  const out = [];
  for (let s = 0; s < len; s += dash + gap) out.push([lerp3(p, q, s / len), lerp3(p, q, Math.min(s + dash, len) / len)]);
  return out;
}

const demandCurve = (I) => pairs(sample((P) => [SD.demand(P, I) / 10, P / 10, 0], 140, SD.demandPMin(I), 10));

function staticGeometry(O) {
  const wall = [];
  const floor = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    wall.push([[t, 0, -0.5], [t, 1, -0.5]], [[0, t, -0.5], [1, t, -0.5]]);
    floor.push([[t, 0, -0.5], [t, 0, 0.5]], [[0, 0, t - 0.5], [1, 0, t - 0.5]]);
  }
  O.wall.set(segs(wall));
  O.floor.set(segs(floor));

  const c = [];
  for (const x of [0, 1]) for (const y of [0, 1]) c.push([[x, y, -0.5], [x, y, 0.5]]);
  for (const x of [0, 1]) for (const z of [-0.5, 0.5]) c.push([[x, 0, z], [x, 1, z]]);
  for (const y of [0, 1]) for (const z of [-0.5, 0.5]) c.push([[0, y, z], [1, y, z]]);
  O.box.set(segs(c));

  O.axes.set(segs([
    [[0, 0, 0], [1.06, 0, 0]], [[1.06, 0, 0], [1.035, 0.013, 0]], [[1.06, 0, 0], [1.035, -0.013, 0]],
    [[0, 0, 0], [0, 1.06, 0]], [[0, 1.06, 0], [0.013, 1.035, 0]], [[0, 1.06, 0], [-0.013, 1.035, 0]],
  ]));
  O.slice.set(segs(pairs([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]])));
  O.d0.set(segs(demandCurve(1)));
  O.s.set(segs([[[0, 0.1, 0], [0.9, 1, 0]]]));
  O.eqCurve.set(segs(pairs(sample((i) => {
    const e = SD.equilibrium(i);
    return [e.Q / 10, e.P / 10, i - 1];
  }, 80, 0.5, 1.5))));
}

function rebuild(O) {
  const I = S.income;
  const e = SD.equilibrium(I);
  const E = [e.Q / 10, e.P / 10, 0];
  O.d.set(segs(demandCurve(I)));
  O.guides.set(segs([...dashed(E, [0, E[1], 0]), ...dashed(E, [E[0], 0, 0])]));
  O.eq.set(new Float32Array([E[0], E[1], 0, 0]));

  // 시간축: 위·아래 두 출발점에서의 타토느망 경로
  const z = (t) => -0.5 + t / T;
  const trD = [];
  const trS = [];
  const trP = [];
  const ladder = [];
  for (const P0 of [9.5, 2.2 * I]) {
    const path = SD.tatonnement(P0, I, KAPPA, T);
    trD.push(...pairs(path.map(({ t, P }) => [SD.demand(P, I) / 10, P / 10, z(t)])));
    trS.push(...pairs(path.map(({ t, P }) => [SD.supply(P) / 10, P / 10, z(t)])));
    trP.push(...pairs(path.map(({ t, P }) => [0, P / 10, z(t)])));
    path.filter((_, i) => i % 16 === 0).forEach(({ t, P }) => {
      ladder.push([[SD.supply(P) / 10, P / 10, z(t)], [SD.demand(P, I) / 10, P / 10, z(t)]]);
    });
  }
  O.trD.set(segs(trD));
  O.trS.set(segs(trS));
  O.trP.set(segs(trP));
  O.ladder.set(segs(ladder));
  O.rail.set(segs([...dashed([0, E[1], -0.5], [0, E[1], 0.5]), ...dashed([E[0], E[1], -0.5], [E[0], E[1], 0.5])]));

  S.agentsDirty = true;
}

// 두 시장: 고유벡터 선과 균형점
function rebuildMarkets(O) {
  const c = S.cross;
  const along = (v) => pairs(sample((s) => {
    const p1 = 5 + v[0] * s;
    const p2 = 5 + v[1] * s;
    return potWorld(p1, p2, c, 0.012);
  }, 90, -4.9, 4.9));
  O.eig1.set(segs(along([1, 1])));
  O.eig2.set(segs(along([1, -1])));
  const top = potWorld(5, 5, c, 0.0);
  O.pstar.set(new Float32Array([top[0], top[1], top[2], 0]));
  O.pdrop.set(segs(dashed([0.5, 0, 0], top, 0.015, 0.012)));
}

// ---------- 라벨 (DOM 오버레이) ----------

function makeLabels() {
  const eq = () => SD.equilibrium(S.income);
  const ghost = () => clamp(Math.abs(S.income - 1) * 20, 0, 1);
  const base = () => 1 - S.layer[4];
  const defs = [
    { text: 'P', cls: 'ax', pos: () => [-0.045, 1.075, S.zBase], vis: base },
    { text: 'Q', cls: 'ax', pos: () => [1.09, -0.025, S.zBase], vis: base },
    { text: 'D', cls: 'dem', pos: () => { const P = SD.demandPMin(S.income) * 1.08; return [SD.demand(P, S.income) / 10 + 0.025, P / 10 + 0.015, S.zBase]; }, vis: base },
    { text: 'S', cls: 'sup', pos: () => [0.9 + 0.025, 0.985, S.zBase], vis: base },
    { text: 'E*', cls: 'pt', pos: () => [eq().Q / 10 + 0.03, eq().P / 10 + 0.04, S.zBase], vis: base },
    { text: 'P*', cls: 'tick', pos: () => [-0.05, eq().P / 10, S.zBase], vis: (e) => 1 - e },
    { text: 'Q*', cls: 'tick', pos: () => [eq().Q / 10, -0.055, S.zBase], vis: (e) => 1 - e },
    { text: 'D₀', cls: 'dem ghost', pos: () => [SD.demand(2.16, 1) / 10 + 0.025, 0.216 + 0.015, S.zBase], vis: (e) => ghost() * (1 - e) },
    { text: () => STAGES[S.stage].zText, cls: 'ax3', pos: () => [-0.03, -0.03, 0.58], vis: (e) => e },
    { text: '수요 곡면 D(P, I)', cls: 'dem tag', pos: () => [SD.demand(4.2, 1.5) / 10, 0.42, 0.5], vis: () => S.layer[1] },
    { text: '공급 S(P)', cls: 'sup tag', pos: () => [0.78, 0.88, -0.5], vis: () => S.layer[1] },
    { text: '균형점의 궤적 (I별)', cls: 'acc tag', pos: () => { const e = SD.equilibrium(0.5); return [e.Q / 10 + 0.04, e.P / 10 - 0.04, -0.5]; }, vis: () => S.layer[1] },
    { text: '지금의 단면', cls: 'acc tag', pos: () => [1.0, 1.04, S.zBase], vis: () => S.layer[1] },
    { text: 'P(t)', cls: 'acc tag', pos: () => [-0.03, 0.95, -0.5], vis: () => S.layer[2] },
    { text: 't = 0', cls: 'tag', pos: () => [1.02, -0.02, -0.5], vis: () => S.layer[2] },
    { text: 't = T (교과서의 그림)', cls: 'tag', pos: () => [1.02, -0.02, 0.5], vis: () => S.layer[2] },
    { text: '초과수요 D − S', cls: 'tag', pos: () => [0.5, 0.95, -0.5], vis: () => S.layer[2] },
    { text: '소비자 i = 1', cls: 'tag', pos: () => [0.0, 1.02, -0.5], vis: () => S.layer[3] },
    { text: `i = ${N.toLocaleString()}`, cls: 'tag', pos: () => [0.0, 1.02, 0.5], vis: () => S.layer[3] },
    { text: '시장 수요 = Σ qᵢ', cls: 'dem tag', pos: () => [SD.demand(3.2, S.income) / 10 + 0.03, 0.32, 0.5], vis: () => S.layer[3] },
    { text: 'p₁  재화 1 가격 →', cls: 'ax3', pos: () => [1.04, 0, 0.56], vis: () => S.layer[4] },
    { text: 'p* 일반균형', cls: 'acc tag', pos: () => { const p = potWorld(5, 5, S.cross); return [p[0], p[1] + 0.06, p[2]]; }, vis: () => S.layer[4] },
    { text: 'λ₁ 고유벡터 (1, 1)', cls: 'tag eig1', pos: () => potWorld(9.3, 9.3, S.cross, 0.04), vis: () => S.layer[4] },
    { text: 'λ₂ 고유벡터 (1, −1)', cls: 'tag eig2', pos: () => potWorld(9.3, 0.7, S.cross, 0.04), vis: () => S.layer[4] },
    { text: 'V(p): 동학의 퍼텐셜', cls: 'tag', pos: () => potWorld(0.4, 9.6, S.cross, 0.05), vis: () => S.layer[4] },
  ];
  const root = $('#labels');
  return defs.map((d) => {
    const el = document.createElement('div');
    el.className = `lbl ${d.cls}`;
    root.appendChild(el);
    return { ...d, el, last: '' };
  });
}

function updateLabels(labels, vp, W, H, clip, e) {
  for (const L of labels) {
    const text = typeof L.text === 'function' ? L.text() : L.text;
    if (text !== L.last) { L.el.textContent = text; L.last = text; }
    const vis = L.vis ? L.vis(e) : 1;
    const p = vis > 0.02 ? project(vp, L.pos(), W, H) : null;
    const inside = p && p[0] > clip.x - 4 && p[0] < clip.x + clip.w + 4 && p[1] > clip.y - 4 && p[1] < clip.y + clip.h + 4;
    if (!inside) {
      L.el.style.opacity = '0';
      continue;
    }
    L.el.style.opacity = String(vis);
    L.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -50%)`;
  }
}

// ---------- 앱 ----------

async function main() {
  const canvas = $('#gpu');
  const stageEl = $('#fig1 .figure-stage');
  $('#stat-concepts').textContent = CONCEPTS.length;
  $('#stat-edges').textContent = EDGES.length;

  let R;
  try {
    R = await createRenderer(canvas);
  } catch (err) {
    console.error(err);
    stageEl.innerHTML = '<div class="nogpu"><b>이 도표는 WebGPU가 필요합니다.</b><br>최신 Chrome·Edge, 또는 Safari 26 이상에서 열어 주세요.</div>';
    document.querySelectorAll('#expo-btn, #income').forEach((el) => { el.disabled = true; });
    document.body.classList.add('nogpu');
    return;
  }

  const O = {
    wall: R.lines(32), floor: R.lines(32), box: R.lines(12),
    surfS: R.surface(1, 24), surfD: R.surface(0, 96), surfV: R.surface(2, 72),
    trD: R.lines(800), trS: R.lines(800), trP: R.lines(800), ladder: R.lines(64), rail: R.lines(128),
    eqCurve: R.lines(96), slice: R.lines(8),
    eig1: R.lines(100), eig2: R.lines(100), pdrop: R.lines(64), pstar: R.points(1),
    axes: R.lines(8), guides: R.lines(128), d0: R.lines(160), s: R.lines(4), d: R.lines(160),
    eq: R.points(4),
  };
  const agents = R.agents(SD.makeConsumers(N), N, K);
  O.cloud = R.points(0, agents.buffer, agents.count);
  O.cloud.mode = 1;
  O.cloud.scale = [0.1, 0.1, 1];
  O.cloud.offset = [0, 0, -0.5];
  const flow = R.flow(FLOW_N);
  O.flow = R.lines(FLOW_N, flow.buffer);

  const drawOrder = [
    O.wall, O.floor, O.box, O.surfS, O.surfD, O.surfV, O.flow, O.cloud,
    O.ladder, O.rail, O.trD, O.trS, O.trP, O.eqCurve, O.slice,
    O.pdrop, O.eig1, O.eig2, O.pstar,
    O.axes, O.guides, O.d0, O.s, O.d, O.eq,
  ];

  staticGeometry(O);
  rebuild(O);
  rebuildMarkets(O);
  const labels = makeLabels();

  // UI
  const incomeInputs = [$('#income'), $('#income2')];
  const incomeOutputs = [$('#income-out'), $('#income2-out')];
  const panel = { title: $('#st-title'), body: $('#st-body'), formula: $('#st-formula'), math: $('#st-math') };
  const tabs = [...document.querySelectorAll('.tabs button')];

  function updatePanel() {
    const st = STAGES[S.stage];
    panel.title.textContent = st.title;
    panel.body.textContent = st.body;
    panel.formula.innerHTML = st.formula();
    panel.math.innerHTML = st.math.map((m) => `<span class="badge">${m}</span>`).join('');
    tabs.forEach((b) => b.classList.toggle('on', +b.dataset.stage === S.stage));
    $('#income-ctl2').hidden = st.slider !== 'income';
    $('#cross-ctl').hidden = st.slider !== 'cross';
  }

  function setIncome(v) {
    S.income = +v;
    incomeInputs.forEach((el) => { el.value = v; });
    incomeOutputs.forEach((el) => { el.value = fmt(S.income); });
    rebuild(O);
    updatePanel();
  }

  function setCross(v) {
    S.cross = +v;
    $('#cross-out').value = fmt(S.cross);
    rebuildMarkets(O);
    updatePanel();
  }

  function setStage(n) {
    S.stage = n;
    S.azT = STAGES[n].az;
    S.elT = STAGES[n].el;
    if (n === 2) S.reveal2 = -0.5;
    if (n === 3) S.reveal3 = 0;
    updatePanel();
  }

  function enterExpo(stage = 1) {
    S.expoTarget = 1;
    setStage(stage);
    document.body.classList.add('expo');
    document.documentElement.classList.add('lock');
  }

  function exitExpo() {
    S.expoTarget = 0;
    document.body.classList.remove('expo');
    document.documentElement.classList.remove('lock');
  }

  // 온톨로지 노드 → 그림 1의 해당 단계
  function openStage(stage) {
    $('#fig1').scrollIntoView({ block: 'center', behavior: 'instant' });
    if (stage > 0) requestAnimationFrame(() => enterExpo(stage));
  }

  incomeInputs.forEach((el) => el.addEventListener('input', () => setIncome(el.value)));
  $('#cross').addEventListener('input', (ev) => setCross(ev.target.value));
  $('#expo-btn').addEventListener('click', () => enterExpo(1));
  $('#back-btn').addEventListener('click', exitExpo);
  tabs.forEach((b) => b.addEventListener('click', () => setStage(+b.dataset.stage)));
  addEventListener('keydown', (ev) => {
    if (!S.expoTarget) return;
    if (ev.key === 'Escape') exitExpo();
    if (['1', '2', '3', '4'].includes(ev.key)) setStage(+ev.key);
  });

  // 궤도 회전
  const hit = $('#orbit-hit');
  let drag = null;
  hit.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, y: ev.clientY };
    hit.setPointerCapture(ev.pointerId);
  });
  hit.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    S.az -= (ev.clientX - drag.x) * 0.006;
    S.el = clamp(S.el + (ev.clientY - drag.y) * 0.004, -0.2, 1.35);
    S.azT = S.az;
    S.elT = S.el;
    drag = { x: ev.clientX, y: ev.clientY };
  });
  hit.addEventListener('pointerup', () => { drag = null; });
  hit.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    S.zoom = clamp(S.zoom * Math.exp(ev.deltaY * 0.001), 0.5, 2.2);
  }, { passive: false });

  // 히어로
  const hero = createHero(R, {
    section: $('#hero'),
    labelsRoot: $('#hero-labels'),
    tooltip: $('#tooltip'),
    caption: $('#path-caption'),
    onOpen: openStage,
  });
  const lensBtns = [...document.querySelectorAll('[data-lens]')];
  const pathBtns = [...document.querySelectorAll('[data-path]')];
  lensBtns.forEach((b) => b.addEventListener('click', () => {
    hero.setLens(b.dataset.lens);
    lensBtns.forEach((x) => x.classList.toggle('on', x === b));
  }));
  pathBtns.forEach((b) => b.addEventListener('click', () => {
    hero.setPath(b.dataset.path);
    pathBtns.forEach((x) => x.classList.toggle('on', x.dataset.path === hero.path));
  }));

  updatePanel();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.time += dt;

    const dur = reduceMotion ? 0.01 : 1.25;
    S.expo = clamp(S.expo + (Math.sign(S.expoTarget - S.expo) * dt) / dur, 0, 1);
    document.body.classList.toggle('expo-done', S.expo > 0.999);
    const e = ease(S.expo);
    for (const k of [1, 2, 3, 4]) S.layer[k] = approach(S.layer[k], S.expoTarget && S.stage === k ? 1 : 0, dt, 5);
    S.zBase = approach(S.zBase, S.expoTarget ? STAGES[S.stage].zBase() : S.income - 1, dt, 6);
    if (S.expoTarget) {
      S.az = approach(S.az, S.azT, dt, 3);
      S.el = approach(S.el, S.elT, dt, 3);
    }
    if (S.stage === 2) S.reveal2 = Math.min(0.5, S.reveal2 + dt * 0.4);
    if (S.stage === 3) S.reveal3 = Math.min(1, S.reveal3 + dt * 0.4);

    // 크기와 사각형
    const W = innerWidth;
    const H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    R.resize(Math.round(W * dpr), Math.round(H * dpr));
    const b = stageEl.getBoundingClientRect();
    const ph = { x: b.left, y: b.top, w: b.width, h: b.height };
    const wide = W >= 900;
    const full = { x: 0, y: 0, w: W, h: H };
    const viewFull = wide ? { x: 380, y: 0, w: W - 380, h: H } : { x: 0, y: 0, w: W, h: H * 0.56 };
    const bgRect = lerpRect(ph, full, e);
    const view = lerpRect(ph, viewFull, e);

    // 카메라: 정사영에 가까운 원근 → dolly-zoom → 원근
    const aspect = view.w / view.h;
    const fov = (lerp(0.6, 34, e) * Math.PI) / 180;
    const h2 = Math.max(0.6, 0.62 / aspect);
    const h3 = Math.max(1.0, 1.15 / aspect) * S.zoom;
    const h = lerp(h2, h3, e);
    const target = [lerp(0.52, 0.5, e), lerp(0.5, 0.45, e), 0];
    const az = S.az * e;
    const el = S.el * e;
    const dist = h / Math.tan(fov / 2);
    const eye = [
      target[0] + dist * Math.sin(az) * Math.cos(el),
      target[1] + dist * Math.sin(el),
      target[2] + dist * Math.cos(az) * Math.cos(el),
    ];
    const proj = mat4.perspective(fov, aspect, Math.max(0.01, dist - 4), dist + 4);
    const viewM = mat4.lookAt(eye, target, [0, 1, 0]);
    const vp = mat4.multiply(mat4.rect(view, W, H), mat4.multiply(proj, viewM));

    // 팔레트와 스타일
    const pal = {};
    for (const k in PAPER) pal[k] = mixc(PAPER[k], SPACE[k], e);
    const z = [0, 0, S.zBase];
    const s1 = S.layer[1] * e;
    const s2 = S.layer[2] * e;
    const s3 = S.layer[3] * e;
    const s4 = S.layer[4] * e;
    const baseA = 1 - S.layer[4];
    const ghost = clamp(Math.abs(S.income - 1) * 20, 0, 1);
    const style = (o, color, width, opacity, offset = [0, 0, 0], alpha = 1) => {
      o.color = [...color, alpha];
      o.width = width * dpr;
      o.opacity = opacity;
      o.offset = offset;
    };
    style(O.wall, pal.grid, 1, lerp(0.9, 0.6, e));
    style(O.floor, pal.grid, 1, 0.7 * e);
    style(O.box, pal.grid, 1.2, e);
    style(O.axes, pal.ink, 1.6, (1 - 0.3 * e) * baseA, z);
    style(O.guides, pal.ink, 1.2, 0.6 * (1 - e), z);
    style(O.d0, pal.dem, 2, 0.4 * ghost * (1 - e), z);
    style(O.s, pal.sup, 2.8, baseA, z);
    style(O.d, pal.dem, 2.8, baseA, z);
    style(O.eqCurve, pal.acc, 2.4, s1);
    style(O.slice, pal.acc, 1.2, 0.7 * s1, z);
    style(O.trD, pal.dem, 1.8, s2);
    style(O.trS, pal.sup, 1.8, s2);
    style(O.trP, pal.acc, 2.2, s2);
    style(O.ladder, pal.ink, 1, 0.45 * s2);
    style(O.rail, pal.acc, 1, 0.5 * s2);
    for (const o of [O.trD, O.trS, O.trP, O.ladder]) o.reveal = S.reveal2;

    const l1 = -1 + S.cross;
    const l2 = -1 - S.cross;
    style(O.flow, [0.78, 0.86, 1.0], 1.0, 0.38 * s4, [0, 0, 0], 1);
    style(O.eig1, l1 < 0 ? STABLE : UNSTABLE, 2.4, s4);
    style(O.eig2, l2 < 0 ? STABLE : UNSTABLE, 2.4, s4);
    style(O.pdrop, pal.acc, 1, 0.6 * s4);
    O.pstar.color = [...pal.acc, 1];
    O.pstar.size = 11 * dpr;
    O.pstar.opacity = s4;
    for (const el2 of document.querySelectorAll('.lbl.eig1')) el2.style.color = l1 < 0 ? '#74f29e' : '#ff6b5c';
    for (const el2 of document.querySelectorAll('.lbl.eig2')) el2.style.color = l2 < 0 ? '#74f29e' : '#ff6b5c';

    O.surfD.color = [...pal.dem, 0.2];
    O.surfD.line = [...pal.dem, 0.45];
    O.surfD.opacity = s1;
    O.surfS.color = [...pal.sup, 0.12];
    O.surfS.line = [...pal.sup, 0.3];
    O.surfS.opacity = s1;
    O.surfV.color = [0.30, 0.42, 0.62, 0.22];
    O.surfV.line = [0.62, 0.74, 0.95, 0.45];
    O.surfV.opacity = s4;
    O.surfV.param = S.cross;

    O.cloud.color = [1, 1, 1, 0.6];
    O.cloud.size = 1.6 * dpr;
    O.cloud.opacity = s3;
    O.cloud.reveal = S.reveal3;

    O.eq.color = [...mixc(pal.ink, pal.acc, e), 1];
    O.eq.size = 9 * dpr;
    O.eq.offset = z;
    O.eq.opacity = baseA;

    const agentsDirty = S.agentsDirty;
    S.agentsDirty = false;
    const flowOn = s4 > 0.01;
    const lifted = mixc(pal.bg, [0.075, 0.1, 0.15], e);
    const figView = {
      viewProj: vp,
      bg: {
        inner: lifted,
        outer: pal.bg,
        center: [(view.x + view.w * 0.5) * dpr, (view.y + view.h * 0.5) * dpr],
        radius: Math.max(view.w, view.h) * 0.9 * dpr,
      },
      scissor: { x: bgRect.x * dpr, y: bgRect.y * dpr, w: bgRect.w * dpr, h: bgRect.h * dpr },
      objects: drawOrder,
      compute: (enc) => {
        if (agentsDirty) agents.encode(enc, S.income);
        if (flowOn) flow.encode(enc, { a: 1, c: S.cross, dt: dt * 0.9, time: S.time });
      },
    };

    const heroView = hero.frame(dt, W, H, dpr);
    R.render(heroView ? [heroView, figView] : [figView]);

    updateLabels(labels, vp, W, H, bgRect, e);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
