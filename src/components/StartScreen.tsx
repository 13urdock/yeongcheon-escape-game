// components/StartScreen.tsx — 시작 화면: 이어하기 / 처음부터 (처음부터 = 새 게임으로 덮어씀)
interface Props {
  canContinue: boolean;
  onContinue: () => void;
  onNew: () => void;
}

export function StartScreen({ canContinue, onContinue, onNew }: Props) {
  return (
    <div className="screen">
      <main className="title-page">
        <h1>영천 칠석 이야기</h1>
        <p className="sub">2박 3일, 칠월칠석 전날의 영천.<br />단서를 모아 백사의 정체를 알아채라.</p>
        <ul className="choices center">
          {canContinue && (
            <li><button className="choice" onClick={onContinue}><span className="label">이어하기</span></button></li>
          )}
          <li><button className="choice" onClick={onNew}><span className="label">{canContinue ? '처음부터' : '시작'}</span></button></li>
        </ul>
      </main>
    </div>
  );
}
