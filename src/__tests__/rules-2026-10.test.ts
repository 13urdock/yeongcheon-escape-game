// __tests__/rules-2026-10.test.ts — 10/16 규칙 변경 검증: 씬 단위 백사, 운영 시간, 무작위 만남(보정), 만남 템플릿 복제, 실제 콘텐츠 무결성
import { describe, expect, it } from 'vitest';
import type { Place, Scene } from '../types';
import { assembleContent, loadContent } from '../content';
import { collectContentProblems } from '../content/validate';
import { applyChoice, availableActivities, availableEdges, createInitialState, doActivity, enterScene, rollEncounter, travelTo, useItem } from '../engine';
import { CLOSED_NOTICE } from '../constants';

const place = (id: string, extra: Partial<Place> = {}): Place => ({
  id, name: id, backgrounds: { morning: `${id}.png` }, lodging: false, connections: [], activities: [], snakeCanAppear: false, ...extra,
});
const scene = (id: string, placeId: string, extra: Partial<Scene> = {}): Scene => ({
  id, placeId, normalText: `${id} text`, choices: [], isEnding: false, ...extra,
});

function fixture() {
  return assembleContent({
    places: [
      place('city', { lodging: true }),
      place('bridge', { snakeFixedFrom: 1200, operatingHours: { from: 540, to: 1020 },
        activities: [{ id: 'cross', name: '건너기', durationMinutes: 30 }] }),
      place('hill'),
    ],
    scenes: [
      scene('city_arrival', 'city'),
      scene('city_spot', 'city', { snakeCanAppear: true, snakeText: 'snake in spot',
        choices: [{ id: 'b', text: 'b', isTrap: false, nextSceneId: 'city_arrival' }] }),
      scene('bridge_arrival', 'bridge', { snakeText: 'snake at night' }),
      scene('hill_arrival', 'hill'),
    ],
    items: [{ id: 'dog', name: '강아지', description: '', category: 'companion' }],
    characters: [], branchRules: [], itemUseRules: [], startSceneId: 'city_arrival',
    encounters: [{ id: 'companion', placeIds: ['hill'], chance: 0.2, pityAfter: 2,
      requires: { type: 'companionIs', companion: null },
      scenes: [{ id: 'dog_meet', isEnding: false, normalText: 'dog!', choices: [
        { id: 'take', text: 'take', isTrap: false, effects: [{ type: 'setCompanion', companion: 'dog' }], nextSceneId: '$arrival' }] }] }],
  });
}
const st = (c: ReturnType<typeof fixture>, patch = {}) => ({ ...createInitialState(c, 0), ...patch });

describe('씬 단위 백사', () => {
  it('장소는 백사 없음이어도 snakeCanAppear 씬에서는 20% 굴림', () => {
    const c = fixture();
    expect(enterScene(st(c), 'city_spot', c, () => 0.1).state.snakeActiveInScene).toBe(true);
    expect(enterScene(st(c), 'city_spot', c, () => 0.5).state.snakeActiveInScene).toBe(false);
  });
});

describe('운영 시간 (출렁다리 09~17시)', () => {
  it('운영 중이면 활동 노출, 17시 이후엔 활동 숨김 + 영업 종료 문구', () => {
    const c = fixture();
    const open = enterScene(st(c, { timeMinutes: 600 }), 'bridge_arrival', c, () => 0.9);
    expect(availableActivities(open.state, c).map((a) => a.id)).toEqual(['cross']);
    expect(doActivity(open.state, 'cross', c).state.timeMinutes).toBe(630);
    const closed = enterScene(st(c, { timeMinutes: 1100 }), 'bridge_arrival', c, () => 0.9);
    expect(closed.renderText).toContain(CLOSED_NOTICE);
    expect(availableActivities(closed.state, c)).toEqual([]);
    expect(doActivity(closed.state, 'cross', c).blocked).toBe('closed_hours');
  });
  it('20시 이후엔 영업 종료여도 백사 확정 (백사 본문 우선)', () => {
    const c = fixture();
    const r = enterScene(st(c, { timeMinutes: 1200 }), 'bridge_arrival', c, () => 0.99);
    expect(r.state.snakeActiveInScene).toBe(true);
    expect(r.renderText).toBe('snake at night');
  });
});

