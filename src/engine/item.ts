// engine/item.ts — 아이템 사용: 현재 씬/장소 × 아이템으로 ItemUseRule 매칭·실행
import type { EndingType, GameContent, GameState, ItemUseRule } from '../types';
import { NO_REACTION_TEXT } from '../constants';
import { passes } from './condition';
import { applyEffects } from './effect';
import { evaluateEnding } from './ending';

export interface UseItemResult {
  state: GameState;
  resultText: string;
  matched: boolean;
  overlays: string[];
  nextSceneId?: string;      // effects에 goToScene이 있으면
  gameOver?: EndingType;     // effects에 finish가 있으면
}

// 인벤토리에서 아이템을 쓴다. sceneId 규칙 > placeId 규칙 순으로 requires 통과한 첫 규칙만 실행.
// 규칙이 없으면 matched:false + 기본 "반응 없음" 문구. 소모 여부는 rule.consumeItem ?? item.consumable.
// 반환: { state, resultText, matched, overlays, nextSceneId? } — 입력 state 불변
export function useItem(state: GameState, itemId: string, content: GameContent): UseItemResult {
  if (!state.items.includes(itemId)) return { state, resultText: NO_REACTION_TEXT, matched: false, overlays: [] };
  const rule = findRule(state, itemId, content);
  if (!rule) return { state, resultText: NO_REACTION_TEXT, matched: false, overlays: [] };

  const r = applyEffects(state, rule.effects, content);
  let s = r.state;
  const consume = rule.consumeItem ?? content.items[itemId]?.consumable ?? false;
  if (consume) s = { ...s, items: s.items.filter((x) => x !== itemId) };

  return {
    state: s,
    resultText: rule.resultText,
    matched: true,
    overlays: r.overlays,
    nextSceneId: r.goToSceneId,
    gameOver: r.finished ? evaluateEnding(s) : undefined,
  };
}

function findRule(state: GameState, itemId: string, content: GameContent): ItemUseRule | undefined {
  const sceneId = state.currentSceneId;
  const placeId = content.scenes[sceneId].placeId;
  const candidates = content.itemUseRules.filter((r) => r.itemId === itemId);
  const byScene = candidates.find((r) => r.sceneId === sceneId && passes(r.requires, state));
  if (byScene) return byScene;
  return candidates.find((r) => !r.sceneId && r.placeId === placeId && passes(r.requires, state));
}
