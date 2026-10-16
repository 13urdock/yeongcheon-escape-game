// components/App.tsx — 화면 라우팅(시작 → 플레이 → 엔딩) + 콘텐츠 로드 오류 표시
import { useMemo, useState } from 'react';
import { loadContent } from '../content';
import { useGame } from '../hooks/useGame';
import type { GameContent } from '../types';
import { StartScreen } from './StartScreen';
import { SceneView } from './SceneView';
import { HUD } from './HUD';
import { InventoryView } from './InventoryView';
import { EffectOverlay } from './EffectOverlay';
import { EndingView } from './EndingView';

export function App() {
  // 콘텐츠 검증 실패는 화면에 그대로 띄운다 (JSON 편집 실수를 바로 볼 수 있게)
  const loaded = useMemo<{ content?: GameContent; error?: string }>(() => {
    try { return { content: loadContent() }; } catch (e) { return { error: (e as Error).message }; }
  }, []);
  if (loaded.error || !loaded.content) {
    return <div className="screen"><pre className="scene-text" style={{ color: '#e5533d' }}>{loaded.error}</pre></div>;
  }
  return <Game content={loaded.content} />;
}

function Game({ content }: { content: GameContent }) {
  const g = useGame(content);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [useResult, setUseResult] = useState<string>('');

  if (g.phase === 'start') {
    return <StartScreen canContinue={g.canContinue} onContinue={g.continueGame} onNew={g.startNew} onReset={g.resetAll} />;
  }
  if (g.phase === 'ending' && g.ending) {
    return <EndingView ending={g.ending} onRestart={g.resetAll} />;
  }
  if (!g.state || !g.view) return null;

  return (
    <div className="screen">
      <HUD state={g.state} placeName={g.view.placeName} />
      <SceneView
        view={g.view}
        state={g.state}
        edges={g.edges}
        activities={g.activities}
        message={g.message}
        extraText={g.extraText}
        onChoose={g.choose}
        onTravel={g.travel}
        onActivity={g.activity}
      />
      <div className="toolbar">
        <button onClick={() => { setUseResult(''); setInventoryOpen(true); }}>가방 ({g.state.items.length})</button>
        <button className="danger" onClick={() => { if (confirm('처음부터 다시 시작할까요? 진행 상황이 지워집니다.')) g.resetAll(); }}>초기화</button>
      </div>
      {inventoryOpen && (
        <InventoryView
          state={g.state}
          content={content}
          resultText={useResult}
          onUse={(id) => setUseResult(g.use(id))}
          onClose={() => setInventoryOpen(false)}
        />
      )}
      <EffectOverlay messages={g.overlays} onDone={g.popOverlay} />
    </div>
  );
}