describe('무작위 만남 (20% + 2번 빗나가면 확정)', () => {
  it('템플릿이 장소별로 복제되고 $arrival이 진입 씬으로 치환된다', () => {
    const c = fixture();
    expect(c.scenes['hill__dog_meet'].choices[0].nextSceneId).toBe('hill_arrival');
    expect(c.encounters[0].sceneIdsByPlace.hill).toEqual(['hill__dog_meet']);
  });
  it('빗나감 2번 후 3번째는 확정, 맞으면 카운터 리셋', () => {
    const c = fixture();
    let s = st(c);
    let r = rollEncounter(s, 'hill', c, () => 0.99); expect(r.sceneId).toBeUndefined(); s = r.state;
    r = rollEncounter(s, 'hill', c, () => 0.99); expect(r.sceneId).toBeUndefined(); s = r.state;
    r = rollEncounter(s, 'hill', c, () => 0.99); expect(r.sceneId).toBe('hill__dog_meet');
    expect(r.state.flags.encounter_miss_companion).toBe(0);
  });
  it('동행이 있거나 대상 장소가 아니면 굴리지 않는다', () => {
    const c = fixture();
    expect(rollEncounter(st(c, { companion: 'dog' }), 'hill', c, () => 0).sceneId).toBeUndefined();
    expect(rollEncounter(st(c), 'city', c, () => 0).sceneId).toBeUndefined();
  });
});

describe('실제 콘텐츠', () => {
  it('검증 문제 0건', () => {
    expect(collectContentProblems(loadContent())).toEqual([]);
  });
});

describe('실제 콘텐츠 루트', () => {
  const c = loadContent();
  const never = () => 0.99; // 백사·만남 안 나오게
  it('히든: 은해사 숙박 → 05:00 새벽 예불 → 보현산 망원경 → 봉림사 09:00 전 도착 이벤트', () => {
    let s = enterScene({ ...createInitialState(c, 0), items: ['telescope'], timeMinutes: 1200 }, 'eunhaesa_arrival', c, never).state;
    const sleep = c.scenes.eunhaesa_arrival.choices.find((x) => x.id === 'eunhaesa_sleep')!;
    let r = applyChoice(s, sleep, c);
    expect(r.nextSceneId).toBe('eunhaesa_dawn_prayer');
    expect(r.state.timeMinutes).toBe(300);
    s = enterScene(r.state, r.nextSceneId!, c, never).state;
    r = applyChoice(s, c.scenes.eunhaesa_dawn_prayer.choices[0], c);
    expect(r.state.flags.attended_dawn_prayer).toBe(true);
    s = enterScene(r.state, r.nextSceneId!, c, never).state;
    for (const to of ['cityhall', 'bohyeonsan']) { const t = travelTo(s, to, c); s = enterScene(t.state, t.nextSceneId!, c, never).state; }
    s = useItem(s, 'telescope', c).state;
    const t = travelTo(s, 'bonglimsa', c);
    const arrived = enterScene(t.state, t.nextSceneId!, c, never);
    expect(arrived.state.timeMinutes).toBeLessThan(540);
    expect(arrived.scene.id).toBe('bonglimsa_early_event');
  });
  it('동굴: 봉림사에서 망원경 → 마지막 날 + 강아지일 때만 길이 열린다', () => {
    let s = enterScene({ ...createInitialState(c, 0), items: ['telescope'], day: 2 }, 'bonglimsa_arrival', c, never).state;
    s = useItem(s, 'telescope', c).state;
    expect(s.flags.found_cave).toBe(true);
    const names = (x: typeof s) => availableEdges(x, c).map((e) => e.edge.toPlaceId);
    expect(names(s)).not.toContain('cave');
    expect(names({ ...s, day: 3 })).not.toContain('cave');
    expect(names({ ...s, day: 3, items: [...s.items, 'dog'] })).toContain('cave');
  });
  it('시청 도착엔 백사 없음, 내부 지점은 입장료(포도알)를 낸다', () => {
    const s = enterScene({ ...createInitialState(c, 0), grapes: 3 }, 'cityhall_arrival', c, () => 0).state;
    expect(s.snakeActiveInScene).toBe(false);
    const go = c.scenes.cityhall_walk.choices.find((x) => x.id === 'cityhall_walk_to_1')!;
    expect(applyChoice(s, go, c).state.grapes).toBe(2);
    expect(enterScene(s, 'cityhall_spot_1', c, () => 0).state.snakeActiveInScene).toBe(true);
  });
  it('보현산 별 보기는 20시 이후에만', () => {
    const at = (m: number) => availableActivities(enterScene({ ...createInitialState(c, 0), timeMinutes: m }, 'bohyeonsan_arrival', c, never).state, c).map((a) => a.id);
    expect(at(600)).toEqual(['observatory_tour']);
    expect(at(1200)).toEqual(['observatory_tour', 'stargazing']);
  });
});
