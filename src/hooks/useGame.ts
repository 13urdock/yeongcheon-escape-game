// hooks/useGame.ts — GameState를 보유하고 엔진 함수를 래핑하며 매 변경마다 자동 저장. 규칙 계산은 엔진에 위임.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, Choice, EndingType, GameContent, GameState, Scene } from '../types';
import {
  applyChoice, availableActivities, renderTextOf, rollEncounter, availableEdges, checkLodgingDeadline, clearSave, createInitialState,
  doActivity, enterScene, findEndingScene, hasSave, loadGame, pickBackground, saveGame, travelTo, useItem,
  visibleChoicesOf,
} from '../engine';

export type Phase = 'start' | 'play' | 'ending';
export type EndingReason = 'strikes' | 'timeout' | 'final';

export interface SceneViewModel {
  scene: Scene;
  renderText: string;
  visibleChoices: Choice[];
  background: string;
  placeName: string;
}

export interface EndingInfo { type: EndingType; reason: EndingReason; text: string }

// 스토리 영역에서 본문 아래에 덧붙는 문구. 이 게임에 팝업은 없다.
// - status: 효과로 생긴 상태 변화 (포도알 +3, 강아지을(를) 얻었다 …)
// - text:   활동·아이템 사용의 결과 서술
// - warn:   이동 불가 등 안내
export interface Note { kind: 'status' | 'text' | 'warn'; text: string }

export interface GameApi {
  phase: Phase;
  state: GameState | null;
  view: SceneViewModel | null;
  ending: EndingInfo | null;
  notes: Note[];                   // 현재 씬 본문 아래에 붙일 문구들 (씬이 바뀌면 새로 시작)
  edges: ReturnType<typeof availableEdges>;
  activities: Activity[];
  canContinue: boolean;
  startNew: () => void;
  continueGame: () => void;
  restart: () => void;             // 엔딩 후 시작 화면으로 (세이브는 엔딩 진입 시 이미 삭제됨)
  choose: (choice: Choice) => void;
  travel: (placeId: string) => void;
  activity: (activityId: string) => void;
  use: (itemId: string) => void;   // 결과는 notes로 스토리 영역에 붙는다
}

const BLOCK_MESSAGES: Record<string, string> = {
  no_edge: '그곳으로는 갈 수 없다.',
  time_over: '너무 늦었다. 오늘은 더 이동할 시간이 없다.',
  closed: '아직 문을 열지 않았다.',
  closed_hours: '지금은 운영 시간이 아니다.',
  requires_unmet: '지금은 할 수 없다.',
  not_found: '지금은 할 수 없다.',
};

const statusNotes = (list: string[]): Note[] => list.map((text) => ({ kind: 'status', text }));

