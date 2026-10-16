// engine/activity.ts — 현재 장소의 활동 수행: 소요 시간 가산 + effects 적용
import type { Activity, GameContent, GameState } from '../types';
import { ACTIVITY_COST, DAY_END_MIN } from '../constants';
import { passes } from './condition';
import { applyEffects } from './effect';
import { isEntryScene } from './travel';
import { isOutsideHours } from './time';

export type ActivityBlock = 'not_found' | 'requires_unmet' | 'time_over' | 'closed_hours';

// 현재 장소에서 노출되는 활동 목록(requires 통과분). 진입 씬이 아니거나 운영 시간 밖이면 빈 목록.
export function availableActivities(state: GameState, content: GameContent): Activity[] {
  if (!isEntryScene(state, content)) return [];
  const place = content.places[content.scenes[state.currentSceneId].placeId];
  if (isOutsideHours(place, state.timeMinutes)) return [];
  return place.activities.filter((a) => passes(a.requires, state));
}

// 활동을 수행한다. durationMinutes(없으면 ACTIVITY_COST)만큼 시간 소모 후 effects 적용. 진입 씬에서만 가능.
// 반환: { state, overlays, resultText?, goToSceneId?, blocked? } — 입력 state 불변.
export function doActivity(state: GameState, activityId: string, content: GameContent): {
  state: GameState; overlays: string[]; resultText?: string; goToSceneId?: string; blocked?: ActivityBlock;
} {
  const place = content.places[content.scenes[state.currentSceneId].placeId];
  const activity = isEntryScene(state, content) ? place.activities.find((a) => a.id === activityId) : undefined;
  if (!activity) return { state, overlays: [], blocked: 'not_found' };
  if (isOutsideHours(place, state.timeMinutes)) return { state, overlays: [], blocked: 'closed_hours' };
  if (!passes(activity.requires, state)) return { state, overlays: [], blocked: 'requires_unmet' };
  const duration = activity.durationMinutes ?? ACTIVITY_COST;
  const after = state.timeMinutes + duration;
  if (after > DAY_END_MIN) return { state, overlays: [], blocked: 'time_over' };
  const r = applyEffects({ ...state, timeMinutes: after }, activity.effects, content);
  return { state: r.state, overlays: r.overlays, resultText: activity.resultText, goToSceneId: r.goToSceneId };
}
