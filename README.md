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
  components/    화면 (StartScreen / HUD / SceneView / InventoryView / BottomBar / EndingView / App)
  __tests__/     Vitest
public/assets/   bg/<placeId>_<slot>.png, items/<itemId>.png  (아직 없음 → 화면에 경로가 표시됨)
```

## 콘텐츠 작성 규약 (설계서 §3~4 + 구현 중 확정된 것)

- **장소 진입 씬**: `Place.entrySceneId`가 없으면 `<placeId>_arrival` 씬으로 들어감.
- **이동·할 일 목록은 진입 씬에서만 보임**: 하위 씬(돌아다니기, 이벤트 등)에서는 씬 선택지만 보이고, 선택지로 진입 씬에 돌아와야 떠날 수 있음. 그래서 진입 씬이 아닌 씬은 `choices`가 1개 이상이어야 함(검증).
- **시청·시장 돌아다니기**: 도착 씬의 `돌아다닌다` → `<id>_walk`(장소 6칸 + `그만 돌아다닌다`) → `<id>_spot_1`~`6`(본문 + `다른 곳을 둘러본다`). 칸을 늘리거나 줄이려면 walk 씬의 선택지와 spot 씬을 같이 추가/삭제. 장소 방문 소요 시간은 아직 0분 — 정해지면 walk 씬 선택지 effects에 `advanceTime`.
- **선택지는 반드시 다음 씬이 있어야 함**: `nextSceneId` / `resolveNextScene`(BranchRule id) / effects의 `goToScene` / `finish` 중 하나. 없으면 `npm run dev` 시 화면에 검증 에러가 뜸.
- **`isTrap: true`** 선택지는 엔진이 strike를 자동 부여. 콘텐츠에 `{type:'strike'}` 안 써도 됨.
- **백사 등장**: `snakeText` 또는 `snakeChoices`가 있는 씬에서만 굴림(20%). 출렁다리·짚라인은 `snakeFixedFrom: 1200`(20:00)으로 확정 등장.
- **이벤트 씬**: `triggerCondition`이 있는 씬은 같은 `placeId`로 진입할 때 조건이 참이면 대신 열림(한 번만, 방문 후엔 안 열림). 예: `bonglimsa_early_event` = 09:00 이전 봉림사.
- **하루 종료**: 숙소 씬 선택지에 `{type:'nextDay'}` 효과. `wakeMinutes: 300`으로 새벽 기상(은해사 예불), `wakePlaceId`로 기상 장소 지정 가능. 3일차에 `nextDay`가 오면 자동으로 최종 평가.
- **최종 국면**: 선택지 효과 `{type:'finish'}` → `endingRules.ts`로 엔딩 판정 → `ending_<type>` 씬 본문 표시.
- **숨은 길**: `Edge.requires`로 조건 전엔 이동 목록에서 숨김 (보현산→봉림사는 `found_bonglimsa` 플래그 필요).
- **예약 id** (`constants.ts`): 렌터카 아이템 `car_rental`(이동 10분), 강아지 `dog`/고양이 `cat`(동행·배타), 한의 감소 플래그 `travel_discount_today`(값=분, 날 바뀌면 리셋).
- **상태 변화 문구** (필드명은 `overlay`지만 팝업 없음): 스토리 영역 본문 아래에 붙음. `addItem`/`addGrapes`/`spendGrapes`/`strike`/`advanceTime`/`nextDay`는 기본 문구 자동. 어떤 효과든 `overlay: "..."`로 문구 지정 가능. `setFlag` 등은 기본 문구 없음. 활동 결과(`resultText`)·아이템 사용 결과·이동 불가 안내도 같은 자리에 붙음.
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
| 팝업 없음 (2026-10-16) | 효과 오버레이 → 스토리 영역 문구. 가방도 모달이 아니라 페이지 전환 |
| 초기화 버튼 제거 (2026-10-16) | 시작 화면은 이어하기/처음부터만. 처음부터 = 새 게임으로 덮어씀 |
| 이동·할 일은 진입 씬에서만 (2026-10-16) | 돌아다니기 같은 하위 씬에 이동 목록이 섞이지 않도록 |
| UI (2026-10-16) | 서울 2033식 흰 화면, 라운드 없음, 상단 시간·포도·삼진 아웃 가운데 정렬, 선택지는 줄 구분 목록(할 일/이동 색 태그), 하단 바(가방), 장소명은 맨 아래 `- 장소 -` |

## 규칙 변경 (2026-10-16)

- **은해사 = 숙소(템플스테이)**. 묵으면 다음 날 05:00 은해사에서 기상 → `eunhaesa_dawn_prayer`(예불 60분 / 09:00까지 더 자기). 취하리의 새벽 예불 예약은 삭제.
- **지네 동굴(`cave`) 추가**: 봉림사에서 망원경 사용 → `found_cave`. 봉림사→동굴 길은 `found_cave` + 강아지 소지 + 3일차일 때만 노출. `cave_arrival`에서 강아지와 결전 → `defeated_snake_at_cave`.
- **씬 단위 백사** `Scene.snakeCanAppear`(장소 값 override): 시청은 도착 씬엔 백사 없음, `cityhall_spot_1~6`에서만 20%. 시청 내부 지점 입장 시 포도알 1(임시, 공공시설 0).
- **운영 시간** `Place.operatingHours`/`closedText`: 출렁다리·짚라인 09~17시, 이용 30분. 운영 시간 밖 도착 가능 → 활동 숨김 + 영업 종료 문구(`CLOSED_NOTICE`). 20:00 이후엔 백사 확정(백사 본문 우선).
- **무작위 만남** `content/encounters.json` + `engine/encounter.ts`: 강아지·고양이는 비매품. 야외 관광지 7곳 도착(이동) 시 20%, 연속 2번 빗나가면 다음 확정(`flags.encounter_miss_companion`). 템플릿 씬은 장소별 `<placeId>__dog_encounter`로 복제, 선택지 `$arrival` → 그 장소 진입 씬.
- 보현산 활동: 천문과학관 둘러보기(60분), 별 보기(60분, 20:00 이후). 시장 단가 임시값: 망원경 3·렌터카 5·소금 2·팥 2.
- 봉림사 `bonglimsa_overhear` 선택지 추가(해피 조건 `overheard_monk_story`를 켜는 곳이 없었음).

## 남은 결정 (설계서 §9 "남은 소소한 결정" 그대로)

- 와이너리 미니게임 규칙 & 포도 지급량 (지금은 활동으로 +3/+5)
- 출렁다리/짚라인 17:00~19:59 사이 동작
- Activity.durationMinutes 실제 값, 플래그 이름 최종 확정
