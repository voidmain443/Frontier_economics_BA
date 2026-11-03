# 교재 22권의 설계

3부의 교재 22권, 301장의 설계를 권마다 나눈 파일이다. 원본은 `docs/textbook-plan.md`이고, `python3 tools/split_plan.py`가 이 폴더를 만든다. 고칠 때는 원본을 고치고 다시 만든다.

교재의 본문은 권마다 다른 저장소에서 쓴다. 각 저장소에는 다음 세 파일을 가져간다.

- `NN-id.md`: 그 권의 설계. 머리 표, 목차, 책의 바퀴, 장마다 상태, 다루는 법, 근거와 반증, 연습, 다시 나오는 곳.
- `00-common.md`: 모든 권이 따르는 규약. 원칙 여덟, 장의 열네 순서, 권의 짜임, 여덟 가지 작업과 통과 기준, 책의 지도, 권 사이의 분업, 출판 전에 확인할 사실.
- `00-style.md`: 한국어 문체 기준과 용어집.

설계에 나오는 '1부 그림 1.1', '2부 2.4', '3부 7절'은 사이트 단면(Cross-Section)의 그림과 절이고, '토대 N절'은 `docs/part3-foundations.md`의 절이다.

| 권 | 파일 | 제목 | 자리 | 장 | 작업 |
|---|---|---|---|---|---|
| 1 | [01-reasoning.md](01-reasoning.md) | 경제학적 사고: 모형, 조건, 증거 | 핵심 | 12 | 1 |
| 2 | [02-principles.md](02-principles.md) | 경제원론 | 핵심 | 17 | 1 |
| 3 | [03-math1.md](03-math1.md) | 경제수학 I: 최적화와 비교정학 | 핵심 | 14 | 2 |
| 4 | [04-math2.md](04-math2.md) | 경제수학 II: 해석과 위상 | 핵심 | 16 | 3 |
| 5 | [05-probability.md](05-probability.md) | 확률과 통계 | 핵심 | 16 | 2, 5 |
| 6 | [06-micro.md](06-micro.md) | 중급 미시경제학 | 핵심 | 16 | 2, 3 |
| 7 | [07-games.md](07-games.md) | 게임이론 | 핵심 | 15 | 2, 3 |
| 8 | [08-macro.md](08-macro.md) | 중급 거시경제학 | 핵심 | 18 | 4 |
| 9 | [09-metrics.md](09-metrics.md) | 계량경제학 | 핵심 | 15 | 5 |
| 10 | [10-computation.md](10-computation.md) | 계산경제학 | 핵심 | 13 | 6 |
| 11 | [11-trade.md](11-trade.md) | 국제무역론 | 각론 | 11 | 7 |
| 12 | [12-intlfin.md](12-intlfin.md) | 국제금융론 | 각론 | 12 | 7 |
| 13 | [13-banking.md](13-banking.md) | 화폐금융론 | 각론 | 12 | 7 |
| 14 | [14-public.md](14-public.md) | 공공경제학 | 각론 | 14 | 7 |
| 15 | [15-labor.md](15-labor.md) | 노동경제학 | 각론 | 13 | 7 |
| 16 | [16-io.md](16-io.md) | 산업조직론 | 각론 | 13 | 7 |
| 17 | [17-development.md](17-development.md) | 개발경제학 | 각론 | 13 | 7 |
| 18 | [18-environmental.md](18-environmental.md) | 환경경제학 | 각론 | 13 | 7 |
| 19 | [19-finance.md](19-finance.md) | 금융경제학 | 각론 | 12 | 7 |
| 20 | [20-behavioral.md](20-behavioral.md) | 행동경제학 | 각론 | 12 | 7 |
| 21 | [21-history.md](21-history.md) | 경제사 | 각론 | 12 | 7 |
| 22 | [22-method.md](22-method.md) | 경제학의 방법과 철학 | 마지막 책 | 12 | 8 |
