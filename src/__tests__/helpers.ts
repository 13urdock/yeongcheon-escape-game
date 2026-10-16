// __tests__/helpers.ts — 테스트용 최소 콘텐츠와 상태 생성기
import type { GameContent, GameState, Place, Scene } from '../types';
import { assembleContent } from '../content';
import { createInitialState } from '../engine';

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id, name: id, backgrounds: { morning: `${id}.png` }, lodging: false, connections: [], activities: [], snakeCanAppear: false, ...extra,
});
const scene = (id: string, placeId: string, extra: Partial<Scene> = {}): Scene => ({
  id, placeId, normalText: `${id} text`, choices: [], isEnding: false, ...extra,
});

// 시청(숙소, 허브) ─ 시장(0분) / 보현산(30분) ─ 봉림사(30분, 05:00 개방) / 출렁다리(20:00 백사 확정)
export function makeContent(): GameContent {
  const places: Place[] = [
    place('cityhall', { lodging: true, snakeCanAppear: true, connections: [
      { toPlaceId: 'market', travelCost: 0 }, { toPlaceId: 'bohyeonsan', travelCost: 30 },
    ] }),
    place('market', { snakeCanAppear: true, connections: [{ toPlaceId: 'cityhall', travelCost: 0 }] }),
    place('bohyeonsan', { snakeCanAppear: true, connections: [
      { toPlaceId: 'cityhall', travelCost: 30 },
      { toPlaceId: 'bonglimsa', travelCost: 30, requires: { type: 'flagEquals', key: 'found_bonglimsa', value: true } },
      { toPlaceId: 'bridge', travelCost: 30 },
    ], activities: [{ id: 'hike', name: '등산', durationMinutes: 60, effects: [{ type: 'incFlag', key: 'trust', amount: 1 }] }] }),
    place('bonglimsa', { openFrom: 300, connections: [{ toPlaceId: 'bohyeonsan', travelCost: 30 }] }),
    place('bridge', { snakeFixedFrom: 1200, openFrom: 1020, connections: [{ toPlaceId: 'bohyeonsan', travelCost: 30 }] }),
  ];
  const scenes: Scene[] = [
    scene('start', 'cityhall', { choices: [{ id: 'c1', text: 'go', isTrap: false, nextSceneId: 'cityhall_arrival' }] }),
    scene('cityhall_arrival', 'cityhall', {
      snakeText: 'snake here',
      choices: [
        { id: 'sleep', text: '잔다', isTrap: false, effects: [{ type: 'nextDay' }], nextSceneId: 'cityhall_arrival' },
        { id: 'finish', text: '끝', isTrap: false, effects: [{ type: 'finish' }] },
        { id: 'branch', text: '분기', isTrap: false, resolveNextScene: 'r1' },
      ],
      snakeChoices: [
        { id: 'trap', text: '이용', isTrap: true, nextSceneId: 'cityhall_arrival' },
        { id: 'safe', text: '거리', isTrap: false, nextSceneId: 'cityhall_arrival' },
      ],
    }),
    scene('market_arrival', 'market', { choices: [
      { id: 'buy_dog', text: 'dog', isTrap: false, requires: { type: 'grapesGte', amount: 3 },
        effects: [{ type: 'spendGrapes', amount: 3 }, { type: 'addItem', itemId: 'dog' }], nextSceneId: 'market_arrival' },
    ] }),
    scene('bohyeonsan_arrival', 'bohyeonsan', { snakeText: 'snake', snakeChoices: [{ id: 't', text: 't', isTrap: true, nextSceneId: 'bohyeonsan_arrival' }] }),
    scene('bohyeonsan_walk', 'bohyeonsan', { choices: [{ id: 'back', text: '돌아간다', isTrap: false, nextSceneId: 'bohyeonsan_arrival' }] }),
    scene('bonglimsa_arrival', 'bonglimsa'),
    scene('bonglimsa_early', 'bonglimsa', { triggerCondition: { type: 'timeBefore', minutes: 540 },
      choices: [{ id: 'e', text: 'e', isTrap: false, effects: [{ type: 'setFlag', key: 'bonglimsa_early', value: true }], nextSceneId: 'bonglimsa_arrival' }] }),
    scene('bridge_arrival', 'bridge', { snakeText: 'snake at bridge', snakeChoices: [{ id: 'bt', text: 'bt', isTrap: true, nextSceneId: 'bridge_arrival' }] }),
    scene('ending_bad', 'cityhall', { isEnding: true, endingType: 'bad' }),
    scene('ending_normal', 'cityhall', { isEnding: true, endingType: 'normal' }),
    scene('ending_happy', 'cityhall', { isEnding: true, endingType: 'happy' }),
    scene('ending_hidden', 'cityhall', { isEnding: true, endingType: 'hidden' }),
  ];
  return assembleContent({
    places, scenes,
    items: [
      { id: 'dog', name: '강아지', description: '', category: 'companion', blocksItems: ['cat'] },
      { id: 'cat', name: '고양이', description: '', category: 'companion', blocksItems: ['dog'] },
      { id: 'car_rental', name: '렌터카', description: '', category: 'tool' },
      { id: 'telescope', name: '망원경', description: '', category: 'tool' },
      { id: 'salt', name: '소금', description: '', category: 'consumable', consumable: true },
    ],
    characters: [],
    branchRules: [{ id: 'r1', cases: [{ when: { type: 'flagGte', key: 'trust', value: 2 }, then: 'market_arrival' }], fallback: 'cityhall_arrival' }],
    itemUseRules: [
      { id: 'tele', itemId: 'telescope', placeId: 'bohyeonsan', resultText: '봉림사가 보인다', effects: [{ type: 'setFlag', key: 'found_bonglimsa', value: true }] },
      { id: 'salt_city', itemId: 'salt', sceneId: 'cityhall_arrival', resultText: '소금을 뿌렸다', effects: [{ type: 'setFlag', key: 'salted', value: true }] },
    ],
    startSceneId: 'start',
  });
}

export function makeState(content: GameContent, patch: Partial<GameState> = {}): GameState {
  return { ...createInitialState(content, 0), currentSceneId: 'cityhall_arrival', ...patch };
}
