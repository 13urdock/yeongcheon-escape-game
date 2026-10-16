// components/EndingView.tsx — 엔딩 타입별 결말 텍스트 + 처음으로
import type { EndingInfo } from '../hooks/useGame';
import { endingLabel } from '../engine';

const REASON_TEXT: Record<EndingInfo['reason'], string> = {
  strikes: '백사의 시설을 세 번 이용했다.',
  timeout: '22:00까지 숙소에 도착하지 못했다.',
  final: '',
};

export function EndingView({ ending, onRestart }: { ending: EndingInfo; onRestart: () => void }) {
  return (
    <div className="screen">
      <main className="title-page">
        <h1>{endingLabel(ending.type)}</h1>
        {REASON_TEXT[ending.reason] && <p className="sub">{REASON_TEXT[ending.reason]}</p>}
        <p className="ending-body">{ending.text}</p>
        <ul className="choices center">
          <li><button className="choice" onClick={onRestart}><span className="label">처음으로</span></button></li>
        </ul>
      </main>
    </div>
  );
}
