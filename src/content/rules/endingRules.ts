// content/rules/endingRules.ts — 엔딩 판정 규칙(데이터). 위→아래 첫 매치. 매치 없으면 'bad'(최종형).
import type { EndingType, FlagCondition } from '../../types';

export interface EndingRule {
  type: EndingType;
  when: FlagCondition;
}

// 플래그 이름은 콘텐츠 확정 시 여기서만 바꾸면 됨.
export const ENDING_RULES: EndingRule[] = [
  {
    type: 'hidden',
    when: {
      type: 'and',
      conditions: [
        { type: 'flagEquals', key: 'helped_monks', value: true },
        { type: 'flagEquals', key: 'heard_monk_story', value: true },
        { type: 'flagEquals', key: 'bonglimsa_early', value: true },
      ],
    },
  },
  {
    type: 'happy',
    when: {
      type: 'and',
      conditions: [
        { type: 'hasItem', itemId: 'dog' },
        { type: 'flagEquals', key: 'prayed_at_bonglimsa', value: true },
        { type: 'flagEquals', key: 'overheard_monk_story', value: true },
        { type: 'flagEquals', key: 'defeated_snake_at_cave', value: true },
      ],
    },
  },
  { type: 'normal', when: { type: 'hasItem', itemId: 'dog' } },
];

export const FALLBACK_ENDING: EndingType = 'bad';
