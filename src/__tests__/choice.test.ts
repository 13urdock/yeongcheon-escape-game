// __tests__/choice.test.ts — isTrap→strike 자동 부여, 삼진 즉시 배드, 효과 적용, 분기, finish, nextDay
import { describe, expect, it } from 'vitest';
import { applyChoice, enterScene, evaluateEnding } from '../engine';
import { makeContent, makeState } from './helpers';

const content = makeContent();
const scene = content.scenes['cityhall_arrival'];
const trap = scene.snakeChoices![0];
const safe = scene.snakeChoices![1];

describe('applyChoice', () => {
  it('isTrap 선택은 콘텐츠에 strike effect가 없어도 strike +1', () => {
    const r = applyChoice(makeState(content), trap, content);
    expect(r.state.strikes).toBe(1);
    expect(r.gameOver).toBeUndefined();
    expect(r.nextSceneId).toBe('cityhall_arrival');
    expect(r.overlays.length).toBe(1);
  });

  it('안전 선택은 strike 없음', () => {
    expect(applyChoice(makeState(content), safe, content).state.strikes).toBe(0);
  });

  it('3스트라이크 도달 시 즉시 gameOver:bad', () => {
    const r = applyChoice(makeState(content, { strikes: 2 }), trap, content);
    expect(r.state.strikes).toBe(3);
    expect(r.gameOver).toBe('bad');
    expect(r.nextSceneId).toBeUndefined();
  });

  it('입력 state를 변경하지 않는다(불변)', () => {
    const s = makeState(content);
    applyChoice(s, trap, content);
    expect(s.strikes).toBe(0);
  });

  it('효과: 포도 소비 + 아이템 획득 + 동행 자동 설정', () => {
    const buy = content.scenes['market_arrival'].choices[0];
    const r = applyChoice(makeState(content, { currentSceneId: 'market_arrival', grapes: 5, items: ['cat'], companion: 'cat' }), buy, content);
    expect(r.state.grapes).toBe(2);
    expect(r.state.items).toEqual(['dog']);        // 고양이는 배타로 제거
    expect(r.state.companion).toBe('dog');
  });

  it('resolveNextScene은 BranchRule을 위→아래 평가한다', () => {
    const branch = scene.choices.find((c) => c.id === 'branch')!;
    expect(applyChoice(makeState(content, { flags: { trust: 2 } }), branch, content).nextSceneId).toBe('market_arrival');
    expect(applyChoice(makeState(content), branch, content).nextSceneId).toBe('cityhall_arrival');
  });

  it('nextDay: 일차 +1, 09:00 리셋, 당일 이동 감소 플래그 제거', () => {
    const sleep = scene.choices.find((c) => c.id === 'sleep')!;
    const r = applyChoice(makeState(content, { timeMinutes: 1300, flags: { travel_discount_today: 10, keep: true } }), sleep, content);
    expect(r.state.day).toBe(2);
    expect(r.state.timeMinutes).toBe(540);
    expect(r.state.flags).toEqual({ keep: true });
    expect(r.gameOver).toBeUndefined();
  });

  it('마지막 날(3일차) 취침 → 최종 평가로 gameOver', () => {
    const sleep = scene.choices.find((c) => c.id === 'sleep')!;
    const r = applyChoice(makeState(content, { day: 3, items: ['dog'] }), sleep, content);
    expect(r.gameOver).toBe('normal');
  });

  it('finish 효과 → evaluateEnding 결과로 gameOver', () => {
    const finish = scene.choices.find((c) => c.id === 'finish')!;
    const s = makeState(content);
    expect(applyChoice(s, finish, content).gameOver).toBe(evaluateEnding(s));
  });

  it('enterScene: 백사 굴림은 rng로 결정화되며 snakeChoices가 노출된다', () => {
    const s = makeState(content);
    const withSnake = enterScene(s, 'cityhall_arrival', content, () => 0.1);
    expect(withSnake.state.snakeActiveInScene).toBe(true);
    expect(withSnake.renderText).toBe('snake here');
    expect(withSnake.visibleChoices.map((c) => c.id)).toContain('trap');
    const noSnake = enterScene(s, 'cityhall_arrival', content, () => 0.9);
    expect(noSnake.state.snakeActiveInScene).toBe(false);
    expect(noSnake.visibleChoices.map((c) => c.id)).not.toContain('trap');
  });

  it('enterScene: 출렁다리는 20:00 이후 rng와 무관하게 백사 확정', () => {
    const s = makeState(content, { currentSceneId: 'bridge_arrival', timeMinutes: 1200 });
    expect(enterScene(s, 'bridge_arrival', content, () => 0.99).state.snakeActiveInScene).toBe(true);
    const early = makeState(content, { currentSceneId: 'bridge_arrival', timeMinutes: 1100 });
    expect(enterScene(early, 'bridge_arrival', content, () => 0.99).state.snakeActiveInScene).toBe(false);
  });

  it('enterScene: triggerCondition 씬이 같은 장소 진입을 가로챈다(미방문 1회)', () => {
    const s = makeState(content, { timeMinutes: 400 });
    const r = enterScene(s, 'bonglimsa_arrival', content);
    expect(r.scene.id).toBe('bonglimsa_early');
    const again = enterScene(r.state, 'bonglimsa_arrival', content);
    expect(again.scene.id).toBe('bonglimsa_arrival');
  });
});
