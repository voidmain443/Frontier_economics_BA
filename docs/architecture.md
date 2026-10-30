# 아키텍처

## 전체 그림

```
content/                     원고·온톨로지·데이터 스냅샷 (사람이 쓰는 것)
  ├─ chapters/ko/*.mdx
  ├─ ontology/{concepts,courses}/*.yaml
  └─ data/*.json             ECOS·FRED 스냅샷 (스크립트로 생성해 커밋)
        │ build
        ▼
apps/site  (Astro + MDX)     본문 = 정적 HTML, 누구나 읽음
        │ mount
        ▼
packages/engine  (WebGPU)    캔버스 하나, 도표 = 뷰, 2D↔3D 모프
   ▲            ▲
   │            └─ packages/ontology  스키마·검증·렌즈 레이아웃
   └─ packages/models          경제 모형: TS 기준 구현 + WGSL compute 커널
```

**엔진은 사이트 프레임워크를 모른다.** `packages/engine`은 DOM 요소와 장면 데이터만 받는다. Astro를 다른 프레임워크로 바꿔도 엔진은 그대로다.

## 리포 구조

```
cross-section/
├─ apps/site/                Astro 5, MDX, content layer (glob 로더로 ../../content 읽기)
├─ packages/engine/
│  ├─ src/gpu/               device·context·프레임 루프·리사이즈·DPR
│  ├─ src/camera/            정사영↔원근 모프 (dolly-zoom)
│  ├─ src/passes/            grid · surface · line · point · slab · shadow
│  ├─ src/views/             DOM 자리표시자 ↔ 뷰포트 동기화
│  ├─ src/labels/            3D → 화면 투영 DOM 라벨
│  ├─ src/html-in-canvas/    페이지 단위 Expo 어댑터 (실험 API 격리)
│  └─ src/shaders/*.wgsl
├─ packages/models/
│  ├─ src/supply-demand/     균형, 타토느망 ODE, 거미집, 이질적 소비자 집계, 다시장 야코비
│  ├─ src/nk3/               3방정식 NK: 미정계수법 해, 결정성 판정, 충격반응
│  └─ kernels/*.wgsl         큰 N 전용 compute 커널
├─ packages/ontology/        zod 스키마, 검증, 렌즈별 레이아웃 계산(빌드 타임)
├─ content/                  위 그림 참고
├─ scripts/data/             ECOS·FRED 스냅샷 수집
└─ docs/
```

## 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript (strict) | |
| 패키지 | pnpm workspaces | |
| 사이트 | Astro 5 + MDX + content collections | 정적 출력. 3D는 아일랜드 없이 바닐라 TS로 마운트한다. |
| 수식 | remark-math + rehype-katex | 빌드 타임 렌더 |
| 렌더 | **raw WebGPU + WGSL** | 엔진 추상화 라이브러리는 쓰지 않는다 |
| 행렬 | `wgpu-matrix` | WebGPU 클립 공간(z 0..1) 기준 |
| 버퍼 레이아웃 | `webgpu-utils` | WGSL struct 반영으로 uniform 오프셋 계산 |
| 그래프 레이아웃 | `d3-force-3d` (빌드 타임, Node) | 시드 고정 |
| 테스트 | Vitest (models·ontology), Playwright + WebGPU Chromium (엔진 스크린샷) | |
| 데이터 | 한국은행 ECOS API, FRED API | API 키는 CI 환경변수에만 둔다. 클라이언트에는 스냅샷만 간다. |
| 호스팅 | 정적 호스팅 (Cloudflare Pages / Vercel 중 택1, 미정) | |

## 엔진 설계

### 1. 캔버스 하나, 뷰 여러 개

화면 뒤에 고정된 전체 화면 `<canvas>` 하나를 둔다. 본문의 각 도표는 DOM 자리표시자(`<figure data-scene="supply-demand">`)일 뿐이다. 매 프레임 자리표시자의 `getBoundingClientRect()`를 읽고, 그 사각형에 viewport와 scissor를 걸어 해당 장면을 그린다.

- Expo 때 도표가 **자기 상자를 벗어나 화면 전체로** 커질 수 있다. 사각형만 보간하면 된다.
- GPU 디바이스와 컨텍스트가 하나뿐이라 도표 수가 늘어도 비용이 일정하다.
- 페이지 단위 Expo(아래 6)도 같은 캔버스를 쓴다.

### 2. 2D와 3D는 같은 도형, 카메라만 다르다

D13(WebGPU 필수)에 따라 2D 도표도 엔진이 그린다. 2D 화면 = z=0 단면을 정면에서 보는 **정사영** 카메라다. Expo = **dolly-zoom**: 카메라를 뒤로 빼면서 화각을 넓혀, 초점면의 크기는 그대로 둔 채 원근감만 생기게 한다. 이렇게 하면 종이 위 그래프가 끊김 없이 공간으로 기울어진다. 동시에 배경이 종이색에서 어둠으로, 선 색이 먹색에서 빛나는 색으로 보간된다.

