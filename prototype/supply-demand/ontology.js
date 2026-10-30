// 커리큘럼 온톨로지 v0 (프로토타입용 초안). 관계는 "source —type→ target"으로 읽는다.
// 나중에 content/ontology/*.yaml + packages/ontology로 옮긴다.

export const COURSES = [
  { id: 'principles', ko: '경제학원론', n: '01', color: [0.90, 0.91, 0.95] },
  { id: 'math', ko: '경제수학', n: '02', color: [0.66, 0.58, 1.0] },
  { id: 'micro', ko: '미시경제학', n: '03', color: [0.42, 0.66, 1.0] },
  { id: 'macro', ko: '거시경제학', n: '04', color: [1.0, 0.56, 0.38] },
  { id: 'metrics', ko: '계량경제학', n: '05', color: [0.40, 0.88, 0.76] },
  { id: 'field', ko: '각론 · 화폐금융 · 국제', n: '06', color: [1.0, 0.80, 0.36] },
  { id: 'new', ko: '새 경제학', n: '07', color: [0.98, 0.46, 0.78] },
];

export const AGENTS = ['가계', '기업', '정부', '중앙은행', '시장 전체', '연구자의 도구'];

export const MATH_LEVELS = ['직관 · 산수', '미분', '다변수 · 제약 최적화', '선형대수 · 미분방정식', '동적 최적화 · 확률과정'];

// expo: 그림 1에서 이 개념을 펼쳐 보여주는 단계 (0 = 평면 그림)
const C = (id, ko, course, agent, year, who, math, expo) => ({ id, ko, course, agent, year, who, math, expo });

