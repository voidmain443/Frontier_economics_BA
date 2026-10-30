# 온톨로지: 개념 그래프와 렌즈

## 원칙

- **기본 단위는 개념이다.** 과목이 아니다.
- **과목은 경로다.** 과목은 개념 그래프 위를 정해진 순서로 지나가는 길이다. 같은 개념이 여러 과목에 등장할 수 있다(예: 탄력성은 원론, 미시, 국제에 모두 나온다).
- **렌즈는 같은 노드를 다르게 배치한 것이다.** 데이터는 하나이고, 화면 배치만 렌즈마다 다르다.

## 노드 종류 (`kind`)

| kind | 뜻 | 예 |
|---|---|---|
| `agent` | 경제주체 | 소비자, 기업, 정부, 중앙은행 |
| `choice` | 행위·선택 | 효용극대화, 비용최소화, 이자율 결정 |
| `object` | 대상·재화 | 사적재, 공공재, 화폐, 노동 |
| `market` | 시장 형태 | 완전경쟁, 독점, 과점, 독점적 경쟁 |
| `institution` | 제도 | 재산권, 중앙은행 독립성, 최저임금 |
| `aggregate` | 집계변수 | GDP, 물가, 실업률, 기준금리 |
| `model` | 모형 | 수요·공급, IS-LM, AD-AS, 3방정식 NK |
| `method` | 방법·수학 | 라그랑주, 음함수 정리, 고유값, 회귀 |

## 관계 종류 (`edges[].type`)

모든 관계는 "이 개념 —type→ target" 방향으로 읽는다.

| type | 뜻 | 예 (이 개념 → target) |
|---|---|---|
| `requires` | 전제 (순환 금지) | 시장 수요 → 개별 수요 |
| `generalizes` | 일반화 | 일반균형 → 부분균형 |
| `relaxes` | 가정 완화 | 독점 → 완전경쟁 (가격수용 가정을 완화) |
| `aggregates-into` | 집계 | 개별 수요 → 시장 수요 |
| `measures` | 측정 | 소비자물가지수 → 물가 |
| `applies` | 적용 | 탄력성 → 조세 귀착 |
| `contests` | 반박·대안 | 행동경제학 효용 → 기대효용 |
| `transmits` | 인과 전파 (거시 쇼케이스) | 기준금리 → 시장금리 |

## 렌즈

| 렌즈 | 배치 기준 | 쓰는 필드 |
|---|---|---|
| **학제** (기본) | 과목 경로 순서 | `courses[]` |
| 주체 | 어느 주체의 문제인가 | `agents[]` |
| 이론 | 학파·전통 | `school` |
| 역사 | 등장 시점 | `era.year` |
| 시점 | 정태 / 비교정태 / 동태 / 장기 | `horizon` |
| 수학 | 필요한 수학 도구 | `math[]` |

## 파일 형식 (초안)

개념 하나에 YAML 파일 하나를 쓴다. 위치는 `content/ontology/concepts/<id>.yaml`.

```yaml
id: market-demand
kind: model
label: { ko: 시장 수요, en: Market demand }
summary:
  ko: 개별 소비자의 수요를 가격별로 수평으로 합한 것.
courses:
  - { course: principles, order: 12 }
  - { course: micro, order: 31 }
agents: [consumer]
school: neoclassical
era: { year: 1890, ref: marshall-1890 }
horizon: static
math: [summation, optimization]
edges:                       # 의미: 이 개념 —type→ target
  - { type: requires, target: individual-demand }
  - { type: requires, target: utility-maximization }
expo: supply-demand#agents   # 이 개념을 펼쳐 보여주는 쇼케이스 단계
```

과목 경로는 `content/ontology/courses/<course>.yaml`에 둔다. 단계마다 **왜 이 다음인가**를 적는다. 사이트의 ①층 서술이 여기서 나온다.

```yaml
id: micro
label: { ko: 미시경제학, en: Microeconomics }
looks-at: { ko: 개별 주체의 선택 }
path:
  - concept: economic-agent
  - concept: utility-maximization
    why: { ko: 주체를 세웠으면 그 주체가 무엇을 원하는지부터 정한다. }
  - concept: individual-demand
    why: { ko: 원하는 것과 예산이 만나면 선택이 나온다. }
  - concept: market-demand
    why: { ko: 선택을 합치면 시장이 보인다. }
```

## 검증 규칙 (빌드 시 실패 처리)

- `requires`는 순환하면 안 된다.
- 모든 `edges[].target`, `courses[].course`, 과목 경로의 `concept`는 실제로 존재하는 id여야 한다.
- `label.ko`는 필수, `label.en`은 선택이다.
- 어느 과목에도 속하지 않는 개념은 `orphan: true`로 명시해야 한다.

## 레이아웃

- 빌드할 때 렌즈별로 3D 좌표를 계산한다(시드 고정한 force layout + 렌즈 축 제약). 결과는 JSON으로 저장한다.
- 런타임에는 렌즈를 바꿀 때 노드 위치를 GPU에서 보간(모프)한다.
- 추후 SKOS/JSON-LD로 내보내 외부 도구와 호환하게 할 수 있다(v1 범위 밖).
