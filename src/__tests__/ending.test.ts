// __tests__/ending.test.ts — 4엔딩 판정과 규칙 우선순위(hidden > happy > normal > bad)
import { describe, expect, it } from 'vitest';
import { evaluateEnding, findEndingScene } from '../engine';
import { makeContent, makeState } from './helpers';

const content = makeContent();

describe('evaluateEnding', () => {
  it('아무 조건도 없으면 bad(최종형)', () => {
    expect(evaluateEnding(makeState(content))).toBe('bad');
  });

  it('강아지만 있으면 normal', () => {
    expect(evaluateEnding(makeState(content, { items: ['dog'] }))).toBe('normal');
  });

  it('강아지 + 예불 + 엿듣기 + 동굴 → happy', () => {
    const s = makeState(content, { items: ['dog'], flags: { prayed_at_bonglimsa: true, overheard_monk_story: true, defeated_snake_at_cave: true } });
    expect(evaluateEnding(s)).toBe('happy');
  });

  it('happy 조건이 하나라도 빠지면 normal로 떨어진다', () => {
    const s = makeState(content, { items: ['dog'], flags: { prayed_at_bonglimsa: true, overheard_monk_story: true } });
    expect(evaluateEnding(s)).toBe('normal');
  });

  it('hidden 조건은 happy보다 우선한다', () => {
    const s = makeState(content, { items: ['dog'], flags: {
      helped_monks: true, heard_monk_story: true, bonglimsa_early: true,
      prayed_at_bonglimsa: true, overheard_monk_story: true, defeated_snake_at_cave: true,
    } });
    expect(evaluateEnding(s)).toBe('hidden');
  });

  it('hidden은 강아지 없이도 성립한다', () => {
    const s = makeState(content, { flags: { helped_monks: true, heard_monk_story: true, bonglimsa_early: true } });
    expect(evaluateEnding(s)).toBe('hidden');
  });

  it('엔딩 씬을 타입으로 찾는다', () => {
    expect(findEndingScene('hidden', content)?.id).toBe('ending_hidden');
  });
});
