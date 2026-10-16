// engine/encounter.ts — 장소 도착 시 무작위 만남(강아지·고양이 등) 굴림. 보정: 연속 pityAfter회 빗나가면 다음은 확정
import type { GameContent, GameState } from '../types';
import { encounterMissFlag } from '../constants';
import { passes } from './condition';

// 이동으로 placeId에 도착했을 때 호출한다 (씬 사이 복귀에서는 호출하지 않음 → 굴림 남발 방지).
// - 조건(requires) 통과한 만남만 굴린다. 빗나가면 flags.encounter_miss_<id> +1, 맞으면 0으로 리셋
// - 맞으면 그 장소용 만남 씬 중 하나(균등)를 sceneId로 돌려준다 → 호출 측이 진입 씬 대신 이 씬으로 진입
// rng 주입 가능(테스트 결정화). 입력 state 불변.
export function rollEncounter(state: GameState, placeId: string, content: GameContent, rng: () => number = Math.random): { state: GameState; sceneId?: string } {
  let cur = state;
  for (const enc of content.encounters) {
    const ids = enc.sceneIdsByPlace[placeId];
    if (!ids?.length || !passes(enc.requires, cur)) continue;
    const key = encounterMissFlag(enc.id);
    const raw = cur.flags[key];
    const misses = typeof raw === 'number' ? raw : 0;
    const hit = (enc.pityAfter !== undefined && misses >= enc.pityAfter) || rng() < enc.chance;
    if (!hit) { cur = { ...cur, flags: { ...cur.flags, [key]: misses + 1 } }; continue; }
    const sceneId = ids[Math.min(ids.length - 1, Math.floor(rng() * ids.length))];
    return { state: { ...cur, flags: { ...cur.flags, [key]: 0 } }, sceneId };
  }
  return { state: cur };
}
