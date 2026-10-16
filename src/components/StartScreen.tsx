// components/StartScreen.tsx — 시작 화면: 이어하기 / 처음부터 / 초기화(전시 폰용 상시 노출)
interface Props {
  canContinue: boolean;
  onContinue: () => void;
  onNew: () => void;
  onReset: () => void;
}

export function StartScreen({ canContinue, onContinue, onNew, onReset }: Props) {
  return (
    <div className="screen">
      <div className="center">
        <h1>영천 칠석 이야기</h1>
        <p className="sub">2박 3일, 칠월칠석 전날의 영천.<br />단서를 모아 백사의 정체를 알아채라.</p>
        {canContinue && <button className="primary" onClick={onContinue}>이어하기</button>}
        <button className={canContinue ? '' : 'primary'} onClick={onNew}>{canContinue ? '처음부터' : '시작'}</button>
        <button className="danger" onClick={onReset}>초기화 (저장 삭제)</button>
      </div>
    </div>
  );
}
