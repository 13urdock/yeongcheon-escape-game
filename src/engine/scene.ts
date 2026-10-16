// engine/scene.ts — 씬 진입: 이벤트 씬 대체, 백사 등장 굴림, 렌더 텍스트/선택지/배경 결정
import type { Choice, GameContent, GameState, Scene } from '../types';
import { CLOSED_NOTICE, SNAKE_CHANCE } from '../constants';
import { evaluateCondition, passes } from './condition';
import { isOutsideHours, pickBackground } from './time';
import { entrySceneId } from './travel';

export interface EnterResult {
  state: GameState;
  scene: Scene;
  renderText: string;
  visibleChoices: Choice[];
  background: string;
}

// 씬에 진입한다.
// 1) 같은 장소의 미방문 씬 중 triggerCondition이 참인 것이 있으면 그 씬으로 대체(이벤트 우선)
// 2) 백사 판정: place.snakeFixedFrom 이후면 확정, (scene.snakeCanAppear ?? place.snakeCanAppear)면 rng()<20%
//    (씬에 snake 콘텐츠가 있을 때만)
// 3) visited 기록 → 텍스트·선택지·배경 계산
// rng는 테스트에서 결정화하기 위해 주입 가능. 입력 state 불변.
export function enterScene(state: GameState, sceneId: string, content: GameContent, rng: () => number = Math.random): EnterResult {
  const requested = content.scenes[sceneId];
  if (!requested) throw new Error(`scene '${sceneId}' 없음`);
  const scene = findTriggeredScene(state, requested, content) ?? requested;
  const place = content.places[scene.placeId];

  const hasSnakeContent = Boolean(scene.snakeText || scene.snakeChoices?.length);
  let snake = false;
  if (!scene.isEnding && hasSnakeContent) {
    if (place.snakeFixedFrom !== undefined && state.timeMinutes >= place.snakeFixedFrom) snake = true;
    else if (scene.snakeCanAppear ?? place.snakeCanAppear) snake = rng() < SNAKE_CHANCE;
  }

  const next: GameState = {
    ...state,
    currentSceneId: scene.id,
    snakeActiveInScene: snake,
    visitedPlaces: state.visitedPlaces.includes(place.id) ? state.visitedPlaces : [...state.visitedPlaces, place.id],
    visitedScenes: state.visitedScenes.includes(scene.id) ? state.visitedScenes : [...state.visitedScenes, scene.id],
  };

  return {
    state: next,
    scene,
    renderText: renderTextOf(scene, next, content),
    visibleChoices: visibleChoicesOf(scene, next),
    background: pickBackground(place.backgrounds, next.timeMinutes),
  };
}

// 렌더 본문: 백사 등장 → snakeText, 진입 씬인데 운영 시간 밖 → closedText(없으면 본문+영업 종료 문구), 그 외 normalText.
export function renderTextOf(scene: Scene, state: GameState, content: GameContent): string {
  if (state.snakeActiveInScene) return scene.snakeText ?? scene.normalText;
  const place = content.places[scene.placeId];
  if (scene.id === entrySceneId(place) && isOutsideHours(place, state.timeMinutes)) {
    return place.closedText ?? `${scene.normalText}\n\n${CLOSED_NOTICE}`;
  }
  return scene.normalText;
}

// 현재 state 기준으로 씬의 노출 선택지(requires 통과 + 백사 시 snakeChoices 추가).
export function visibleChoicesOf(scene: Scene, state: GameState): Choice[] {
  const all = state.snakeActiveInScene ? [...scene.choices, ...(scene.snakeChoices ?? [])] : scene.choices;
  return all.filter((c) => passes(c.requires, state));
}

// 같은 장소의 미방문 이벤트 씬 중 조건 참인 첫 씬. 자기 자신은 제외.
function findTriggeredScene(state: GameState, target: Scene, content: GameContent): Scene | undefined {
  return Object.values(content.scenes).find(
    (s) => s.id !== target.id && s.placeId === target.placeId && s.triggerCondition !== undefined
      && !state.visitedScenes.includes(s.id) && evaluateCondition(s.triggerCondition, state),
  );
}