// 게임 전체 상태 머신. 화면(components)은 이 훅이 주는 값만 렌더한다.
export function useGame(content: GameContent): GameApi {
  const [phase, setPhase] = useState<Phase>('start');
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<SceneViewModel | null>(null);
  const [ending, setEnding] = useState<EndingInfo | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [canContinue, setCanContinue] = useState<boolean>(() => hasSave());

  // 자동 저장: 플레이 중 state가 바뀔 때마다
  useEffect(() => {
    if (phase === 'play' && state) saveGame(state);
  }, [phase, state]);

  // 같은 씬에 머무는 동안 문구를 아래로 쌓는다. 지난 안내(warn)는 새 문구가 오면 지운다.
  const appendNotes = useCallback((list: Note[]) => {
    if (!list.length) return;
    setNotes((prev) => [...prev.filter((n) => n.kind !== 'warn'), ...list]);
  }, []);

  // 엔딩 화면으로 전환하고 세이브를 지운다.
  const showEnding = useCallback((s: GameState, type: EndingType, reason: EndingReason) => {
    const scene = findEndingScene(type, content);
    setState(s);
    setEnding({ type, reason, text: scene?.normalText ?? '' });
    setPhase('ending');
    clearSave();
    setCanContinue(false);
  }, [content]);

  // 씬 진입 공통 경로: enterScene → 숙소 마감 검사 → 뷰 갱신. carry = 이 진입을 만든 행동의 결과 문구.
  const go = useCallback((s: GameState, sceneId: string, carry: Note[] = []) => {
    const r = enterScene(s, sceneId, content);
    if (checkLodgingDeadline(r.state, content)) { showEnding(r.state, 'bad', 'timeout'); return; }
    setState(r.state);
    setView({ scene: r.scene, renderText: r.renderText, visibleChoices: r.visibleChoices, background: r.background, placeName: content.places[r.scene.placeId].name });
    setNotes(carry);
    setPhase('play');
  }, [content, showEnding]);

  // 씬 재진입 없이(백사 재굴림 없이) 현재 씬의 선택지/배경만 다시 계산
  const refresh = useCallback((s: GameState) => {
    if (checkLodgingDeadline(s, content)) { showEnding(s, 'bad', 'timeout'); return; }
    const scene = content.scenes[s.currentSceneId];
    const place = content.places[scene.placeId];
    setState(s);
    setView({
      scene,
      renderText: renderTextOf(scene, s, content),
      visibleChoices: visibleChoicesOf(scene, s),
      background: pickBackground(place.backgrounds, s.timeMinutes),
      placeName: place.name,
    });
  }, [content, showEnding]);

  const startNew = useCallback(() => {
    setEnding(null);
    go(createInitialState(content), content.startSceneId);
  }, [content, go]);

  const continueGame = useCallback(() => {
    const saved = loadGame();
    if (!saved) { startNew(); return; }
    setEnding(null); setNotes([]);
    // 저장된 씬을 재진입하되 백사 결과는 저장값을 유지
    refresh(saved);
    setPhase('play');
  }, [refresh, startNew]);

  const restart = useCallback(() => {
    setCanContinue(hasSave());
    setState(null); setView(null); setEnding(null); setNotes([]);
    setPhase('start');
  }, []);

  const choose = useCallback((choice: Choice) => {
    if (!state) return;
    const r = applyChoice(state, choice, content);
    if (r.gameOver) { showEnding(r.state, r.gameOver, r.gameOver === 'bad' && r.state.strikes >= 3 ? 'strikes' : 'final'); return; }
    go(r.state, r.nextSceneId!, statusNotes(r.overlays));
  }, [state, content, showEnding, go]);

  const travel = useCallback((placeId: string) => {
    if (!state) return;
    const r = travelTo(state, placeId, content);
    if (r.blocked) { appendNotes([{ kind: 'warn', text: BLOCK_MESSAGES[r.blocked] }]); return; }
    // 도착 시 무작위 만남(강아지·고양이) 굴림 — 맞으면 진입 씬 대신 만남 씬으로
    const enc = rollEncounter(r.state, placeId, content);
    go(enc.state, enc.sceneId ?? r.nextSceneId!);
  }, [state, content, appendNotes, go]);

  // 활동 결과: resultText(서술) → 상태 변화 문구. 둘 다 없으면 "무엇을 하며 몇 분이 흘렀다"만 남긴다.
  const activity = useCallback((activityId: string) => {
    if (!state) return;
    const r = doActivity(state, activityId, content);
    if (r.blocked) { appendNotes([{ kind: 'warn', text: BLOCK_MESSAGES[r.blocked] }]); return; }
    const done: Note[] = [];
    if (r.resultText) done.push({ kind: 'text', text: r.resultText });
    done.push(...statusNotes(r.overlays));
    if (!done.length) {
      const a = availableActivities(state, content).find((x) => x.id === activityId);
      if (a) done.push({ kind: 'status', text: `${a.name} — ${r.state.timeMinutes - state.timeMinutes}분이 흘렀다` });
    }
    if (r.goToSceneId) { go(r.state, r.goToSceneId, done); return; }
    refresh(r.state);
    appendNotes(done);
  }, [state, content, appendNotes, go, refresh]);

  // 아이템 사용: "OO 사용" → 결과 서술 → 상태 변화 문구 순으로 스토리 영역에 붙는다.
  const use = useCallback((itemId: string) => {
    if (!state) return;
    const r = useItem(state, itemId, content);
    const used: Note[] = [
      { kind: 'status', text: `${content.items[itemId]?.name ?? itemId} 사용` },
      { kind: 'text', text: r.resultText },
      ...statusNotes(r.overlays),
    ];
    if (r.gameOver) { showEnding(r.state, r.gameOver, 'final'); return; }
    if (r.nextSceneId) { go(r.state, r.nextSceneId, used); return; }
    if (r.matched) refresh(r.state);
    appendNotes(used);
  }, [state, content, appendNotes, showEnding, go, refresh]);

  const edges = useMemo(() => (state && phase === 'play' ? availableEdges(state, content) : []), [state, phase, content]);
  const activities = useMemo(() => (state && phase === 'play' ? availableActivities(state, content) : []), [state, phase, content]);

  return { phase, state, view, ending, notes, edges, activities, canContinue,
    startNew, continueGame, restart, choose, travel, activity, use };
}
