// __tests__/condition.test.ts — FlagCondition 평가 (and/or/not 재귀, 각 리프 타입)
import { describe, expect, it } from 'vitest';
import { evaluateCondition } from '../engine';
import { makeContent, makeState } from './helpers';

const content = makeContent();

describe('evaluateCondition', () => {
  const s = makeState(content, {
    items: ['dog'], grapes: 5, flags: { trust: 3, done: true }, visitedPlaces: ['market'], timeMinutes: 600, day: 2, companion: 'dog',
  });

  it('리프 조건들을 올바르게 판정한다', () => {
    expect(evaluateCondition({ type: 'hasItem', itemId: 'dog' }, s)).toBe(true);
    expect(evaluateCondition({ type: 'notItem', itemId: 'cat' }, s)).toBe(true);
    expect(evaluateCondition({ type: 'flagEquals', key: 'done', value: true }, s)).toBe(true);
    expect(evaluateCondition({ type: 'flagEquals', key: 'missing', value: true }, s)).toBe(false);
    expect(evaluateCondition({ type: 'flagGte', key: 'trust', value: 3 }, s)).toBe(true);
    expect(evaluateCondition({ type: 'flagGte', key: 'nope', value: 1 }, s)).toBe(false);
    expect(evaluateCondition({ type: 'flagLte', key: 'trust', value: 2 }, s)).toBe(false);
    expect(evaluateCondition({ type: 'visited', placeId: 'market' }, s)).toBe(true);
    expect(evaluateCondition({ type: 'grapesGte', amount: 5 }, s)).toBe(true);
    expect(evaluateCondition({ type: 'timeBefore', minutes: 601 }, s)).toBe(true);
    expect(evaluateCondition({ type: 'timeAfter', minutes: 600 }, s)).toBe(true);
    expect(evaluateCondition({ type: 'dayEquals', day: 2 }, s)).toBe(true);
    expect(evaluateCondition({ type: 'companionIs', companion: 'dog' }, s)).toBe(true);
  });

  it('and / or / not 를 재귀적으로 조합한다', () => {
    expect(evaluateCondition({ type: 'and', conditions: [
      { type: 'hasItem', itemId: 'dog' },
      { type: 'not', condition: { type: 'hasItem', itemId: 'cat' } },
      { type: 'or', conditions: [{ type: 'grapesGte', amount: 100 }, { type: 'flagGte', key: 'trust', value: 1 }] },
    ] }, s)).toBe(true);
    expect(evaluateCondition({ type: 'and', conditions: [{ type: 'hasItem', itemId: 'dog' }, { type: 'hasItem', itemId: 'cat' }] }, s)).toBe(false);
    expect(evaluateCondition({ type: 'and', conditions: [] }, s)).toBe(true);
    expect(evaluateCondition({ type: 'or', conditions: [] }, s)).toBe(false);
  });
});
