// types/state.ts — 런타임 게임 상태(GameState)와 엔딩 타입. localStorage에 그대로 직렬화됨.
import type { FlagValue } from './effect';

export type EndingType = 'normal' | 'bad' | 'happy' | 'hidden';

export interface GameState {
  // 진행
  currentSceneId: string;
  day: number;              // 1~3
  timeMinutes: number;      // 자정 기준 분. 하루 시작 09:00 = 540

  // 자원·소지
  grapes: number;
  items: string[];          // 소지 아이템 id
  companion: 'dog' | 'cat' | null;

  // 플래그 (자유 확장)
  flags: Record<string, FlagValue>;

  // 백사 시스템
  strikes: number;              // MAX_STRIKES 도달 → 즉시 배드엔딩
  snakeActiveInScene: boolean;  // 현재 씬 백사 굴림 결과 (렌더 분기용)

  // 기록
  visitedPlaces: string[];
  visitedScenes: string[];

  // 메타
  saveVersion: number;
  startedAt: number;
}
