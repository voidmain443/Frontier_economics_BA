# 단면 / Cross-Section

> 교과서의 경제 그래프는 고차원 구조의 **단면**이다.

경제학 학부 커리큘럼을 개념 그래프(온톨로지) 위에서 다시 설계하고, 그 설계를 공간으로 보여주는 프로젝트의 런칭 사이트.

- **2D (종이)** — 교과서처럼 단순화된 그래프. 그 자체로 완결된, 좋은 틀이다.
- **Expo (공간)** — 같은 그래프를 들어 올리면 그 단순화가 무엇을 접어 두었는지 드러난다. 곡면, 시간축, 미분방정식, 행렬. 그래서 경제수학을 왜 배워야 하는지가 보인다.

## 문서

| 문서 | 내용 |
|---|---|
| [docs/vision.md](docs/vision.md) | 무엇을, 왜: 서사, 커리큘럼 3층 구조, 챕터 틀, 쇼케이스 2개 |
| [docs/ontology.md](docs/ontology.md) | 개념 그래프 스키마와 렌즈 |
| [docs/architecture.md](docs/architecture.md) | 기술 스택과 WebGPU 엔진 설계 |
| [docs/roadmap.md](docs/roadmap.md) | 단계별 마일스톤과 완료 조건 |
| [docs/redesign.md](docs/redesign.md) | 재설계 기준(2026-10-30): 한 번의 접힘, 숨은 차원, 1부 8단계 |
| [docs/part1-manuscript.md](docs/part1-manuscript.md) | 1부 원고와 검토 기록 |
| [docs/decisions.md](docs/decisions.md) | 결정 기록 (2026-10-29 grill 세션) |
| [docs/world.md](docs/world.md) | 2차 grill: 하나의 세계(건물), 배치표, W0~W4의 기록 |
| [docs/engine.md](docs/engine.md) | 다음 단계(3차 grill): 경제의 엔진, 페이지는 엔진의 단면, E1~E6 |
| [docs/phase4-test.md](docs/phase4-test.md) | 4단계 확인: 전공자 관찰 절차, 질문지, 정답·판정 기준, 관찰지 |
| [docs/reference/shopify-editions-fall26.md](docs/reference/shopify-editions-fall26.md) | 레퍼런스 사이트 분석 (영상 + 번들) |

## 상태

M0 착수 전. 핵심 경험을 검증한 프로토타입 둘이 있다.

### 사이트 구조 (2026-10-30): 세 부분 + 교재 페이지

`prototype/traditional/`은 이제 여러 페이지로 된 정적 사이트다. 경로는 나중에 Remix 3 라우트로 그대로 옮길 수 있게 맞췄다.

| 페이지 | 내용 |
|---|---|
| `index.html` | 세 부분 소개 + 17개 과목 교재로 가는 문 |
| `classical.html` | **1부, 고전 교재**: 주체와 시장이 하나씩 더해지는 8단계와 그림 30개. 그림마다 '고정된 것'과 그 축을 따라간 설명이 있다. 표제란의 **Fold the page into space**가 유일한 3D 모드다(`fold.js`). 페이지 전체가 리본으로 접히고, 그림이 읽는 줄에 오면 그 그림이 고정해 둔 축(`p1-fold.js`)이 제자리에서 솟는다. Esc나 같은 버튼으로 같은 자리의 평면으로 돌아온다. |
| `beyond.html` | **2부, 평면 밖으로**: 1부 맺음말의 가정을 하나씩 푸는 다섯 절이다(누가 누구와 거래하나, 사슬, 대표 기업은 없다, 실제 사람의 게임, 은행 간 전염). 절마다 1부의 출발 그림과 'Held fixed'가 있고, 세 그림은 독자가 설정을 바꿀 수 있다. 접으면 고전 그림에 없는 차원이 솟는다(`p2-figs.js`, `p2-fold.js`, `p2-models.js`). 끝에 교재 프로젝트를 둔다. |
| `archive.html` | **3부, 새 아카이브**: 제안 글, 아카이브 평면도(방법·제도·시장·주체 네 층, 방 24개, 각 방은 과목으로 가는 링크), 고전과 현대를 잇는 가정 표, 세 갈래 길, 교재 목록. 접으면 카메라가 물러나 평면도 옆에 선 건물 전체가 보이고, 1부의 고전 경로와 세 갈래 길이 그 위에 그려진다. 방 이름은 키보드로도 고를 수 있는 문이다(`p3-figs.js`, `world.js`). |
| `course.html?c=<id>` | 과목별 교재: 주차 사다리, 1·2부에서 이 과목이 나오는 곳, 다른 과목과 만나는 교차점, 다음에 읽을 것(실라버스, 교재) |

### 프로토타입 ②: `prototype/traditional/` (최신)

*Cross-Section*. 학부 경제학 커리큘럼(원론 → 경제수학 → 미시 → 거시 → 계량 → 각론)이 왜 그 순서로 쌓이는지, 현대 경제학이 그 가정을 어떻게 푸는지 설명하는 영어 사이트다. 판단 기준은 `docs/redesign.md`다.

