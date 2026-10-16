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
  // 활동 운영 시간(분). 밖이면 도착은 가능하지만 활동이 숨겨지고 진입 씬에 영업 종료 문구가 붙는다.
  // (openFrom/openUntil은 '도착 자체'를 막는 출입 시간 — 예: 봉림사 05:00)
  operatingHours?: { from: number; to: number };
  closedText?: string;      // 운영 시간 밖 도착 본문. 없으면 normalText + CLOSED_NOTICE
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
  snakeCanAppear?: boolean; // 씬 단위 백사 굴림 여부(장소 값 override). 예: 시청은 도착엔 없고 내부 지점 씬에서만 20%
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

// 무작위 만남 (강아지·고양이 등). 이동으로 장소에 도착할 때만 굴린다.
// 템플릿 씬은 placeIds 장소마다 `${placeId}__${templateId}`로 복제되고,
// 선택지 nextSceneId의 '$arrival'은 그 장소의 진입 씬으로 바뀐다.
export type EncounterSceneTemplate = Omit<Scene, 'placeId'>;

export interface EncounterDef {
  id: string;
  placeIds: string[];
  chance: number;              // 0~1
  pityAfter?: number;          // 연속 N번 빗나가면 다음 굴림은 확정 (빗나감 횟수는 flags.encounter_miss_<id>)
  requires?: FlagCondition;    // 굴림 조건 (예: 동행 없음)
  scenes: EncounterSceneTemplate[]; // 등장 시 이 중 하나를 균등 선택
}

// 조립 후 런타임 형태: 장소별 복제된 씬 id 목록
export interface Encounter {
  id: string;
  placeIds: string[];
  chance: number;
  pityAfter?: number;
  requires?: FlagCondition;
  sceneIdsByPlace: Record<string, string[]>;
}

export interface GameContent {
  items: Record<string, Item>;
  characters: Record<string, Character>;
  places: Record<string, Place>;
  scenes: Record<string, Scene>;
  branchRules: Record<string, BranchRule>;
  itemUseRules: ItemUseRule[];
  encounters: Encounter[];
  startSceneId: string;
}
