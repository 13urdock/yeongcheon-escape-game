// engine/effect.ts — Effect 적용기 + 상태 변화 문구 자동 생성. 다음 씬은 결정하지 않는다.
// (필드 이름은 overlay지만 팝업은 없음 — 문구는 화면의 스토리 영역에 덧붙는다)
import type { EffectWithOverlay, EndingType, GameContent, GameState } from '../types';
import { DAY_START_MIN, FLAG_TRAVEL_DISCOUNT, ITEM_CAT, ITEM_DOG, LAST_DAY } from '../constants';

export interface EffectResult {
  state: GameState;
  overlays: string[];        // 스토리 영역에 덧붙일 상태 변화 문구(순서대로)
  goToSceneId?: string;      // goToScene 효과가 있었으면 그 씬
  wakePlaceId?: string;      // nextDay.wakePlaceId 지정 시
  finished?: true;           // finish 효과 또는 마지막 날 종료 → 호출자가 evaluateEnding 수행
}

// 효과 목록을 순서대로 적용해 새 state와 오버레이 문구를 만든다.
// - 입력 state는 변경하지 않음(불변)
// - 종류별 기본 문구를 생성하되 effect.overlay가 있으면 그것으로 대체
export function applyEffects(state: GameState, effects: EffectWithOverlay[] | undefined, content: GameContent): EffectResult {
  let s = state;
  const result: EffectResult = { state, overlays: [] };
  for (const e of effects ?? []) {
    const r = applyOne(s, e, content);
    s = r.state;
    if (r.overlay) result.overlays.push(r.overlay);
    if (r.goToSceneId) result.goToSceneId = r.goToSceneId;
    if (r.wakePlaceId) result.wakePlaceId = r.wakePlaceId;
    if (r.finished) result.finished = true;
  }
  result.state = s;
  return result;
}

interface OneResult { state: GameState; overlay?: string; goToSceneId?: string; wakePlaceId?: string; finished?: true }

// 효과 하나 적용. overlay는 "조용한 효과"(setFlag/incFlag/goToScene 등)면 기본 문구 없음.
function applyOne(s: GameState, e: EffectWithOverlay, content: GameContent): OneResult {
  const custom = e.overlay;
  switch (e.type) {
    case 'addItem': {
      const item = content.items[e.itemId];
      let items = s.items.includes(e.itemId) ? s.items : [...s.items, e.itemId];
      // 배타 아이템(강아지↔고양이)은 상대를 제거
      for (const b of item?.blocksItems ?? []) items = items.filter((x) => x !== b);
      let companion = s.companion;
      if (e.itemId === ITEM_DOG) companion = 'dog';
      if (e.itemId === ITEM_CAT) companion = 'cat';
      return { state: { ...s, items, companion }, overlay: custom ?? `${item?.name ?? e.itemId}을(를) 얻었다` };
    }
    case 'removeItem': {
      const item = content.items[e.itemId];
      const companion = (e.itemId === ITEM_DOG && s.companion === 'dog') || (e.itemId === ITEM_CAT && s.companion === 'cat') ? null : s.companion;
      return { state: { ...s, items: s.items.filter((x) => x !== e.itemId), companion }, overlay: custom ?? `${item?.name ?? e.itemId}을(를) 잃었다` };
    }
    case 'setFlag':
      return { state: { ...s, flags: { ...s.flags, [e.key]: e.value } }, overlay: custom };
    case 'incFlag': {
      const cur = typeof s.flags[e.key] === 'number' ? (s.flags[e.key] as number) : 0;
      return { state: { ...s, flags: { ...s.flags, [e.key]: cur + e.amount } }, overlay: custom };
    }
    case 'addGrapes':
      return { state: { ...s, grapes: s.grapes + e.amount }, overlay: custom ?? `포도알 +${e.amount}` };
    case 'spendGrapes':
      return { state: { ...s, grapes: Math.max(0, s.grapes - e.amount) }, overlay: custom ?? `포도알 -${e.amount}` };
    case 'strike':
      return { state: { ...s, strikes: s.strikes + 1 }, overlay: custom ?? '…무언가 잘못됐다는 느낌이 든다' };
    case 'advanceTime':
      return { state: { ...s, timeMinutes: s.timeMinutes + e.minutes }, overlay: custom ?? `${e.minutes}분이 흘렀다` };
    case 'setCompanion': {
      // 동행 설정: 상대 동행 아이템은 인벤토리에서도 제거(배타)
      const remove = e.companion === 'dog' ? ITEM_CAT : e.companion === 'cat' ? ITEM_DOG : null;
      const items = remove ? s.items.filter((x) => x !== remove) : s.items;
      return { state: { ...s, companion: e.companion, items }, overlay: custom };
    }
    case 'goToScene':
      return { state: s, goToSceneId: e.sceneId, overlay: custom };
    case 'nextDay': {
      // 날짜 +1, 시각 리셋, 당일 한정 플래그 제거. 마지막 날이 끝나면 finished.
      const flags = { ...s.flags };
      delete flags[FLAG_TRAVEL_DISCOUNT];
      const day = s.day + 1;
      const next: GameState = { ...s, day, timeMinutes: e.wakeMinutes ?? DAY_START_MIN, flags };
      if (s.day >= LAST_DAY) return { state: next, finished: true, overlay: custom };
      return { state: next, wakePlaceId: e.wakePlaceId, overlay: custom ?? `${day}일차 아침` };
    }
    case 'finish':
      return { state: s, finished: true, overlay: custom };
  }
}

// 엔딩 타입을 한국어 라벨로 (UI용)
export function endingLabel(t: EndingType): string {
  return { bad: '배드 엔딩', normal: '노멀 엔딩', happy: '해피 엔딩', hidden: '히든 엔딩' }[t];
}
