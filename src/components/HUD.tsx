// components/HUD.tsx — 상단 상태 줄(가운데 정렬): 시간(일차) · 포도 · 삼진 아웃
import type { GameState } from '../types';
import { MAX_STRIKES } from '../constants';
import { formatClock } from '../engine';

export function HUD({ state }: { state: GameState }) {
  return (
    <header className="hud">
      <div className="stat">
        <span className="stat-value">{formatClock(state.timeMinutes)}</span>
        <span className="stat-label">{state.day}일차</span>
      </div>
      <div className="stat">
        <span className="stat-value">{state.grapes}</span>
        <span className="stat-label">포도</span>
      </div>
      <div className="stat">
        <span className="stat-value strikes" aria-label={`삼진 아웃 ${state.strikes}/${MAX_STRIKES}`}>
          {Array.from({ length: MAX_STRIKES }, (_, i) => <i key={i} className={i < state.strikes ? 'on' : ''} />)}
        </span>
        <span className="stat-label">삼진 아웃</span>
      </div>
    </header>
  );
}