export const CONCEPTS = [
  C('scarcity', '희소성', 'principles', '시장 전체', 1932, '로빈스', 0),
  C('opportunity-cost', '기회비용', 'principles', '가계', 1914, '비저', 0),
  C('comparative-advantage', '비교우위', 'principles', '시장 전체', 1817, '리카도', 0),
  C('economic-agent', '경제주체', 'principles', '시장 전체', 1776, '스미스', 0),
  C('household', '가계', 'principles', '가계', 1965, '베커', 0),
  C('firm', '기업', 'principles', '기업', 1937, '코스', 0),
  C('government', '정부', 'principles', '정부', 1959, '머스그레이브', 0),

  C('optimization', '최적화', 'math', '연구자의 도구', 1947, '새뮤얼슨', 2),
  C('lagrange', '라그랑주 승수', 'math', '연구자의 도구', 1788, '라그랑주', 2),
  C('multivariable', '다변수 미적분', 'math', '연구자의 도구', 1821, '코시', 2),
  C('linear-algebra', '선형대수', 'math', '연구자의 도구', 1858, '케일리', 3),
  C('ode', '미분방정식', 'math', '연구자의 도구', 1776, '오일러', 3),
  C('dynamic-programming', '동적계획법', 'math', '연구자의 도구', 1957, '벨만', 4),
  C('probability', '확률·통계', 'math', '연구자의 도구', 1933, '콜모고로프', 3),

  C('preference', '선호', 'micro', '가계', 1906, '파레토', 1),
  C('utility', '효용', 'micro', '가계', 1789, '벤담', 1),
  C('marginal-utility', '한계효용', 'micro', '가계', 1871, '제번스·멩거·발라', 1),
  C('budget-constraint', '예산제약', 'micro', '가계', 1915, '슬루츠키', 1),
  C('utility-max', '효용극대화', 'micro', '가계', 1939, '힉스', 2),
  C('individual-demand', '개별 수요', 'micro', '가계', 1915, '슬루츠키', 2),
  C('market-demand', '시장 수요', 'micro', '시장 전체', 1890, '마셜', 2, 3),
  C('elasticity', '탄력성', 'micro', '시장 전체', 1890, '마셜', 1),
  C('production-function', '생산함수', 'micro', '기업', 1928, '콥·더글러스', 1),
  C('cost-min', '비용최소화', 'micro', '기업', 1939, '힉스', 2),
  C('cost-curves', '비용곡선', 'micro', '기업', 1931, '바이너', 1),
  C('supply', '공급', 'micro', '기업', 1890, '마셜', 1),
  C('equilibrium', '시장균형', 'micro', '시장 전체', 1890, '마셜', 1, 0),
  C('comparative-statics', '비교정학', 'micro', '시장 전체', 1947, '새뮤얼슨', 2, 1),
  C('tatonnement', '가격 조정 동학', 'micro', '시장 전체', 1874, '발라', 3, 2),
  C('perfect-competition', '완전경쟁', 'micro', '기업', 1921, '나이트', 1),
  C('monopoly', '독점', 'micro', '기업', 1838, '쿠르노', 1),
  C('oligopoly', '과점', 'micro', '기업', 1883, '쿠르노·베르트랑', 2),
  C('game-theory', '게임이론', 'micro', '연구자의 도구', 1944, '폰 노이만·모르겐슈테른', 2),
  C('general-equilibrium', '일반균형', 'micro', '시장 전체', 1954, '애로·드브뢰', 3, 4),
  C('welfare-theorems', '후생경제학 정리', 'micro', '시장 전체', 1951, '애로·드브뢰', 3),
  C('externality', '외부효과', 'micro', '정부', 1920, '피구', 1),
  C('public-goods', '공공재', 'micro', '정부', 1954, '새뮤얼슨', 1),
  C('asymmetric-info', '정보 비대칭', 'micro', '시장 전체', 1970, '애컬로프', 2),

  C('gdp', 'GDP·국민계정', 'macro', '시장 전체', 1934, '쿠즈네츠', 0),
  C('inflation', '물가·인플레이션', 'macro', '중앙은행', 1863, '제번스(물가지수)', 0),
  C('unemployment', '실업', 'macro', '시장 전체', 1936, '케인스', 0),
  C('growth', '경제성장', 'macro', '시장 전체', 1956, '솔로', 3),
  C('consumption-function', '소비함수', 'macro', '가계', 1936, '케인스', 0),
  C('multiplier', '승수', 'macro', '시장 전체', 1931, '칸', 1),
  C('is-lm', 'IS-LM', 'macro', '시장 전체', 1937, '힉스', 1),
  C('ad-as', 'AD-AS', 'macro', '시장 전체', 1975, '교과서 종합', 1),
  C('phillips', '필립스 곡선', 'macro', '시장 전체', 1958, '필립스', 1),
  C('expectations', '합리적 기대', 'macro', '시장 전체', 1972, '무스·루카스', 4),
  C('dsge', 'DSGE', 'macro', '시장 전체', 1982, '키들랜드·프레스콧', 4),
  C('nk-model', '뉴케인지언 모형', 'macro', '중앙은행', 2003, '우드퍼드·갈리', 4),

  C('regression', '회귀분석', 'metrics', '연구자의 도구', 1886, '골턴', 3),
  C('causal-inference', '인과추론', 'metrics', '연구자의 도구', 1994, '앵그리스트·임번스', 3),
  C('time-series', '시계열·VAR', 'metrics', '연구자의 도구', 1980, '심스', 4),

  C('central-bank', '중앙은행', 'field', '중앙은행', 1873, '배젓', 0),
  C('money', '화폐', 'field', '중앙은행', 1911, '피셔', 0),
  C('interest-rate', '이자율', 'field', '중앙은행', 1930, '피셔', 1),
  C('policy-rate', '기준금리', 'field', '중앙은행', 1990, '물가안정목표제', 0),
  C('taylor-rule', '테일러 준칙', 'field', '중앙은행', 1993, '테일러', 1),
  C('transmission', '통화정책 전파경로', 'field', '중앙은행', 1995, '버냉키·거틀러', 1),
  C('financial-market', '금융시장', 'field', '시장 전체', 1970, '파마', 2),
  C('labor-market', '노동시장', 'field', '시장 전체', 1994, '모텐슨·피사리데스', 1),
  C('goods-market', '생산물시장', 'field', '시장 전체', 1890, '마셜', 1),
  C('exchange-rate', '환율', 'field', '시장 전체', 1918, '카셀', 0),
  C('mundell-fleming', '먼델-플레밍', 'field', '시장 전체', 1963, '먼델·플레밍', 1),

  C('behavioral', '행동경제학', 'new', '가계', 1979, '카너먼·트버스키', 2),
  C('institutions', '제도', 'new', '정부', 1990, '노스', 0),
  C('inequality', '불평등', 'new', '정부', 1955, '쿠즈네츠', 1),
  C('environment', '환경·기후', 'new', '정부', 1992, '노드하우스', 2),
  C('financial-crisis', '금융위기', 'new', '시장 전체', 1986, '민스키', 1),
  C('agent-based', '에이전트 기반 모형', 'new', '연구자의 도구', 1988, '산타페 연구소', 3),
  C('networks', '네트워크 경제', 'new', '연구자의 도구', 2008, '잭슨', 3),
  C('capitalism-history', '성장의 역사 (하키스틱)', 'new', '시장 전체', 2001, '매디슨', 0),
];

