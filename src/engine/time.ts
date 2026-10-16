// engine/time.ts — 시간대 슬롯·시계 표시·숙소 마감(고립) 판정
import type { GameContent, GameState, Place, TimedBackground } from '../types';
import { DAY_END_MIN } from '../constants';
import { computeTravelCost } from './travel';

export type TimeSlot = keyof TimedBackground;

// 배경 이미지 슬롯 선택. 경계값은 설계서 §6-5 초안값.
export function getTimeSlot(timeMinutes: number): TimeSlot {
  if (timeMinutes < 540) return 'dawn';      // ~08:59
  if (timeMinutes < 720) return 'morning';   // 09:00~11:59
  if (timeMinutes < 1020) return 'day';      // 12:00~16:59
  if (timeMinutes < 1200) return 'evening';  // 17:00~19:59
  return 'night';                            // 20:00~
}

// 슬롯 이미지가 없으면 morning으로 폴백.
export function pickBackground(bg: TimedBackground, timeMinutes: number): string {
  return bg[getTimeSlot(timeMinutes)] ?? bg.morning;
}

// UI 시계용. 540 → "09:00". 24시 넘김은 표시상 wrap.
export function formatClock(timeMinutes: number): string {
  const m = ((timeMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// 현재 씬이 속한 장소를 돌려준다.
export function currentPlace(state: GameState, content: GameContent): Place {
  const scene = content.scenes[state.currentSceneId];
  return content.places[scene.placeId];
}

// 숙소 마감 판정: 현재 장소가 숙소가 아니고, 22:00까지 도착 가능한 숙소가 하나도 없으면 true(게임오버).
// 이동 목록에 보이지 않는 edge(requires 미충족)는 경로에서 제외. 다익스트라로 최단 도착 시각 계산.
export function checkLodgingDeadline(state: GameState, content: GameContent): boolean {
  const here = currentPlace(state, content);
  if (here.lodging) return false;
  const arrival = new Map<string, number>([[here.id, state.timeMinutes]]);
  const queue = [here.id];
  while (queue.length) {
    queue.sort((a, b) => (arrival.get(a) ?? 0) - (arrival.get(b) ?? 0));
    const id = queue.shift()!;
    const t = arrival.get(id)!;
    if (t > DAY_END_MIN) break;
    const place = content.places[id];
    if (place.lodging) return false;
    for (const e of place.connections) {
      const next = t + computeTravelCost(state, e.travelCost);
      if (next > DAY_END_MIN) continue;
      if (next < (arrival.get(e.toPlaceId) ?? Infinity)) {
        arrival.set(e.toPlaceId, next);
        queue.push(e.toPlaceId);
      }
    }
  }
  return true;
}
