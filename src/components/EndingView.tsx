// components/EndingView.tsx — 엔딩 타입별 결말 텍스트 + 다시하기
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
      <div className="center">
        <h1>{endingLabel(ending.type)}</h1>
        {REASON_TEXT[ending.reason] && <p className="sub">{REASON_TEXT[ending.reason]}</p>}
        <div className="ending-body">{ending.text}</div>
        <button className="primary" onClick={onRestart}>처음으로</button>
      </div>
    </div>
  );
}
