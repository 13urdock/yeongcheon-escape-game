// components/InventoryView.tsx — 마인크래프트식 아이템 슬롯. 탭하면 useItem, 결과 문구 표시.
import type { GameContent, GameState } from '../types';

interface Props {
  state: GameState;
  content: GameContent;
  resultText: string;
  onUse: (itemId: string) => void;
  onClose: () => void;
}

const SLOT_COUNT = 8;

export function InventoryView({ state, content, resultText, onUse, onClose }: Props) {
  const slots = Array.from({ length: Math.max(SLOT_COUNT, state.items.length) }, (_, i) => state.items[i]);
  return (
    <div className="inventory-backdrop" onClick={onClose}>
      <div className="inventory" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>가방</strong>
          <span style={{ color: 'var(--muted)' }}>동행: {state.companion === 'dog' ? '강아지' : state.companion === 'cat' ? '고양이' : '없음'}</span>
        </div>
        <div className="inventory-grid">
          {slots.map((id, i) => {
            if (!id) return <div key={i} className="slot empty">—</div>;
            const item = content.items[id];
            const isCompanion = item?.category === 'companion';
            return (
              <button key={id} className={`slot${isCompanion ? ' companion' : ''}`} onClick={() => onUse(id)} title={item?.description}>
                {item?.icon ? <img className="pixel" src={item.icon} alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <span className="icon-fallback">▣</span>}
                <span>{item?.name ?? id}</span>
              </button>
            );
          })}
        </div>
        <div className="result">{resultText}</div>
        <button style={{ width: '100%', textAlign: 'center', marginTop: 8 }} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
