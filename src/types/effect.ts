// types/effect.ts — 상태 변경(Effect)과 조건 판정(FlagCondition)의 데이터 모양. 로직 없음.

export type FlagValue = boolean | number | string;

// 상태 변경 단위. 콘텐츠 JSON에서 그대로 사용.
export type Effect =
  | { type: 'addItem'; itemId: string }
  | { type: 'removeItem'; itemId: string }
  | { type: 'setFlag'; key: string; value: FlagValue }
  | { type: 'incFlag'; key: string; amount: number }
  | { type: 'addGrapes'; amount: number }
  | { type: 'spendGrapes'; amount: number }
  | { type: 'strike' }
  | { type: 'advanceTime'; minutes: number }
  | { type: 'setCompanion'; companion: 'dog' | 'cat' | null }
  | { type: 'goToScene'; sceneId: string }
  // 하루 종료(숙박). wakeMinutes 미지정 시 다음날 09:00. 새벽 예불 등은 300(05:00)으로 지정.
  | { type: 'nextDay'; wakeMinutes?: number; wakePlaceId?: string }
  // 최종 평가 진입: ENDING_RULES로 엔딩을 판정하고 게임을 끝낸다 (마지막 날 최종 국면에서 사용)
  | { type: 'finish' };

// 각 Effect에 선택적으로 붙는 오버레이 문구(엔진 기본 문구 override)
export type EffectWithOverlay = Effect & { overlay?: string };

// 조건 판정 — 재귀 구조. and/or/not로 조합.
export type FlagCondition =
  | { type: 'hasItem'; itemId: string }
  | { type: 'notItem'; itemId: string }
  | { type: 'flagEquals'; key: string; value: FlagValue }
  | { type: 'flagGte'; key: string; value: number }
  | { type: 'flagLte'; key: string; value: number }
  | { type: 'visited'; placeId: string }
  | { type: 'grapesGte'; amount: number }
  | { type: 'timeBefore'; minutes: number }   // 하루 중 분 (09:00 = 540)
  | { type: 'timeAfter'; minutes: number }    // timeMinutes >= minutes
  | { type: 'dayEquals'; day: number }        // 1~3
  | { type: 'companionIs'; companion: 'dog' | 'cat' | null }
  | { type: 'and'; conditions: FlagCondition[] }
  | { type: 'or'; conditions: FlagCondition[] }
  | { type: 'not'; condition: FlagCondition };
