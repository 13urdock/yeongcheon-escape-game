// engine/branch.ts — BranchRule 평가기: cases를 위→아래 평가해 첫 매치의 씬 id를 반환
import type { GameContent, GameState } from '../types';
import { evaluateCondition } from './condition';

// 규칙 id로 BranchRule을 찾아 평가한다. 매치 없으면 fallback. 규칙이 없으면 예외(콘텐츠 오류).
export function resolveBranch(ruleId: string, state: GameState, content: GameContent): string {
  const rule = content.branchRules[ruleId];
  if (!rule) throw new Error(`BranchRule '${ruleId}' 없음`);
  for (const c of rule.cases) {
    if (evaluateCondition(c.when, state)) return c.then;
  }
  return rule.fallback;
}
