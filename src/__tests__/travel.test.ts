// __tests__/travel.test.ts — 이동비용(차 렌트·한의 감소·시청↔시장 0), 마감·개방·숨은 edge, 고립 판정, 활동
import { describe, expect, it } from 'vitest';
import { availableActivities, availableEdges, checkLodgingDeadline, computeTravelCost, doActivity, travelTo, useItem } from '../engine';
import { makeContent, makeState } from './helpers';

const content = makeContent();

describe('computeTravelCost', () => {
  it('기본 30, 시청↔시장 0은 수정자와 무관하게 0', () => {
    expect(computeTravelCost(makeState(content), 30)).toBe(30);
    expect(computeTravelCost(makeState(content, { items: ['car_rental'], flags: { travel_discount_today: 10 } }), 0)).toBe(0);
  });
  it('차 렌트 → 10분', () => {
    expect(computeTravelCost(makeState(content, { items: ['car_rental'] }), 30)).toBe(10);
  });
  it('한의 감소 → -10 (최소 0)', () => {
    expect(computeTravelCost(makeState(content, { flags: { travel_discount_today: 10 } }), 30)).toBe(20);
    expect(computeTravelCost(makeState(content, { items: ['car_rental'], flags: { travel_discount_today: 10 } }), 30)).toBe(0);
  });
});

describe('travelTo', () => {
  it('인접 장소로 이동하면 시간이 가산되고 진입 씬 id를 돌려준다', () => {
    const r = travelTo(makeState(content), 'bohyeonsan', content);
    expect(r.state.timeMinutes).toBe(570);
    expect(r.nextSceneId).toBe('bohyeonsan_arrival');
  });
  it('인접하지 않으면 no_edge', () => {
    expect(travelTo(makeState(content), 'bridge', content).blocked).toBe('no_edge');
  });
  it('requires 미충족 edge는 목록에 없고 이동도 막힌다 (봉림사 발견 전)', () => {
    const s = makeState(content, { currentSceneId: 'bohyeonsan_arrival' });
    expect(availableEdges(s, content).map((e) => e.edge.toPlaceId)).not.toContain('bonglimsa');
    expect(travelTo(s, 'bonglimsa', content).blocked).toBe('no_edge');
    const found = useItem({ ...s, items: ['telescope'] }, 'telescope', content);
    expect(found.matched).toBe(true);
    expect(travelTo(found.state, 'bonglimsa', content).nextSceneId).toBe('bonglimsa_arrival');
  });
  it('진입 씬이 아닌 하위 씬(돌아다니기·이벤트)에서는 이동 목록이 비고 이동도 막힌다', () => {
    const s = makeState(content, { currentSceneId: 'start' }); // start는 cityhall 소속이지만 진입 씬이 아님
    expect(availableEdges(s, content)).toEqual([]);
    expect(travelTo(s, 'market', content).blocked).toBe('no_edge');
  });
  it('22:00을 넘기면 time_over', () => {
    expect(travelTo(makeState(content, { timeMinutes: 1300 }), 'bohyeonsan', content).blocked).toBe('time_over');
    expect(travelTo(makeState(content, { timeMinutes: 1300 }), 'market', content).blocked).toBeUndefined();
  });
  it('개방 전 도착은 closed (출렁다리 17:00 개방)', () => {
    const s = makeState(content, { currentSceneId: 'bohyeonsan_arrival', timeMinutes: 900 });
    expect(travelTo(s, 'bridge', content).blocked).toBe('closed');
    expect(travelTo({ ...s, timeMinutes: 1000 }, 'bridge', content).blocked).toBeUndefined();
  });
});

describe('checkLodgingDeadline', () => {
  it('숙소에 있으면 false', () => {
    expect(checkLodgingDeadline(makeState(content, { timeMinutes: 1320 }), content)).toBe(false);
  });
  it('숙소까지 갈 시간이 남았으면 false, 없으면 true', () => {
    const s = makeState(content, { currentSceneId: 'bohyeonsan_arrival', timeMinutes: 1290 });
    expect(checkLodgingDeadline(s, content)).toBe(false);
    expect(checkLodgingDeadline({ ...s, timeMinutes: 1291 }, content)).toBe(true);
    expect(checkLodgingDeadline({ ...s, timeMinutes: 1291, items: ['car_rental'] }, content)).toBe(false);
  });
});

describe('doActivity', () => {
  it('소요 시간 가산 + effects 적용', () => {
    const r = doActivity(makeState(content, { currentSceneId: 'bohyeonsan_arrival' }), 'hike', content);
    expect(r.state.timeMinutes).toBe(600);
    expect(r.state.flags.trust).toBe(1);
  });
  it('진입 씬이 아니면 할 일 목록이 비고 수행도 막힌다', () => {
    expect(availableActivities(makeState(content, { currentSceneId: 'bohyeonsan_walk' }), content)).toEqual([]);
    expect(doActivity(makeState(content, { currentSceneId: 'bohyeonsan_walk' }), 'hike', content).blocked).toBe('not_found');
  });
  it('마감을 넘기면 time_over', () => {
    expect(doActivity(makeState(content, { currentSceneId: 'bohyeonsan_arrival', timeMinutes: 1300 }), 'hike', content).blocked).toBe('time_over');
  });
});

describe('useItem', () => {
  it('규칙 없으면 matched:false + 기본 문구, 상태 불변', () => {
    const s = makeState(content, { items: ['telescope'] });
    const r = useItem(s, 'telescope', content);
    expect(r.matched).toBe(false);
    expect(r.state).toBe(s);
  });
  it('sceneId 규칙 매칭 + 소모품은 사용 후 제거', () => {
    const r = useItem(makeState(content, { items: ['salt'] }), 'salt', content);
    expect(r.matched).toBe(true);
    expect(r.state.flags.salted).toBe(true);
    expect(r.state.items).toEqual([]);
  });
});
