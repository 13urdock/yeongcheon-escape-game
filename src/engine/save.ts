// engine/save.ts — localStorage 세이브/로드/초기화 + 초기 상태 생성. 여기만 localStorage를 만진다.
import type { GameContent, GameState } from '../types';
import { DAY_START_MIN, SAVE_KEY, SAVE_VERSION } from '../constants';

// 저장소 접근을 한 곳에 모아 테스트에서 교체 가능하게 한다.
function storage(): Storage | null {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

// 새 게임의 초기 상태. startSceneId, 1일차 09:00, 자원 0.
export function createInitialState(content: GameContent, now: number = Date.now()): GameState {
  return {
    currentSceneId: content.startSceneId,
    day: 1,
    timeMinutes: DAY_START_MIN,
    grapes: 0,
    items: [],
    companion: null,
    flags: {},
    strikes: 0,
    snakeActiveInScene: false,
    visitedPlaces: [],
    visitedScenes: [],
    saveVersion: SAVE_VERSION,
    startedAt: now,
  };
}

// 세이브를 읽어 GameState로 파싱. 없거나 손상되었거나 saveVersion이 다르면 null.
export function loadGame(): GameState | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.saveVersion !== SAVE_VERSION || typeof parsed.currentSceneId !== 'string') return null;
    return parsed as GameState;
  } catch {
    return null;
  }
}

// state를 JSON으로 저장. 저장 실패(용량·프라이빗 모드)는 조용히 무시.
export function saveGame(state: GameState): void {
  const s = storage();
  if (!s) return;
  try { s.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// 세이브 삭제 후 새 초기 상태를 만들어 저장·반환. 전시 폰 초기화용. 다른 키는 건드리지 않음.
export function resetGame(content: GameContent): GameState {
  const s = storage();
  try { s?.removeItem(SAVE_KEY); } catch { /* ignore */ }
  const fresh = createInitialState(content);
  saveGame(fresh);
  return fresh;
}

// 세이브만 삭제 (엔딩 도달 후 '이어하기'가 뜨지 않도록).
export function clearSave(): void {
  try { storage()?.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

// 유효한 세이브가 있는지 (시작 화면 '이어하기' 노출 판단).
export function hasSave(): boolean {
  return loadGame() !== null;
}