- **평면**: 엔지니어링 계산 용지 위의 도면이다. 그림은 모두 SVG이고, 그림마다 'Held fixed' 줄이 그 그림이 고정해 둔 축을 적는다. 오른쪽 아래 표제란이 지금 단계와 지금까지 나온 그림 수를 보여 준다.
- **접힘(유일한 3D 모드)**: 표제란의 버튼을 누르면 페이지 전체를 html-in-canvas(`GPUQueue.copyElementImageToTexture`)로 캡처한다. 2,048px 높이의 타일에 밉맵을 쓴다. 캡처한 도면은 청사진 공간 속에서 리본처럼 뒤로 눕고 휜다. 그림이 읽는 줄에 다가오면 그 그림의 숨은 축이 제자리에서 솟고, 읽고 지나가면 다시 종이로 내려앉는다. 같은 버튼이나 Esc로 같은 자리의 평면으로 돌아온다.
- **주체 모형**: 중요한 주체에만 Blender로 만든 흰 건축 모형을 세운다(`tools/blender/make_agents.py` → `assets/agents/*.glb`). 지금 쓰는 모형은 가계, 기업, 은행, 정부, 중앙은행, 외국, 사람의 7종이다.
- **과목 페이지**: `curriculum.js`에 과목 17개(핵심 6: 원론·경제수학·미시·게임이론·거시·계량, 각론 11), 주차 138개, 교차점 9개가 있다. 각 주차는 질문, 답, 핵심 식, *Builds on / Used in* 링크를 가진다. 교차점마다 증명 사슬이 붙는다. 각론의 순서는 MIT OCW(14.41, 14.54, 14.13 등), Berkeley Econ 182, Mishkin의 실제 강의계획을 따르고, 출처를 각 과목 페이지에 적었다. `ladder.js`가 이를 렌더한다.
- **데이터**: `tools/fetch_data.py`가 ECOS·KOSIS·FRED·EIA·OpenDART와 Maddison Project에서 받아 `data/*.json`으로 만든다. 키는 루트 `.env`에만 있다(웹 비공개, `.gitignore`). 출처 코드는 `data/SOURCES.md`에 있다.
- 필요 환경: WebGPU와 HTML-in-Canvas를 지원하는 Chrome(156에서 확인). 지원하지 않으면 평면만 보인다.

| 파일 | 맡은 일 |
|---|---|
| `page.js` | 세 부분 공통: 그림 그리기, 식 번호, 표제란, 접힘 버튼 연결 |
| `fold.js` | 접힘 하나: 캡처, 카메라, 그림별 구조의 솟음과 내려앉음, 라벨과 문 |
| `world.js` | 접힌 공간의 건물: 방 24개, 1·2부의 배치표, 페이지가 지나는 길, 군중이 설 자리 (`docs/world.md`). 1부는 쓰지 않는다 |
| `market.js` | 경제의 엔진의 시장: 제로 지능 제약 거래자의 이중경매(Gode and Sunder 1993)와 효율 계산 (`docs/engine.md`) |
| `gpu.js`, `shaders.js` | WebGPU 렌더러와 WGSL, 리본 좌표(`toWorld`), html-in-canvas 복사 |
| `maquettes.js`, `geo3d.js` | Blender 주체 모형(GLB) 로더 |
| `figures.js` | SVG `plot()`과 그림 7.1의 회귀 데이터 |
| `p1-*.js`, `p2-*.js`, `p3-*.js` | 각 부의 평면 그림(`-figs`), 접으면 솟는 구조(`-fold`, 1·2부), 2부의 모형(`p2-models.js`) |
| `curriculum.js`, `ladder.js`, `course.js` | 과목 데이터와 과목 페이지 |
| `math.js`, `geom.js` | 행렬, 곡면과 사각형의 정점 |

```sh
python3 -m http.server 5182 --bind 127.0.0.1 --directory prototype/traditional
# → http://127.0.0.1:5182
```

### 프로토타입 ①: `prototype/supply-demand/`

빌드 도구 없이 raw WebGPU만 쓴 단일 페이지다. 이름은 supply-demand지만 지금은 런칭 페이지의 축소판이다.

- **히어로: 온톨로지 그래프.** 개념 72개와 관계 106개(`ontology.js`). 렌즈 4종(학제·주체·역사·수학) 사이를 모프하고, 과목 경로 4개(원론·미시·거시·CORE식)를 "왜 이 다음인가" 캡션과 함께 재생한다. ⤢ 개념을 누르면 그림 1의 해당 Expo 단계로 이동한다.
- **그림 1: 수요·공급.** 종이(2D)에서 Expo 4단계로 펼쳐진다. ① 곡면·비교정학, ② 시간·타토느망(RK4), ③ 소비자 8,192명 compute 집계, ④ 2시장 일반균형. ④는 퍼텐셜 곡면 위를 흐르는 입자 24,576개(compute)와 고유값에 따른 안정·안장 전환으로 보여준다.
- 두 화면 모두 **WebGPU 캔버스 하나에 뷰 두 개**로 그린다(결정 A2 검증). Apple GPU(Metal 3), DPR 2, MSAA 4x 기준 120fps.

```sh
python3 -m http.server 5180 --bind 127.0.0.1 --directory prototype/supply-demand
# → http://127.0.0.1:5180  (WebGPU 지원 브라우저 필요)
```

M0에서 `packages/engine`·`packages/models`·`packages/ontology`로 흡수한다. `renderer.js`와 `shaders.js`는 engine으로, `econ.js`는 models로, `ontology.js`는 ontology(+ content YAML)로 옮긴다.
