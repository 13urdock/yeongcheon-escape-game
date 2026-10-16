// types/content.ts — 정적 콘텐츠(읽기 전용) 데이터 모양. 엔진은 이 구조를 읽기만 한다.
import type { EffectWithOverlay, FlagCondition } from './effect';
import type { EndingType } from './state';

export type ItemCategory = 'tool' | 'companion' | 'consumable' | 'key';

export interface Item {
  id: string;
  name: string;
  description: string;
  icon?: string;            // 인벤토리 아이콘 경로. 없으면 이름만
  category: ItemCategory;
  price?: number;           // 시장 구매가(포도알). 비매품이면 없음
  consumable?: boolean;     // 사용 시 소모되는지
  blocksItems?: string[];   // 동시 소지 불가 (강아지 ↔ 고양이)
}

// 텍스트 전용 인물 (그림 없음). 콘텐츠 관리용 메타.
export interface Character {
  id: string;
  name: string;
  isSnakeDisguise: boolean;
}

// 같은 장소도 시간대에 따라 배경이 다름. morning은 필수(폴백).
export interface TimedBackground {
  dawn?: string;
  morning: string;
  day?: string;
  evening?: string;
  night?: string;
}

export interface Edge {
  toPlaceId: string;
  travelCost: number;       // 기본 30, 시청↔시장 0. 차 렌트/한의 감소는 런타임 계산
  requires?: FlagCondition; // 조건 만족 전엔 이동 목록에 노출되지 않음 (예: 봉림사 = 망원경으로 발견 후)
}

export interface Activity {
  id: string;
  name: string;
  durationMinutes: number;
  effects?: EffectWithOverlay[];
  requires?: FlagCondition;
  resultText?: string;      // 완료 시 본문에 덧붙일 문구(선택)
}

export interface Place {
  id: string;
  name: string;
  backgrounds: TimedBackground;
  lodging: boolean;
  connections: Edge[];
  activities: Activity[];
  snakeCanAppear: boolean;  // 20% 굴림 대상
  snakeFixedFrom?: number;  // 이 시각(분) 이후 도착 시 백사 확정 등장 (출렁다리/짚라인 = 1200)
  openFrom?: number;        // 개방 시각(분). 없으면 상시
  openUntil?: number;       // 운영 종료(분). 없으면 상시
  entrySceneId?: string;    // 이동 도착 시 진입 씬. 없으면 `${id}_arrival` 규약
}

export interface Choice {
  id: string;
  text: string;
  isTrap: boolean;          // true = 백사 시설 이용(엔진이 strike 자동 부여)
  effects?: EffectWithOverlay[];
  nextSceneId?: string;
  resolveNextScene?: string; // BranchRule id
  requires?: FlagCondition;
}

export interface Scene {
  id: string;
  placeId: string;
  normalText: string;
  snakeText?: string;
  choices: Choice[];
  snakeChoices?: Choice[];
  triggerCondition?: FlagCondition; // 같은 placeId 진입 시 조건 만족하면 이 씬으로 대체 진입(미방문 씬만)
  isEnding: boolean;
  endingType?: EndingType;
}

export interface BranchRule {
  id: string;
  cases: { when: FlagCondition; then: string }[];
  fallback: string;
}

// 씬 × 아이템 사용 반응. sceneId 규칙 > placeId 규칙 우선.
export interface ItemUseRule {
  id: string;
  itemId: string;
  sceneId?: string;
  placeId?: string;
  requires?: FlagCondition;
  resultText: string;
  effects?: EffectWithOverlay[];
  consumeItem?: boolean;
}

export interface GameContent {
  items: Record<string, Item>;
  characters: Record<string, Character>;
  places: Record<string, Place>;
  scenes: Record<string, Scene>;
  branchRules: Record<string, BranchRule>;
  itemUseRules: ItemUseRule[];
  startSceneId: string;
}
