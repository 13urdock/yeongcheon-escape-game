// engine/travel.ts — 장소 이동: 이동비용 런타임 계산(차 렌트·한의 감소), 인접·시간·개방 검사
import type { Edge, GameContent, GameState } from '../types';
import { DAY_END_MIN, FLAG_TRAVEL_DISCOUNT, ITEM_CAR, TRAVEL_COST_CAR } from '../constants';
import { passes } from './condition';

export type TravelBlock = 'no_edge' | 'time_over' | 'closed';

// edge 기본비용에 상태 수정자를 적용한 실제 이동 시간(분).
// base 0(시청↔시장)은 그대로 0. 차 렌트 소지 → 10분. 당일 한의 감소 플래그(분) → 차감(최소 0).
export function computeTravelCost(state: GameState, baseCost: number): number {
  if (baseCost <= 0) return 0;
  let cost = state.items.includes(ITEM_CAR) ? TRAVEL_COST_CAR : baseCost;
  const discount = state.flags[FLAG_TRAVEL_DISCOUNT];
  if (typeof discount === 'number') cost -= discount;
  return Math.max(0, cost);
}

// 현재 씬이 그 장소의 진입 씬인지. 이동·할 일 목록은 진입 씬에서만 노출한다
// (돌아다니기·이벤트 같은 하위 씬에서는 씬 선택지만 보이고, 선택지로 진입 씬에 돌아와야 떠날 수 있음).
export function isEntryScene(state: GameState, content: GameContent): boolean {
  const scene = content.scenes[state.currentSceneId];
  return scene.id === entrySceneId(content.places[scene.placeId]);
}

// 현재 장소에서 노출되는 이동 목록(requires 통과분)과 각 실제 비용. 진입 씬이 아니면 빈 목록.
export function availableEdges(state: GameState, content: GameContent): { edge: Edge; cost: number; name: string }[] {
  if (!isEntryScene(state, content)) return [];
  const scene = content.scenes[state.currentSceneId];
  const place = content.places[scene.placeId];
  return place.connections
    .filter((e) => passes(e.requires, state))
    .map((edge) => ({ edge, cost: computeTravelCost(state, edge.travelCost), name: content.places[edge.toPlaceId].name }));
}

// 인접 장소로 이동한다. timeMinutes에 이동비용을 더하고, 도착 장소 진입 씬 id를 돌려준다.
// blocked: 'no_edge'(인접 아님/조건 미충족) | 'time_over'(22:00 초과) | 'closed'(개방 시간 밖)
// 반환: { state, nextSceneId?, blocked? } — 입력 state는 변경하지 않음. 씬 진입(백사 굴림)은 enterScene이 담당.
export function travelTo(state: GameState, toPlaceId: string, content: GameContent): { state: GameState; nextSceneId?: string; blocked?: TravelBlock } {
  const found = availableEdges(state, content).find((x) => x.edge.toPlaceId === toPlaceId);
  if (!found) return { state, blocked: 'no_edge' };
  const arrive = state.timeMinutes + found.cost;
  if (arrive > DAY_END_MIN) return { state, blocked: 'time_over' };
  const dest = content.places[toPlaceId];
  if (dest.openFrom !== undefined && arrive < dest.openFrom) return { state, blocked: 'closed' };
  if (dest.openUntil !== undefined && arrive > dest.openUntil) return { state, blocked: 'closed' };
  return { state: { ...state, timeMinutes: arrive }, nextSceneId: entrySceneId(dest) };
}

// 장소의 진입 씬 id. entrySceneId가 없으면 `${id}_arrival` 규약.
export function entrySceneId(place: { id: string; entrySceneId?: string }): string {
  return place.entrySceneId ?? `${place.id}_arrival`;
}
