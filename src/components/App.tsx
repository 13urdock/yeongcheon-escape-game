// components/App.tsx — 화면 라우팅(시작 → 플레이 → 엔딩) + 콘텐츠 로드 오류 표시. 팝업 없음: 가방도 페이지로 전환.
import { useMemo, useState } from 'react';
import { loadContent } from '../content';
import { useGame } from '../hooks/useGame';
import type { GameContent } from '../types';
import { StartScreen } from './StartScreen';
import { SceneView } from './SceneView';
import { HUD } from './HUD';
import { InventoryView } from './InventoryView';
import { BottomBar } from './BottomBar';
import { EndingView } from './EndingView';

export function App() {
  // 콘텐츠 검증 실패는 화면에 그대로 띄운다 (JSON 편집 실수를 바로 볼 수 있게)
  const loaded = useMemo<{ content?: GameContent; error?: string }>(() => {
    try { return { content: loadContent() }; } catch (e) { return { error: (e as Error).message }; }
  }, []);
  if (loaded.error || !loaded.content) {
    return <div className="screen"><pre className="load-error">{loaded.error}</pre></div>;
  }
  return <Game content={loaded.content} />;
}

function Game({ content }: { content: GameContent }) {
  const g = useGame(content);
  const [bagOpen, setBagOpen] = useState(false);

  if (g.phase === 'start') {
    return <StartScreen canContinue={g.canContinue} onContinue={g.continueGame} onNew={g.startNew} />;
  }
  if (g.phase === 'ending' && g.ending) {
    return <EndingView ending={g.ending} onRestart={() => { setBagOpen(false); g.restart(); }} />;
  }
  if (!g.state || !g.view) return null;

  return (
    <div className="screen with-bar">
      <HUD state={g.state} />
      {bagOpen ? (
        <InventoryView
          state={g.state}
          content={content}
          onUse={(id) => { setBagOpen(false); g.use(id); }}
        />
      ) : (
        <SceneView
          view={g.view}
          edges={g.edges}
          activities={g.activities}
          notes={g.notes}
          onChoose={g.choose}
          onTravel={g.travel}
          onActivity={g.activity}
        />
      )}
      <BottomBar bagOpen={bagOpen} itemCount={g.state.items.length} onToggleBag={() => setBagOpen((o) => !o)} />
    </div>
  );
}
