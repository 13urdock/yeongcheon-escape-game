// components/SceneView.tsx — 그림 자리 + 본문(아래에 결과 문구) + 선택지 목록(씬 선택지 → 할 일 → 이동). 상태 계산 없음.
import { useEffect, useState } from 'react';
import type { Activity, Choice } from '../types';
import type { Note, SceneViewModel } from '../hooks/useGame';
import type { availableEdges } from '../engine';

interface Props {
  view: SceneViewModel;
  edges: ReturnType<typeof availableEdges>;
  activities: Activity[];
  notes: Note[];
  onChoose: (c: Choice) => void;
  onTravel: (placeId: string) => void;
  onActivity: (activityId: string) => void;
}

export function SceneView({ view, edges, activities, notes, onChoose, onTravel, onActivity }: Props) {
  // 새 씬에 들어오면 맨 위부터 읽도록
  useEffect(() => { window.scrollTo(0, 0); }, [view.scene.id]);

  return (
    <main className="page">
      <Picture src={view.background} />
      <section className="story">
        <p className="story-text">{view.renderText}</p>
        {notes.length > 0 && (
          <div className="notes">
            {notes.map((n, i) => <p key={i} className={`note ${n.kind}`}>{n.text}</p>)}
          </div>
        )}
      </section>
      <ul className="choices">
        {view.visibleChoices.map((c) => (
          <li key={c.id}>
            <button className="choice" onClick={() => onChoose(c)}>
              <span className="label">{c.text}</span>
            </button>
          </li>
        ))}
        {activities.map((a) => (
          <li key={`act-${a.id}`}>
            <button className="choice" onClick={() => onActivity(a.id)}>
              <span className="tag act">할 일</span>
              <span className="label">{a.name}</span>
              <span className="cost">{a.durationMinutes}분</span>
            </button>
          </li>
        ))}
        {edges.map(({ edge, cost, name }) => (
          <li key={`go-${edge.toPlaceId}`}>
            <button className="choice" onClick={() => onTravel(edge.toPlaceId)}>
              <span className="tag move">이동</span>
              <span className="label">{name}</span>
              <span className="cost">{cost === 0 ? '바로 옆' : `${cost}분`}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="page-mark">- {view.placeName} -</p>
    </main>
  );
}

// 그림 자리. 픽셀아트 배경 파일이 들어오기 전까지는 빈 칸으로 둔다.
function Picture({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return (
    <div className="picture">
      {!failed && <img className="pixel" src={src} alt="" onError={() => setFailed(true)} />}
    </div>
  );
}
