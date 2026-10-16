// engine/choice.ts — 선택지 적용: effects, isTrap 자동 strike, 삼진 즉시 배드, 다음 씬 결정
import type { Choice, EndingType, GameContent, GameState } from '../types';
import { MAX_STRIKES } from '../constants';
import { resolveBranch } from './branch';
import { applyEffects } from './effect';
import { evaluateEnding } from './ending';
import { entrySceneId } from './travel';

export interface ChoiceResult {
  state: GameState;
  nextSceneId?: string;      // gameOver면 없음
  overlays: string[];
  gameOver?: EndingType;
}

// 선택지를 적용해 다음 상태와 다음 씬을 만든다.
// - effects를 순서대로 적용, isTrap이면 strike를 자동 부여(콘텐츠에 strike effect 불필요)
// - strikes >= MAX_STRIKES → gameOver:'bad' 즉시 반환(다음 씬 계산 생략)
// - finish/마지막 날 종료 → gameOver: evaluateEnding(state)
// - 다음 씬 우선순위: goToScene > resolveNextScene > nextSceneId > nextDay.wakePlaceId 진입 씬
// 반환: { state, nextSceneId?, overlays, gameOver? } — 입력 state 불변
export function applyChoice(state: GameState, choice: Choice, content: GameContent): ChoiceResult {
  const r = applyEffects(state, choice.effects, content);
  let s = r.state;
  const overlays = [...r.overlays];

  if (choice.isTrap) {
    const t = applyEffects(s, [{ type: 'strike' }], content);
    s = t.state;
    overlays.push(...t.overlays);
  }
  if (s.strikes >= MAX_STRIKES) return { state: s, overlays, gameOver: 'bad' };
  if (r.finished) return { state: s, overlays, gameOver: evaluateEnding(s) };

  const nextSceneId = r.goToSceneId
    ?? (choice.resolveNextScene ? resolveBranch(choice.resolveNextScene, s, content) : undefined)
    ?? choice.nextSceneId
    ?? (r.wakePlaceId ? entrySceneId(content.places[r.wakePlaceId]) : undefined);
  if (!nextSceneId) throw new Error(`choice '${choice.id}': 다음 씬을 결정할 수 없음`);
  return { state: s, nextSceneId, overlays };
}
