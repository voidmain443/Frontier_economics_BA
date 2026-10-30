// 히어로: 커리큘럼 온톨로지 그래프. 같은 캔버스의 두 번째 뷰로 그린다.

import { mat4, project } from './math.js';
import {
  COURSES, AGENTS, CONCEPTS, EDGES, PATHS, MATH_LEVELS, YEAR_TICKS,
  yearX, levelY, computeLayouts,
} from './ontology.js';

const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

const BG_INNER = [0.075, 0.095, 0.15];
const BG_OUTER = [0.012, 0.016, 0.03];
const ACC = [1.0, 0.85, 0.4];
const EDGE = [0.55, 0.64, 0.8];

function segs(list) {
  const a = new Float32Array(list.length * 8);
  list.forEach(([p, q], i) => a.set([p[0], p[1], p[2], 1, q[0], q[1], q[2], 1], i * 8));
  return a;
}

function pts(list) {
  const a = new Float32Array(list.length * 4);
  list.forEach((p, i) => a.set([p[0], p[1], p[2], 0], i * 4));
  return a;
}

function centroid(points) {
  const s = [0, 0, 0];
  for (const p of points) for (let a = 0; a < 3; a++) s[a] += p[a] / points.length;
  return s;
}

export function createHero(R, { section, labelsRoot, tooltip, caption, onOpen }) {
  const L = computeLayouts();
  const n = CONCEPTS.length;
  const idx = Object.fromEntries(CONCEPTS.map((c, i) => [c.id, i]));
  const links = EDGES.map(([a, b]) => [idx[a], idx[b]]);
  const neighbors = CONCEPTS.map(() => new Set());
  for (const [a, b] of links) {
    neighbors[a].add(b);
    neighbors[b].add(a);
  }
  const groups = COURSES.map((c) => CONCEPTS.flatMap((x, i) => (x.course === c.id ? [i] : [])));
  const expoNodes = CONCEPTS.flatMap((c, i) => (c.expo !== undefined ? [i] : []));
  // 기본 화면에서 라벨을 보여줄 개념: 연결이 많은 허브와 ⤢ 개념
  const notable = CONCEPTS.map((c, i) => c.expo !== undefined || neighbors[i].size >= 5);

  const H = {
    from: 'course', to: 'course', t: 1,
    path: null, pathT: 0, step: -1,
    hover: -1, mouse: null,
    dragAz: 0, dragEl: 0, time: 0,
    screen: new Array(n).fill(null),
  };
  const et = () => ease(H.t);
  const lensW = (name) => (H.to === name ? et() : 0) + (H.from === name ? 1 - et() : 0);

  // ---- GPU 객체 ----
  const O = {
    decorYear: R.lines(16),
    decorMath: R.lines(8),
    edges: R.lines(links.length),
    pathAll: R.lines(40),
    edgesHi: R.lines(links.length),
    pathDone: R.lines(40),
    halo: groups.map((g) => R.points(g.length)),
    expo: R.points(expoNodes.length),
    nodes: groups.map((g) => R.points(g.length)),
    hi: R.points(n),
    cometGlow: R.points(1),
    comet: R.points(1),
  };
  const drawOrder = [
    O.decorYear, O.decorMath, O.edges, O.pathAll, O.edgesHi, O.pathDone,
    ...O.halo, O.expo, ...O.nodes, O.hi, O.cometGlow, O.comet,
  ];

  // 렌즈 장식 (정적)
  const axisY = -0.82;
  O.decorYear.set(segs([
    [[yearX(1776), axisY, 0], [yearX(2020), axisY, 0]],
    ...YEAR_TICKS.map((y) => [[yearX(y), axisY, 0], [yearX(y), axisY + 0.05, 0]]),
  ]));
  O.decorMath.set(segs(MATH_LEVELS.map((_, l) => [[-1.75, levelY(l), 0], [1.75, levelY(l), 0]])));

  // ---- 라벨 ----
  const mk = (cls, text) => {
    const el = document.createElement('div');
    el.className = `hl ${cls}`;
    el.textContent = text;
    labelsRoot.appendChild(el);
    return el;
  };
  const nodeLabels = CONCEPTS.map((c) => mk(`node${c.expo !== undefined ? ' expo' : ''}`, c.ko + (c.expo !== undefined ? ' ⤢' : '')));
  const decor = [
    ...COURSES.map((c, k) => ({
      el: mk('title', `${c.n} ${c.ko}`),
      pos: [0, 0.42, 0].map((o, a) => centroid(groups[k].map((i) => L.course[i]))[a] + o),
      lens: 'course',
    })),
    ...AGENTS.map((ag) => {
      const members = CONCEPTS.flatMap((c, i) => (c.agent === ag ? [L.agent[i]] : []));
      return { el: mk('title', ag), pos: [0, 0.45, 0].map((o, a) => centroid(members)[a] + o), lens: 'agent' };
    }),
    ...YEAR_TICKS.map((y) => ({ el: mk('tick', String(y)), pos: [yearX(y), axisY - 0.08, 0], lens: 'history' })),
    ...MATH_LEVELS.map((m, l) => ({ el: mk('tick left', `${l} ${m}`), pos: [-1.8, levelY(l), 0], lens: 'math' })),
  ];

  // ---- 상호작용 ----
  let drag = null;
  section.addEventListener('pointerdown', (ev) => {
    if (ev.target.closest('button, a')) return;
    drag = { x: ev.clientX, y: ev.clientY, moved: 0 };
  });
  addEventListener('pointermove', (ev) => {
    const r = section.getBoundingClientRect();
    const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    H.mouse = inside ? [ev.clientX, ev.clientY] : null;
    if (!drag) return;
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    H.dragAz -= dx * 0.005;
    H.dragEl = clamp(H.dragEl + dy * 0.004, -0.5, 0.9);
    drag.x = ev.clientX;
    drag.y = ev.clientY;
  });
  addEventListener('pointerup', () => {
    if (drag && drag.moved < 6 && H.hover >= 0) {
      const c = CONCEPTS[H.hover];
      if (c.expo !== undefined) onOpen(c.expo);
    }
    drag = null;
  });

  function setLens(name) {
    if (name === H.to) return;
    // 진행 중인 모프는 현재 위치에서 이어 붙이지 않고 끝 상태 기준으로 새로 시작한다
    H.from = H.t > 0.5 ? H.to : H.from;
    H.to = name;
    H.t = 0;
  }

  function setPath(id) {
    H.path = H.path === id ? null : id;
    H.pathT = 0;
    H.step = -1;
    caption.classList.toggle('on', !!H.path);
    if (!H.path) caption.innerHTML = '';
  }

  // ---- 프레임 ----
  function frame(dt, W, Hh, dpr) {
    H.time += dt;
    H.t = Math.min(1, H.t + dt / 1.6);

    const r = section.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= Hh || document.body.classList.contains('expo-done')) {
      labelsRoot.style.visibility = 'hidden';
      return null;
    }
    labelsRoot.style.visibility = 'visible';

    const t = et();
    const cur = CONCEPTS.map((_, i) => lerp3(L[H.from][i], L[H.to][i], t));

    // 카메라
    const wide = W >= 900;
    const view = wide
      ? { x: r.left + r.width * 0.34, y: r.top, w: r.width * 0.66, h: r.height }
      : { x: r.left, y: r.top + r.height * 0.3, w: r.width, h: r.height * 0.7 };
    const aspect = view.w / view.h;
    const fov = (36 * Math.PI) / 180;
    const h = Math.max(0.95, 1.7 / aspect) * (1 + 0.12 * lensW('history'));
    const az = Math.sin(H.time * 0.07) * 0.45 + H.dragAz;
    const el = 0.14 + 0.5 * lensW('agent') + H.dragEl;
    const dist = h / Math.tan(fov / 2);
    const eye = [dist * Math.sin(az) * Math.cos(el), dist * Math.sin(el), dist * Math.cos(az) * Math.cos(el)];
    const vp = mat4.multiply(
      mat4.rect(view, W, Hh),
      mat4.multiply(mat4.perspective(fov, aspect, Math.max(0.05, dist - 4), dist + 4), mat4.lookAt(eye, [0, 0, 0], [0, 1, 0])),
    );

    // 경로 재생
    let pathNodes = [];
    let comet = null;
    let doneSegs = [];
    if (H.path) {
      const steps = PATHS[H.path].steps;
      pathNodes = steps.map(([id]) => idx[id]);
      const total = steps.length - 1 + 1.5;
      H.pathT = (H.pathT + dt * 0.36) % total;
      const step = Math.min(Math.floor(H.pathT), steps.length - 1);
      const frac = step < steps.length - 1 ? clamp((H.pathT - step - 0.45) / 0.55, 0, 1) : 0;
      const a = cur[pathNodes[step]];
      const b = cur[pathNodes[Math.min(step + 1, pathNodes.length - 1)]];
      comet = lerp3(a, b, ease(frac));
      for (let i = 0; i < step; i++) doneSegs.push([cur[pathNodes[i]], cur[pathNodes[i + 1]]]);
      doneSegs.push([a, comet]);
      if (step !== H.step) {
        H.step = step;
        const [id, why] = steps[step];
        caption.innerHTML = `<div class="cap-head"><span>${PATHS[H.path].ko}</span><span>${String(step + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}</span></div>` +
          `<div class="cap-title">${CONCEPTS[idx[id]].ko}</div><div class="cap-why">${why}</div>`;
      }
    }

    // 호버 판정
    H.hover = -1;
    if (H.mouse && !drag) {
      let best = 16;
      H.screen.forEach((s, i) => {
        if (!s) return;
        const d = Math.hypot(s[0] - H.mouse[0], s[1] - H.mouse[1]);
        if (d < best) {
          best = d;
          H.hover = i;
        }
      });
    }
    section.style.cursor = H.hover >= 0 ? (CONCEPTS[H.hover].expo !== undefined ? 'pointer' : 'help') : 'grab';

    const hi = new Set();
    if (H.hover >= 0) {
      hi.add(H.hover);
      neighbors[H.hover].forEach((j) => hi.add(j));
    }
    if (H.path) hi.add(pathNodes[H.step]);
    const focus = H.path || H.hover >= 0;

    // 업로드
    O.edges.set(segs(links.map(([a, b]) => [cur[a], cur[b]])));
    O.edgesHi.set(segs(H.hover >= 0 ? links.filter(([a, b]) => a === H.hover || b === H.hover).map(([a, b]) => [cur[a], cur[b]]) : []));
    O.pathAll.set(segs(pathNodes.slice(1).map((j, i) => [cur[pathNodes[i]], cur[j]])));
    O.pathDone.set(segs(doneSegs));
    groups.forEach((g, k) => {
      const p = pts(g.map((i) => cur[i]));
      O.nodes[k].set(p);
      O.halo[k].set(p);
      const col = COURSES[k].color;
      Object.assign(O.nodes[k], { color: [...col, 1], size: 7 * dpr, opacity: focus ? 0.45 : 0.95 });
      Object.assign(O.halo[k], { color: [...col, 1], size: 26 * dpr, opacity: focus ? 0.05 : 0.11 });
    });
    O.expo.set(pts(expoNodes.map((i) => cur[i])));
    Object.assign(O.expo, { color: [...ACC, 1], size: 17 * dpr, opacity: 0.32 + 0.12 * Math.sin(H.time * 3) });
    O.hi.set(pts([...hi].map((i) => cur[i])));
    Object.assign(O.hi, { color: [1, 1, 1, 1], size: 10 * dpr, opacity: 1 });
    O.comet.set(pts(comet ? [comet] : []));
    O.cometGlow.set(pts(comet ? [comet] : []));
    Object.assign(O.comet, { color: [...ACC, 1], size: 12 * dpr, opacity: 1 });
    Object.assign(O.cometGlow, { color: [...ACC, 1], size: 46 * dpr, opacity: 0.18 });

    const line = (o, color, width, opacity) => Object.assign(o, { color: [...color, 1], width: width * dpr, opacity });
    line(O.edges, EDGE, 1, focus ? 0.12 : 0.26);
    line(O.edgesHi, ACC, 1.6, 0.85);
    line(O.pathAll, ACC, 1.2, 0.35);
    line(O.pathDone, ACC, 3, 0.95);
    line(O.decorYear, EDGE, 1.2, 0.5 * lensW('history'));
    line(O.decorMath, EDGE, 1, 0.16 * lensW('math'));

    // 라벨
    const ws = cur.map((p) => vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15]);
    const wmin = Math.min(...ws);
    const wmax = Math.max(...ws);
    const inView = (s) => s && s[0] > r.left && s[0] < r.right && s[1] > r.top && s[1] < r.bottom;
    cur.forEach((p, i) => {
      const s = project(vp, p, W, Hh);
      H.screen[i] = inView(s) ? s : null;
      const el = nodeLabels[i];
      if (!H.screen[i]) {
        el.style.opacity = '0';
        return;
      }
      const depth = 1 - 0.7 * ((ws[i] - wmin) / Math.max(wmax - wmin, 1e-6));
      const on = hi.has(i) || (H.path && pathNodes.includes(i));
      el.classList.toggle('on', on);
      el.style.opacity = String(on ? 1 : notable[i] && !focus ? 0.72 * depth : 0);
      el.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    });
    for (const d of decor) {
      const w = lensW(d.lens);
      const s = w > 0.02 ? project(vp, d.pos, W, Hh) : null;
      if (!inView(s)) {
        d.el.style.opacity = '0';
        continue;
      }
      d.el.style.opacity = String(w);
      d.el.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    }

    // 툴팁
    if (H.hover >= 0 && H.mouse) {
      const c = CONCEPTS[H.hover];
      const course = COURSES.find((x) => x.id === c.course);
      tooltip.innerHTML = `<div class="tt-title">${c.ko}<span>${c.who} · ${c.year}</span></div>` +
        `<div class="tt-row">${course.n} ${course.ko} · 주체: ${c.agent}</div>` +
        `<div class="tt-row">수학 ${c.math}: ${MATH_LEVELS[c.math]} · 연결 ${neighbors[H.hover].size}개</div>` +
        (c.expo !== undefined ? `<div class="tt-go">⤢ 누르면 그림 1${c.expo ? `의 ${'①②③④'[c.expo - 1]}단계` : ''}로 이동</div>` : '');
      tooltip.style.transform = `translate(${H.mouse[0] + 16}px, ${H.mouse[1] + 16}px)`;
      tooltip.classList.add('on');
    } else {
      tooltip.classList.remove('on');
    }

    return {
      viewProj: vp,
      bg: {
        inner: BG_INNER,
        outer: BG_OUTER,
        center: [(view.x + view.w * 0.5) * dpr, (view.y + view.h * 0.5) * dpr],
        radius: Math.max(view.w, view.h) * 0.8 * dpr,
      },
      scissor: { x: r.left * dpr, y: r.top * dpr, w: r.width * dpr, h: r.height * dpr },
      objects: drawOrder,
    };
  }

  return { frame, setLens, setPath, get lens() { return H.to; }, get path() { return H.path; } };
}
