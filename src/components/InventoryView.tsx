// components/InventoryView.tsx — 가방 페이지(마인크래프트식 칸). 팝업이 아니라 이야기 화면 자리를 대신한다.
// 칸을 누르면 지금 있는 곳에서 그 아이템을 쓰고 이야기 화면으로 돌아간다(결과는 스토리 영역에 붙음).
import type { GameContent, GameState } from '../types';

interface Props {
  state: GameState;
  content: GameContent;
  onUse: (itemId: string) => void;
}

const COLS = 4;
const MIN_SLOTS = 8;

export function InventoryView({ state, content, onUse }: Props) {
  const count = Math.max(MIN_SLOTS, Math.ceil(state.items.length / COLS) * COLS);
  const slots = Array.from({ length: count }, (_, i) => state.items[i]);
  const companion = state.companion === 'dog' ? '강아지' : state.companion === 'cat' ? '고양이' : '없음';
  return (
    <main className="page bag">
      <div className="bag-head">
        <h2>가방</h2>
        <span>동행: {companion}</span>
      </div>
      <div className="bag-grid">
        {slots.map((id, i) => {
          if (!id) return <div key={`empty-${i}`} className="slot empty" />;
          const item = content.items[id];
          return (
            <button key={id} className="slot" onClick={() => onUse(id)}>
              {item?.icon && <img className="pixel" src={item.icon} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              <span>{item?.name ?? id}</span>
            </button>
          );
        })}
      </div>
      <p className="bag-hint">아이템을 누르면 지금 있는 곳에서 써 본다.</p>
    </main>
  );
}
