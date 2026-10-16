// engine/condition.ts — FlagCondition 평가기. 상태를 읽기만 하며 변경하지 않는다.
import type { FlagCondition, GameState } from '../types';

// 조건을 재귀적으로 평가해 참/거짓을 돌려준다.
// - 없는 플래그는 undefined로 취급 (flagEquals false, flagGte/Lte는 0으로 비교)
// - 부작용 없음
export function evaluateCondition(cond: FlagCondition, state: GameState): boolean {
  switch (cond.type) {
    case 'hasItem': return state.items.includes(cond.itemId);
    case 'notItem': return !state.items.includes(cond.itemId);
    case 'flagEquals': return state.flags[cond.key] === cond.value;
    case 'flagGte': return numberFlag(state, cond.key) >= cond.value;
    case 'flagLte': return numberFlag(state, cond.key) <= cond.value;
    case 'visited': return state.visitedPlaces.includes(cond.placeId);
    case 'grapesGte': return state.grapes >= cond.amount;
    case 'timeBefore': return state.timeMinutes < cond.minutes;
    case 'timeAfter': return state.timeMinutes >= cond.minutes;
    case 'dayEquals': return state.day === cond.day;
    case 'companionIs': return state.companion === cond.companion;
    case 'and': return cond.conditions.every((c) => evaluateCondition(c, state));
    case 'or': return cond.conditions.some((c) => evaluateCondition(c, state));
    case 'not': return !evaluateCondition(cond.condition, state);
  }
}

// 조건이 없으면 항상 통과. requires 필드 처리용 헬퍼.
export function passes(cond: FlagCondition | undefined, state: GameState): boolean {
  return cond === undefined || evaluateCondition(cond, state);
}

function numberFlag(state: GameState, key: string): number {
  const v = state.flags[key];
  return typeof v === 'number' ? v : 0;
}
