// components/EffectOverlay.tsx — 효과 팝업: 큐의 문구들을 세로로 쌓아 띄우고, 각각 일정 시간 뒤 onDone(id)
import { useEffect } from 'react';
import type { OverlayMessage } from '../hooks/useGame';

const SHOW_MS = 1600;

export function EffectOverlay({ messages, onDone }: { messages: OverlayMessage[]; onDone: (id: number) => void }) {
  // 새로 들어온 문구마다 타이머 하나. 언마운트/변경 시 정리.
  useEffect(() => {
    const timers = messages.map((m) => setTimeout(() => onDone(m.id), SHOW_MS - (Date.now() - m.at)));
    return () => timers.forEach(clearTimeout);
  }, [messages, onDone]);
  if (!messages.length) return null;
  return (
    <>
      {messages.map((m, i) => (
        <div key={m.id} className="effect-overlay" style={{ top: `calc(28% + ${i * 48}px)` }}>{m.text}</div>
      ))}
    </>
  );
}
