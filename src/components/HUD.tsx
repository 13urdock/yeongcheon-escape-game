// components/HUD.tsx — 상단 상태 바: 일차·시계·현재 장소·포도알·스트라이크
import type { GameState } from '../types';
import { MAX_STRIKES } from '../constants';
import { formatClock } from '../engine';

export function HUD({ state, placeName }: { state: GameState; placeName: string }) {
  return (
    <div className="hud">
      <span>{state.day}일차</span>
      <span>{formatClock(state.timeMinutes)}</span>
      <span>· {placeName}</span>
      <span className="spacer" />
      <span>🍇 {state.grapes}</span>
      <span className="strikes" title="스트라이크">
        {Array.from({ length: MAX_STRIKES }, (_, i) => (
          <span key={i} className={i < state.strikes ? '' : 'empty'}>●</span>
        ))}
      </span>
    </div>
  );
}
