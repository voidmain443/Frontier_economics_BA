// 수요·공급 모형 (나중에 packages/models로 옮길 기준 구현).
//
// 수요: 콥-더글러스 소비자들의 합. D(P, I) = 20·I / P
// 공급: S(P) = P − 1
// 균형: 20I/P = P − 1  →  P² − P − 20I = 0

export const demand = (P, I) => (20 * I) / P;
export const supply = (P) => P - 1;

// 수량이 10을 넘지 않는 최저 가격 (그림 상자 안에 머물게 한다)
export const demandPMin = (I) => 2 * I;

export function equilibrium(I) {
  const P = (1 + Math.sqrt(1 + 80 * I)) / 2;
  return { P, Q: P - 1 };
}

// 비교정학 (음함수 정리): dP*/dI = −D_I / (D_P − S_P)
export function dPdI(I) {
  const { P } = equilibrium(I);
  const DI = 20 / P;
  const DP = (-20 * I) / (P * P);
  const SP = 1;
  return -DI / (DP - SP);
}

// 타토느망: dP/dt = k·(D(P) − S(P)), RK4
export function tatonnement(P0, I, k = 0.15, T = 14, dt = 0.05) {
  const f = (P) => k * (demand(P, I) - supply(P));
  const out = [{ t: 0, P: P0 }];
  let P = P0;
  const steps = Math.round(T / dt);
  for (let i = 1; i <= steps; i++) {
    const k1 = f(P);
    const k2 = f(P + (dt / 2) * k1);
    const k3 = f(P + (dt / 2) * k2);
    const k4 = f(P + dt * k3);
    P += (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    out.push({ t: i * dt, P });
  }
  return out;
}

// 이질적 소비자 N명. 소비자 i는 소득 yᵢ의 aᵢ 비율을 이 재화에 쓴다(콥-더글러스 최적해).
// 반환: [wᵢ, colorᵢ] × N.  wᵢ = aᵢ·yᵢ (Σw = 20으로 정규화, 오름차순 정렬)
export function makeConsumers(N, seed = 7) {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const list = [];
  for (let i = 0; i < N; i++) {
    const a = 0.05 + 0.55 * rnd();
    const g = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    const y = Math.exp(0.55 * g);
    list.push([a * y, (a - 0.05) / 0.55]);
  }
  list.sort((p, q) => p[0] - q[0]);
  const sum = list.reduce((acc, p) => acc + p[0], 0);
  const out = new Float32Array(N * 2);
  list.forEach((p, i) => {
    out[i * 2] = (p[0] * 20) / sum;
    out[i * 2 + 1] = p[1];
  });
  return out;
}
