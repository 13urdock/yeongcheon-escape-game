// engine/ending.ts — 최종 평가: ENDING_RULES로 엔딩 타입 판정, 엔딩 씬 조회
import type { EndingType, GameContent, GameState, Scene } from '../types';
import { ENDING_RULES, FALLBACK_ENDING } from '../content/rules/endingRules';
import { evaluateCondition } from './condition';

// 규칙을 위→아래 평가해 첫 매치 타입 반환. 매치 없으면 'bad'(최종형 배드).
export function evaluateEnding(state: GameState): EndingType {
  for (const r of ENDING_RULES) {
    if (evaluateCondition(r.when, state)) return r.type;
  }
  return FALLBACK_ENDING;
}

// 해당 타입의 엔딩 씬(isEnding && endingType)을 찾는다. 없으면 undefined (validate가 사전에 잡음).
export function findEndingScene(type: EndingType, content: GameContent): Scene | undefined {
  return Object.values(content.scenes).find((s) => s.isEnding && s.endingType === type);
}
