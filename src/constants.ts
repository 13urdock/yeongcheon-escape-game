// constants.ts — 게임 규칙 상수 (시간·확률·저장키). 값 조정은 여기서만.

export const DAY_START_MIN = 540;    // 09:00 하루 시작
export const DAY_END_MIN = 1320;     // 22:00 숙소 도착 마감
export const LAST_DAY = 3;           // 2박 3일
export const TRAVEL_COST = 30;       // edge 기본 이동(분)
export const TRAVEL_COST_CAR = 10;   // 차 렌트 시 edge당 이동(분)
export const ACTIVITY_COST = 60;     // 활동 기본(분) — durationMinutes 없을 때
export const HANUI_DISCOUNT = 10;    // 한의 체험 시 당일 이동 감소(분)
export const SNAKE_CHANCE = 0.2;     // 백사 확률 등장
export const SNAKE_FIXED_TIME = 1200; // 20:00 — 출렁다리/짚라인 백사 확정 등장 시각
export const MAX_STRIKES = 3;
export const SAVE_KEY = 'yeongcheon_save_v1';
export const SAVE_VERSION = 1;
export const BONGLIMSA_OPEN = 300;   // 05:00 봉림사 개방
export const BONGLIMSA_EARLY = 540;  // 09:00 — 이 전 도착 시 hidden 조건

// 엔진이 참조하는 예약 id (콘텐츠에서 같은 id를 써야 규칙이 발동)
export const ITEM_CAR = 'car_rental';                 // 소지 시 이동 10분
export const FLAG_TRAVEL_DISCOUNT = 'travel_discount_today'; // 값(분)만큼 당일 이동 감소, 날 바뀌면 리셋
export const ITEM_DOG = 'dog';
export const ITEM_CAT = 'cat';

// UI 문구
export const NO_REACTION_TEXT = '지금은 쓸 수 없을 것 같다.';