export const EDGES = [
  ['opportunity-cost', 'scarcity', 'requires'],
  ['comparative-advantage', 'opportunity-cost', 'requires'],
  ['household', 'economic-agent', 'is-a'],
  ['firm', 'economic-agent', 'is-a'],
  ['government', 'economic-agent', 'is-a'],
  ['central-bank', 'economic-agent', 'is-a'],
  ['preference', 'household', 'requires'],
  ['utility', 'preference', 'requires'],
  ['marginal-utility', 'utility', 'requires'],
  ['marginal-utility', 'multivariable', 'requires'],
  ['budget-constraint', 'scarcity', 'requires'],
  ['utility-max', 'utility', 'requires'],
  ['utility-max', 'budget-constraint', 'requires'],
  ['utility-max', 'lagrange', 'requires'],
  ['individual-demand', 'utility-max', 'requires'],
  ['individual-demand', 'market-demand', 'aggregates'],
  ['elasticity', 'market-demand', 'applies'],
  ['production-function', 'firm', 'requires'],
  ['cost-min', 'production-function', 'requires'],
  ['cost-min', 'lagrange', 'requires'],
  ['cost-curves', 'cost-min', 'requires'],
  ['supply', 'cost-curves', 'requires'],
  ['equilibrium', 'market-demand', 'requires'],
  ['equilibrium', 'supply', 'requires'],
  ['comparative-statics', 'equilibrium', 'requires'],
  ['comparative-statics', 'multivariable', 'requires'],
  ['tatonnement', 'equilibrium', 'requires'],
  ['tatonnement', 'ode', 'requires'],
  ['perfect-competition', 'equilibrium', 'requires'],
  ['monopoly', 'perfect-competition', 'relaxes'],
  ['oligopoly', 'monopoly', 'relaxes'],
  ['oligopoly', 'game-theory', 'requires'],
  ['game-theory', 'optimization', 'requires'],
  ['general-equilibrium', 'equilibrium', 'generalizes'],
  ['general-equilibrium', 'tatonnement', 'generalizes'],
  ['general-equilibrium', 'linear-algebra', 'requires'],
  ['welfare-theorems', 'general-equilibrium', 'requires'],
  ['externality', 'welfare-theorems', 'relaxes'],
  ['public-goods', 'welfare-theorems', 'relaxes'],
  ['asymmetric-info', 'welfare-theorems', 'relaxes'],
  ['asymmetric-info', 'probability', 'requires'],
  ['behavioral', 'utility-max', 'contests'],
  ['lagrange', 'optimization', 'requires'],
  ['lagrange', 'multivariable', 'requires'],
  ['ode', 'multivariable', 'requires'],
  ['dynamic-programming', 'optimization', 'requires'],
  ['optimization', 'multivariable', 'requires'],
  ['gdp', 'goods-market', 'measures'],
  ['inflation', 'money', 'requires'],
  ['unemployment', 'labor-market', 'measures'],
  ['growth', 'production-function', 'requires'],
  ['growth', 'ode', 'requires'],
  ['consumption-function', 'household', 'requires'],
  ['multiplier', 'consumption-function', 'requires'],
  ['is-lm', 'multiplier', 'requires'],
  ['is-lm', 'money', 'requires'],
  ['is-lm', 'interest-rate', 'requires'],
  ['is-lm', 'linear-algebra', 'requires'],
  ['ad-as', 'is-lm', 'generalizes'],
  ['ad-as', 'phillips', 'requires'],
  ['phillips', 'inflation', 'requires'],
  ['phillips', 'unemployment', 'requires'],
  ['expectations', 'phillips', 'contests'],
  ['expectations', 'probability', 'requires'],
  ['dsge', 'dynamic-programming', 'requires'],
  ['dsge', 'expectations', 'requires'],
  ['dsge', 'growth', 'generalizes'],
  ['nk-model', 'dsge', 'requires'],
  ['nk-model', 'taylor-rule', 'requires'],
  ['nk-model', 'phillips', 'generalizes'],
  ['nk-model', 'linear-algebra', 'requires'],
  ['money', 'central-bank', 'requires'],
  ['interest-rate', 'money', 'requires'],
  ['policy-rate', 'central-bank', 'requires'],
  ['policy-rate', 'interest-rate', 'requires'],
  ['taylor-rule', 'policy-rate', 'requires'],
  ['taylor-rule', 'inflation', 'requires'],
  ['transmission', 'policy-rate', 'requires'],
  ['transmission', 'financial-market', 'transmits'],
  ['transmission', 'labor-market', 'transmits'],
  ['transmission', 'goods-market', 'transmits'],
  ['financial-market', 'interest-rate', 'requires'],
  ['labor-market', 'equilibrium', 'applies'],
  ['goods-market', 'equilibrium', 'applies'],
  ['exchange-rate', 'interest-rate', 'requires'],
  ['mundell-fleming', 'is-lm', 'generalizes'],
  ['mundell-fleming', 'exchange-rate', 'requires'],
  ['regression', 'probability', 'requires'],
  ['regression', 'linear-algebra', 'requires'],
  ['causal-inference', 'regression', 'requires'],
  ['time-series', 'regression', 'requires'],
  ['time-series', 'transmission', 'measures'],
  ['inequality', 'gdp', 'requires'],
  ['inequality', 'institutions', 'requires'],
  ['institutions', 'economic-agent', 'requires'],
  ['environment', 'externality', 'applies'],
  ['financial-crisis', 'financial-market', 'requires'],
  ['financial-crisis', 'asymmetric-info', 'applies'],
  ['financial-crisis', 'expectations', 'contests'],
  ['agent-based', 'general-equilibrium', 'contests'],
  ['agent-based', 'individual-demand', 'aggregates'],
  ['networks', 'game-theory', 'requires'],
  ['networks', 'transmission', 'applies'],
  ['capitalism-history', 'growth', 'requires'],
  ['capitalism-history', 'inequality', 'requires'],
  ['government', 'public-goods', 'applies'],
];

