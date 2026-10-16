// __tests__/save.test.ts — 저장·복원·초기화 라운드트립, 손상/버전 불일치 처리, 실제 콘텐츠 검증
import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../constants';
import { createInitialState, hasSave, loadGame, resetGame, saveGame } from '../engine';
import { loadContent } from '../content';
import { collectContentProblems } from '../content/validate';
import { makeContent, makeState } from './helpers';

const content = makeContent();

beforeEach(() => localStorage.clear());

describe('save/load', () => {
  it('저장 전엔 세이브 없음', () => {
    expect(hasSave()).toBe(false);
    expect(loadGame()).toBeNull();
  });
  it('저장 → 로드 라운드트립', () => {
    const s = makeState(content, { grapes: 4, flags: { a: 1 }, items: ['dog'] });
    saveGame(s);
    expect(hasSave()).toBe(true);
    expect(loadGame()).toEqual(s);
  });
  it('손상된 JSON / 버전 불일치는 null', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadGame()).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...makeState(content), saveVersion: 999 }));
    expect(loadGame()).toBeNull();
  });
  it('resetGame은 SAVE_KEY만 지우고 초기 상태를 저장한다', () => {
    localStorage.setItem('other', 'keep');
    saveGame(makeState(content, { grapes: 9 }));
    const fresh = resetGame(content);
    expect(fresh.grapes).toBe(0);
    expect(fresh.currentSceneId).toBe(content.startSceneId);
    expect(loadGame()?.grapes).toBe(0);
    expect(localStorage.getItem('other')).toBe('keep');
  });
  it('초기 상태: 1일차 09:00, 시작 씬', () => {
    const s = createInitialState(content, 123);
    expect(s).toMatchObject({ day: 1, timeMinutes: 540, strikes: 0, grapes: 0, currentSceneId: 'start', startedAt: 123 });
  });
});

describe('실제 콘텐츠(content/*.json)', () => {
  it('검증을 통과한다', () => {
    const real = loadContent();
    expect(collectContentProblems(real)).toEqual([]);
    expect(Object.keys(real.places)).toHaveLength(13); // 12곳 + 지네 동굴
  });
});
