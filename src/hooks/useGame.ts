// hooks/useGame.ts — GameState를 보유하고 엔진 함수를 래핑하며 매 변경마다 자동 저장. 규칙 계산은 엔진에 위임.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Activity, Choice, EndingType, GameContent, GameState, Scene } from '../types';
import {
  applyChoice, availableActivities, availableEdges, checkLodgingDeadline, clearSave, createInitialState,
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
export interface OverlayMessage { id: number; text: string; at: number }

export interface GameApi {
  phase: Phase;
  state: GameState | null;
  view: SceneViewModel | null;
  ending: EndingInfo | null;
  overlays: OverlayMessage[];
  message: string | null;          // 이동 불가 등 안내 문구
  extraText: string | null;        // 활동/아이템 결과 문구(본문 아래 덧붙임)
  edges: ReturnType<typeof availableEdges>;
  activities: Activity[];
  canContinue: boolean;
  startNew: () => void;
  continueGame: () => void;
  resetAll: () => void;
  choose: (choice: Choice) => void;
  travel: (placeId: string) => void;
  activity: (activityId: string) => void;
  use: (itemId: string) => string;  // 결과 문구 반환(인벤토리 뷰 표시용)
  popOverlay: (id: number) => void;
}

const BLOCK_MESSAGES: Record<string, string> = {
  no_edge: '그곳으로는 갈 수 없다.',
  time_over: '너무 늦었다. 오늘은 더 이동할 시간이 없다.',
  closed: '아직 문을 열지 않았다.',
  requires_unmet: '지금은 할 수 없다.',
  not_found: '지금은 할 수 없다.',
};

let nextOverlayId = 1;

// 게임 전체 상태 머신. 화면(components)은 이 훅이 주는 값만 렌더한다.
export function useGame(content: GameContent): GameApi {
  const [phase, setPhase] = useState<Phase>('start');
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<SceneViewModel | null>(null);
  const [ending, setEnding] = useState<EndingInfo | null>(null);
  const [overlays, setOverlays] = useState<OverlayMessage[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [extraText, setExtraText] = useState<string | null>(null);
  const [canContinue, setCanContinue] = useState<boolean>(() => hasSave());

  // 자동 저장: 플레이 중 state가 바뀔 때마다
  useEffect(() => {
    if (phase === 'play' && state) saveGame(state);
  }, [phase, state]);

  const pushOverlays = useCallback((list: string[]) => {
    if (!list.length) return;
    const at = Date.now();
    setOverlays((prev) => [...prev, ...list.map((text) => ({ id: nextOverlayId++, text, at }))]);
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

  // 씬 진입 공통 경로: enterScene → 숙소 마감 검사 → 뷰 갱신
  const go = useCallback((s: GameState, sceneId: string) => {
    const r = enterScene(s, sceneId, content);
    if (checkLodgingDeadline(r.state, content)) { showEnding(r.state, 'bad', 'timeout'); return; }
    setState(r.state);
    setView({ scene: r.scene, renderText: r.renderText, visibleChoices: r.visibleChoices, background: r.background, placeName: content.places[r.scene.placeId].name });
    setExtraText(null);
    setMessage(null);
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
      renderText: s.snakeActiveInScene ? (scene.snakeText ?? scene.normalText) : scene.normalText,
      visibleChoices: visibleChoicesOf(scene, s),
      background: pickBackground(place.backgrounds, s.timeMinutes),
      placeName: place.name,
    });
  }, [content, showEnding]);

  const startNew = useCallback(() => {
    setEnding(null); setOverlays([]);
    go(createInitialState(content), content.startSceneId);
  }, [content, go]);

  const continueGame = useCallback(() => {
    const saved = loadGame();
    if (!saved) { startNew(); return; }
    setEnding(null); setOverlays([]);
    // 저장된 씬을 재진입하되 백사 결과는 저장값을 유지
    refresh(saved);
    setPhase('play');
  }, [refresh, startNew]);

  const resetAll = useCallback(() => {
    clearSave();
    setCanContinue(false);
    setState(null); setView(null); setEnding(null); setOverlays([]); setMessage(null); setExtraText(null);
    setPhase('start');
  }, []);

  const choose = useCallback((choice: Choice) => {
    if (!state) return;
    const r = applyChoice(state, choice, content);
    pushOverlays(r.overlays);
    if (r.gameOver) { showEnding(r.state, r.gameOver, r.gameOver === 'bad' && r.state.strikes >= 3 ? 'strikes' : 'final'); return; }
    go(r.state, r.nextSceneId!);
  }, [state, content, pushOverlays, showEnding, go]);

  const travel = useCallback((placeId: string) => {
    if (!state) return;
    const r = travelTo(state, placeId, content);
    if (r.blocked) { setMessage(BLOCK_MESSAGES[r.blocked]); return; }
    go(r.state, r.nextSceneId!);
  }, [state, content, go]);

  const activity = useCallback((activityId: string) => {
    if (!state) return;
    const r = doActivity(state, activityId, content);
    if (r.blocked) { setMessage(BLOCK_MESSAGES[r.blocked]); return; }
    pushOverlays(r.overlays);
    if (r.goToSceneId) { go(r.state, r.goToSceneId); return; }
    refresh(r.state);
    setMessage(null);
    if (r.resultText) setExtraText(r.resultText);
  }, [state, content, pushOverlays, go, refresh]);

  const use = useCallback((itemId: string): string => {
    if (!state) return '';
    const r = useItem(state, itemId, content);
    pushOverlays(r.overlays);
    if (r.gameOver) { showEnding(r.state, r.gameOver, 'final'); return r.resultText; }
    if (r.nextSceneId) go(r.state, r.nextSceneId);
    else if (r.matched) refresh(r.state);
    return r.resultText;
  }, [state, content, pushOverlays, showEnding, go, refresh]);

  const popOverlay = useCallback((id: number) => setOverlays((prev) => prev.filter((m) => m.id !== id)), []);

  const edges = useMemo(() => (state && phase === 'play' ? availableEdges(state, content) : []), [state, phase, content]);
  const activities = useMemo(() => (state && phase === 'play' ? availableActivities(state, content) : []), [state, phase, content]);

  return { phase, state, view, ending, overlays, message, extraText, edges, activities, canContinue,
    startNew, continueGame, resetAll, choose, travel, activity, use, popOverlay };
}