### 3. 렌더 패스

Shopify 엔진의 WGSL 진입점 구성(top/wall/cast/shadow/line/point/text/mesh)을 참고해 우리에게 필요한 것만 둔다.

| 패스 | 용도 | 기법 |
|---|---|---|
| `grid` | 설계 공간 격자, 축, 눈금 | 전체 화면 삼각형 + 절차적 격자 |
| `surface` | 효용·수요·충격반응 곡면 | 매개변수 격자 메시, `fwidth` 기반 등고선 |
| `line` | 곡선, 궤적, 그래프 간선 | 화면 공간 굵은 선 (선분 인스턴싱) |
| `point` | 균형점, 소비자 점구름, 노드 | 인스턴싱한 쿼드 + SDF 원 |
| `slab` | 두께 있는 카드 (페이지 Expo) | 윗면 = DOM 텍스처, 옆면 = 단색 |
| `shadow` | 판과 글자의 그림자 | 평면 투영 그림자 |

### 4. Compute

GPU compute는 **N이 클 때만** 쓴다. 변수가 몇 개뿐인 ODE나 NK 모형은 TS(CPU)로 충분하다.

| 커널 | 쇼케이스 단계 |
|---|---|
| 이질적 소비자 10⁴~10⁵명의 최적 선택 → 가격별 합산(리덕션) | 수요·공급 2단계 |
| 벡터장 위 입자 이류 (다시장 가격 조정) | 수요·공급 4단계 |
| 렌즈 전환 시 노드 위치 모프 | 온톨로지 지도 |
| 전파 경로 입자 흐름 | 금리 1단계 |

모든 커널에는 `packages/models`의 TS 기준 구현이 있고, Vitest로 GPU 결과와 대조한다(허용 오차 명시).

### 5. 라벨은 DOM

곡선 이름, 축, 수식 라벨은 3D 좌표를 화면으로 투영해서 DOM 요소로 배치한다. 이유는 셋이다.
- 한글 음절이 11,172자라 MSDF 글꼴 아틀라스가 무겁다.
- 스크린리더와 텍스트 선택이 그대로 된다.
- 웹폰트 품질이 그대로 유지된다.

### 6. 페이지 단위 Expo (html-in-canvas 어댑터)

페이지 전체가 공간 속 판이 되는 연출은 **지원 브라우저에서만** 켠다(D6). Shopify 번들에서 확인한 기능 감지 조건은 다음과 같다.

```js
"requestPaint" in HTMLCanvasElement.prototype
  && WebGL2RenderingContext.prototype.texElementImage2D?.length !== 6
  && "gpu" in navigator && typeof GPUQueue !== "undefined"
  && ("drawElementImageToTexture" in GPUQueue.prototype
      || "copyElementImageToTexture" in GPUQueue.prototype)
```

메서드 이름(`copy…`/`draw…`)과 시그니처가 아직 바뀌고 있다는 증거다. 그래서 이 API는 `packages/engine/src/html-in-canvas/` 한 곳에만 닿게 하고, 엔진의 다른 부분은 "DOM 요소 → GPUTexture" 인터페이스만 본다. 착수할 때 WICG 명세와 Chromium 구현 상태를 다시 확인한다.

### 7. WebGPU 필수 정책 (D13)

- `navigator.gpu.requestAdapter()`가 실패하면 도표 자리에 "WebGPU를 지원하는 브라우저에서 보세요" 안내와 도표의 글 설명을 보여준다.
- 본문은 정적 HTML이라 어디서나 읽힌다(검색엔진 포함).
- 지원 현황(Chrome·Edge, Safari 26+, Firefox 일부 플랫폼)은 착수할 때 다시 확인한다.

### 8. 접근성과 모션

- `prefers-reduced-motion`이면 모프 없이 즉시 전환한다.
- 모든 도표에 `<figcaption>`과 글 설명을 둔다. 수치 도표에는 데이터 표를 대체물로 제공한다.
- 키보드만으로 Expo 단계를 넘길 수 있게 한다.

## 장면 API (스케치, 확정 아님)

```ts
const fig = engine.mount(figureEl, {
  scene: supplyDemand.scene(params),   // models가 만든 선언적 장면 데이터
  stages: ["flat", "time", "agents", "surface", "markets"],
});
await fig.expo("time");    // 카메라 모프 + 레이어 전환
fig.set({ income: 1.2 });  // 파라미터 변경 → 장면 재계산
```

장면 데이터는 렌더러와 무관한 순수 데이터(곡선 = 점 배열, 곡면 = 함수와 정의역, 단계별 레이어 목록)다. models와 engine 사이의 계약은 이것뿐이다.