// 과목 = 개념 그래프 위의 경로. 단계마다 "왜 이 다음인가".
export const PATHS = {
  principles: {
    ko: '01 경제학원론',
    steps: [
      ['scarcity', '모든 것은 희소성에서 시작한다. 원하는 것은 많고 가진 것은 적다.'],
      ['opportunity-cost', '무언가를 고르면 다른 것을 포기한다. 비용의 정의가 바뀐다.'],
      ['comparative-advantage', '포기의 크기를 비교하면 분업과 교역의 이유가 보인다.'],
      ['economic-agent', '선택하는 주체를 가계·기업·정부로 나눈다.'],
      ['equilibrium', '수요와 공급이 만나는 점. 원론은 그림을 먼저 보여 주고 이유는 뒤로 미룬다.'],
      ['elasticity', '곡선의 기울기를 비율로 읽는 법.'],
      ['externality', '시장이 놓치는 것의 첫 번째 예.'],
      ['gdp', '이제 나라 전체를 센다.'],
      ['inflation', '물가는 왜 오르는가.'],
      ['policy-rate', '중앙은행은 무엇을 조절하는가. 원론은 지도 전체를 한 번 얕게 훑는 과목이다.'],
    ],
  },
  micro: {
    ko: '03 미시경제학',
    steps: [
      ['economic-agent', '"누가" 선택하는지를 먼저 정한다. 주체가 있어야 선택을 말할 수 있다.'],
      ['preference', '주체가 무엇을 원하는지부터 적는다.'],
      ['utility', '선호를 숫자로 옮긴다. 이 번역 덕분에 미적분을 쓸 수 있다. 미시의 첫 단순화다.'],
      ['budget-constraint', '원하는 것에는 한계가 있다. 희소성이 직선 하나로 들어온다.'],
      ['utility-max', '원하는 것과 가능한 것이 만나는 점. 제약 최적화 문제다.'],
      ['individual-demand', '가격을 바꿔 가며 최적점을 따라가면 한 사람의 수요곡선이 나온다.'],
      ['market-demand', '개인들을 옆으로 이어 붙이면 시장이 보인다. ⤢ 그림 1의 ③'],
      ['cost-min', '같은 논리를 기업에 적용한다. 비용최소화가 공급의 뿌리다.'],
      ['supply', '한계비용이 공급곡선이 된다.'],
      ['equilibrium', '두 곡선이 만나는 곳. 교과서의 X자.'],
      ['comparative-statics', '외생변수가 바뀌면 균형이 어떻게 움직이는가. ⤢ 그림 1의 ①'],
      ['monopoly', '경쟁시장을 기준점으로 세운 뒤, 가격수용 가정을 하나씩 푼다.'],
      ['oligopoly', '상대의 반응을 고려하기 시작하면 게임이론이 필요하다.'],
      ['general-equilibrium', '시장 하나에서 모든 시장으로. ⤢ 그림 1의 ④'],
      ['welfare-theorems', '경쟁균형은 효율적이다. 그리고 이 정리의 가정 목록이 곧 시장실패의 목록이다.'],
      ['public-goods', '가정이 깨지는 곳마다 각론이 생긴다. 공공재, 외부효과, 정보 비대칭.'],
    ],
  },
  macro: {
    ko: '04 거시경제학',
    steps: [
      ['gdp', '개인이 아니라 나라 전체를 본다. 먼저 무엇을 셀지 정한다.'],
      ['inflation', '측정의 두 번째 숫자, 물가.'],
      ['unemployment', '세 번째 숫자, 실업. 거시는 이 셋을 설명하려는 학문이다.'],
      ['growth', '장기: 생산능력은 어떻게 자라는가. 자본 축적의 미분방정식.'],
      ['consumption-function', '단기: 총수요가 생산을 결정할 수 있다는 케인스의 전환.'],
      ['multiplier', '지출 하나가 소득을 거쳐 몇 배로 번진다.'],
      ['is-lm', '생산물시장과 화폐시장을 동시에 맞추는 연립방정식.'],
      ['ad-as', '물가를 체계 안으로 끌어들인다.'],
      ['phillips', '실업과 인플레이션 사이의 관계, 그리고 그 관계의 불안정성.'],
      ['expectations', '사람들이 정책을 예상한다면? 루카스 비판이 모형의 기초를 바꾼다.'],
      ['nk-model', '기대·가격경직성·정책준칙을 한 체계로 묶는다.'],
      ['policy-rate', '중앙은행의 손잡이.'],
      ['transmission', '금리가 금융시장 → 노동시장 → 생산물시장으로 번지는 길. 이론과 실제 경제가 만나는 곳.'],
    ],
  },
  core: {
    ko: '07 CORE식 순서 (근사)',
    steps: [
      ['capitalism-history', '이론이 아니라 역사에서 출발한다. 지난 250년의 성장은 하키스틱 모양이다.'],
      ['growth', '기술과 인구와 성장. 무엇이 그 꺾임을 만들었나.'],
      ['scarcity', '그다음에 희소성과 선택을 배운다.'],
      ['game-theory', '고립된 선택보다 상호작용을 먼저 다룬다.'],
      ['institutions', '재산권과 권력. 제도가 게임의 규칙을 정한다.'],
      ['firm', '기업은 시장 안의 작은 위계 조직이다.'],
      ['equilibrium', '수요와 공급은 여기서야 등장한다.'],
      ['labor-market', '노동시장과 실업.'],
      ['financial-crisis', '은행, 화폐, 신용, 그리고 위기.'],
      ['inequality', '불평등을 본론으로 다룬다.'],
      ['environment', '환경과 기후를 본론으로 다룬다.'],
    ],
  },
};

