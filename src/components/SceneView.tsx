// components/SceneView.tsx — 배경(시간대) + 본문 + 선택지/이동/활동 버튼. 상태 계산 없음.
import { useState } from 'react';
import type { Activity, Choice, GameState } from '../types';
import type { SceneViewModel } from '../hooks/useGame';
import type { availableEdges } from '../engine';

interface Props {
  view: SceneViewModel;
  state: GameState;
  edges: ReturnType<typeof availableEdges>;
  activities: Activity[];
  message: string | null;
  extraText: string | null;
  onChoose: (c: Choice) => void;
  onTravel: (placeId: string) => void;
  onActivity: (activityId: string) => void;
}

export function SceneView({ view, state, edges, activities, message, extraText, onChoose, onTravel, onActivity }: Props) {
  return (
    <>
      <Background src={view.background} label={view.placeName} />
      <div className={`scene-text${state.snakeActiveInScene ? ' snake' : ''}`}>
        {view.renderText}
        {extraText && <p style={{ margin: '10px 0 0', color: 'var(--accent)' }}>{extraText}</p>}
      </div>
      {message && <div className="blocked-msg">{message}</div>}
      <div className="actions">
        {view.visibleChoices.map((c) => (
          <button key={c.id} className={c.isTrap ? 'trap' : ''} onClick={() => onChoose(c)}>{c.text}</button>
        ))}
        {!view.scene.isEnding && activities.length > 0 && (
          <>
            <h4>할 일</h4>
            {activities.map((a) => (
              <button key={a.id} onClick={() => onActivity(a.id)}>
                {a.name}<span className="cost">{a.durationMinutes}분</span>
              </button>
            ))}
          </>
        )}
        {!view.scene.isEnding && edges.length > 0 && (
          <>
            <h4>이동</h4>
            {edges.map(({ edge, cost, name }) => (
              <button key={edge.toPlaceId} onClick={() => onTravel(edge.toPlaceId)}>
                {name}<span className="cost">{cost === 0 ? '바로 옆' : `${cost}분`}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// 배경 이미지. 파일이 없으면 자리표시(경로 표시)로 대체해 에셋 누락을 바로 알 수 있게.
function Background({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="bg-wrap">
      {!failed
        ? <img className="pixel" src={src} alt="" onError={() => setFailed(true)} />
        : <div className="bg-missing">배경 없음<br />{src}</div>}
      <span className="bg-label">{label}</span>
    </div>
  );
}
