// content/index.ts — JSON 콘텐츠를 읽어 GameContent로 조립하고 검증한다. 상태 변경 없음.
import type { BranchRule, Character, GameContent, Item, ItemUseRule, Place, Scene } from '../types';
import placesJson from './places.json';
import scenesJson from './scenes.json';
import itemsJson from './items.json';
import charactersJson from './characters.json';
import branchRulesJson from './branchRules.json';
import itemUseRulesJson from './itemUseRules.json';
import { validateContent } from './validate';

export const START_SCENE_ID = 'dolhalmae_intro';

// 배열을 id 기반 Record로 바꾼다. id 중복은 즉시 에러.
function byId<T extends { id: string }>(list: T[], label: string): Record<string, T> {
  const rec: Record<string, T> = {};
  for (const x of list) {
    if (rec[x.id]) throw new Error(`${label}: id '${x.id}' 중복`);
    rec[x.id] = x;
  }
  return rec;
}

// 개별 JSON 배열을 받아 GameContent를 만든다 (테스트에서 임의 콘텐츠 조립용으로도 사용).
export function assembleContent(parts: {
  places: Place[]; scenes: Scene[]; items: Item[]; characters: Character[];
  branchRules: BranchRule[]; itemUseRules: ItemUseRule[]; startSceneId: string;
}): GameContent {
  return {
    places: byId(parts.places, 'places'),
    scenes: byId(parts.scenes, 'scenes'),
    items: byId(parts.items, 'items'),
    characters: byId(parts.characters, 'characters'),
    branchRules: byId(parts.branchRules, 'branchRules'),
    itemUseRules: parts.itemUseRules,
    startSceneId: parts.startSceneId,
  };
}

// 앱 시작 시 한 번 호출. 검증 실패 시 예외 → 개발 중 콘솔에 문제 목록이 그대로 뜬다.
export function loadContent(): GameContent {
  const content = assembleContent({
    places: placesJson as Place[],
    scenes: scenesJson as Scene[],
    items: itemsJson as Item[],
    characters: charactersJson as Character[],
    branchRules: branchRulesJson as BranchRule[],
    itemUseRules: itemUseRulesJson as ItemUseRule[],
    startSceneId: START_SCENE_ID,
  });
  validateContent(content);
  return content;
}