// ---------- 렌즈별 레이아웃 (빌드 타임 계산의 대역) ----------

const courseIndex = Object.fromEntries(COURSES.map((c, i) => [c.id, i]));

export const yearX = (y) => -1.75 + 3.5 * Math.pow((clampN(y, 1776, 2020) - 1776) / 244, 1.6);
export const levelY = (l) => (l - 2) * 0.36;
export const YEAR_TICKS = [1776, 1850, 1900, 1950, 2000];

function clampN(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

function anchor(lens, c) {
  const k = courseIndex[c.course];
  if (lens === 'course') {
    // 과목을 계단처럼 쌓는다: 원론(아래 왼쪽) → 새 경제학(위 오른쪽)
    return { p: [(k - 3) * 0.5, (k - 3) * 0.2 + (c.math - 2) * 0.04, Math.sin(k * 1.7) * 0.35], w: [1, 1, 1] };
  }
  if (lens === 'agent') {
    const j = AGENTS.indexOf(c.agent);
    const a = (j / AGENTS.length) * Math.PI * 2;
    return { p: [Math.cos(a) * 1.1, (c.math - 2) * 0.12, Math.sin(a) * 1.1], w: [1, 1, 1] };
  }
  if (lens === 'history') {
    return { p: [yearX(c.year), (k - 3) * 0.17, 0], w: [3, 1.5, 0.35] };
  }
  return { p: [(k - 3) * 0.48, levelY(c.math), 0], w: [0.8, 3, 0.35] };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPRING = { course: 0.5, agent: 0.35, history: 0.08, math: 0.15 };

function solve(lens) {
  const n = CONCEPTS.length;
  const idx = Object.fromEntries(CONCEPTS.map((c, i) => [c.id, i]));
  const anchors = CONCEPTS.map((c) => anchor(lens, c));
  const rnd = rng(11);
  const pos = anchors.map(({ p }) => [p[0] + (rnd() - 0.5) * 0.3, p[1] + (rnd() - 0.5) * 0.3, p[2] + (rnd() - 0.5) * 0.3]);
  const links = EDGES.map(([a, b]) => [idx[a], idx[b]]);
  for (let it = 0; it < 420; it++) {
    const f = pos.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = [pos[i][0] - pos[j][0], pos[i][1] - pos[j][1], pos[i][2] - pos[j][2]];
        const r2 = Math.max(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 0.004);
        const k = 0.0042 / r2;
        for (let a = 0; a < 3; a++) {
          f[i][a] += d[a] * k;
          f[j][a] -= d[a] * k;
        }
      }
    }
    for (const [a, b] of links) {
      const d = [pos[b][0] - pos[a][0], pos[b][1] - pos[a][1], pos[b][2] - pos[a][2]];
      const L = Math.hypot(d[0], d[1], d[2]) || 1e-6;
      const k = SPRING[lens] * (L - 0.3);
      for (let c = 0; c < 3; c++) {
        f[a][c] += (d[c] / L) * k;
        f[b][c] -= (d[c] / L) * k;
      }
    }
    for (let i = 0; i < n; i++) {
      const { p, w } = anchors[i];
      for (let a = 0; a < 3; a++) f[i][a] += (p[a] - pos[i][a]) * w[a];
    }
    const step = it < 300 ? 0.06 : 0.02;
    for (let i = 0; i < n; i++) {
      const m = Math.hypot(f[i][0], f[i][1], f[i][2]);
      const s = m > 1 ? step / m : step;
      for (let a = 0; a < 3; a++) pos[i][a] += f[i][a] * s;
    }
  }
  return pos;
}

export function computeLayouts() {
  return { course: solve('course'), agent: solve('agent'), history: solve('history'), math: solve('math') };
}
