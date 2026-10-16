# 영천 칠석 이야기 — 분기형 텍스트 어드벤처 (구현 틀)

설계 문서 `yeongcheon-game-design.md`(프로젝트 지식) §10 파일 트리를 그대로 구현한 뼈대.
**엔진·UI·테스트는 완성**, 콘텐츠(씬 본문·선택지·아이템)는 `src/content/*.json`에 `[TODO]` 자리로 들어가 있음.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173  (--host 옵션 포함 → 같은 와이파이의 폰에서 IP로 접속 가능)
npm test           # 단위 테스트 41개
npm run build      # dist/ 생성 → 정적 호스팅에 올리고 QR 연결
```

## 폴더 구조 (한 파일 = 한 책임)

```
src/
  types/         데이터 모양만 (content / state / effect)
  constants.ts   시간·확률·저장키·예약 id
  content/       ★ 팀원이 편집하는 곳. JSON + 로더 + 검증
    places.json      12개 장소·이동 그래프·활동 (그래프는 채워둠)
    scenes.json      씬 (장소별 도착 씬 + 예시 이벤트/엔딩 씬, 본문은 [TODO])
    items.json       아이템 (예시 6개)
    itemUseRules.json 아이템 사용 반응 (예시: 보현산에서 망원경 → 봉림사 발견)
    branchRules.json 조건부 분기 (예시 1개)
    characters.json  인물 메타
    rules/endingRules.ts  엔딩 판정 규칙 (플래그 이름 확정 시 여기만 수정)
  engine/        순수 함수. React 없음. (state, ...) => 새 state
  hooks/useGame.ts  상태 보유 + 자동 저장 + 엔진 호출
  components/    화면 (StartScreen / HUD / SceneView / InventoryView / EffectOverlay / EndingView / App)
  __tests__/     Vitest
public/assets/   bg/<placeId>_<slot>.png, items/<itemId>.png  (아직 없음 → 화면에 경로가 표시됨)
```

## 콘텐츠 작성 규약 (설계서 §3~4 + 구현 중 확정된 것)

- **장소 진입 씬**: `Place.entrySceneId`가 없으면 `<placeId>_arrival` 씬으로 들어감.
- **선택지는 반드시 다음 씬이 있어야 함**: `nextSceneId` / `resolveNextScene`(BranchRule id) / effects의 `goToScene` / `finish` 중 하나. 없으면 `npm run dev` 시 화면에 검증 에러가 뜸.
- **`isTrap: true`** 선택지는 엔진이 strike를 자동 부여. 콘텐츠에 `{type:'strike'}` 안 써도 됨.
- **백사 등장**: `snakeText` 또는 `snakeChoices`가 있는 씬에서만 굴림(20%). 출렁다리·짚라인은 `snakeFixedFrom: 1200`(20:00)으로 확정 등장.
- **이벤트 씬**: `triggerCondition`이 있는 씬은 같은 `placeId`로 진입할 때 조건이 참이면 대신 열림(한 번만, 방문 후엔 안 열림). 예: `bonglimsa_early_event` = 09:00 이전 봉림사.
- **하루 종료**: 숙소 씬 선택지에 `{type:'nextDay'}` 효과. `wakeMinutes: 300`으로 새벽 기상(은해사 예불), `wakePlaceId`로 기상 장소 지정 가능. 3일차에 `nextDay`가 오면 자동으로 최종 평가.
- **최종 국면**: 선택지 효과 `{type:'finish'}` → `endingRules.ts`로 엔딩 판정 → `ending_<type>` 씬 본문 표시.
- **숨은 길**: `Edge.requires`로 조건 전엔 이동 목록에서 숨김 (보현산→봉림사는 `found_bonglimsa` 플래그 필요).
- **예약 id** (`constants.ts`): 렌터카 아이템 `car_rental`(이동 10분), 강아지 `dog`/고양이 `cat`(동행·배타), 한의 감소 플래그 `travel_discount_today`(값=분, 날 바뀌면 리셋).
- **효과 오버레이**: `addItem`/`addGrapes`/`spendGrapes`/`strike`/`advanceTime`/`nextDay`는 기본 문구 자동. 어떤 효과든 `overlay: "..."`로 문구 지정 가능. `setFlag` 등은 기본 문구 없음.
- **시간대 배경**: `backgrounds.morning`은 필수, `dawn/day/evening/night`는 선택(없으면 morning 폴백). 경계: dawn <09:00, morning <12:00, day <17:00, evening <20:00, night ≥20:00.

## 설계서와 달라진 점 (구현하며 추가)

| 항목 | 내용 |
|---|---|
| `Place.snakeFixedFrom` | 출렁다리/짚라인 20:00 확정 등장을 데이터로 표현 |
| `Place.entrySceneId` | 이동 도착 씬 지정 (기본 `<id>_arrival`) |
| `Edge.requires` | 조건부 숨은 길 |
| `Effect: nextDay / finish` | 하루 종료·최종 평가 진입을 콘텐츠에서 트리거 |
| `FlagCondition: timeAfter / dayEquals / companionIs` | 마지막 날 전용 선택지 등에 필요 |
| `Activity.resultText` | 활동 완료 문구(선택) |
| 숙소 마감 판정 | "22:00까지 어떤 숙소에도 도착 불가"가 되는 순간 즉시 타임아웃 배드엔딩 (막다른 상태 방지) |
| 엔딩 후 세이브 삭제 | 시작 화면에 '이어하기'가 남지 않도록 |

## 남은 결정 (설계서 §9 "남은 소소한 결정" 그대로)

- 와이너리 미니게임 규칙 & 포도 지급량 (지금은 활동으로 +3/+5)
- 출렁다리/짚라인 17:00~19:59 사이 동작
- Activity.durationMinutes 실제 값, 플래그 이름 최종 확정
