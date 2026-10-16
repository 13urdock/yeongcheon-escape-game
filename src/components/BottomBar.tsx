// components/BottomBar.tsx — 화면 하단 고정 바. 가방 페이지 열기/이야기로 돌아가기.
interface Props {
  bagOpen: boolean;
  itemCount: number;
  onToggleBag: () => void;
}

export function BottomBar({ bagOpen, itemCount, onToggleBag }: Props) {
  return (
    <nav className="bottom-bar">
      <div className="inner">
        <button onClick={onToggleBag}>
          {bagOpen ? '이야기로 돌아가기' : <>가방 <span className="count">{itemCount}</span></>}
        </button>
      </div>
    </nav>
  );
}
