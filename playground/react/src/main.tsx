import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { SweetPlayer, type SweetPlayerCore } from '@sweet-player/react';

function App() {
  const playerRef = useRef<SweetPlayerCore | null>(null);

  return (
    <div className="wrap">
      <h2>Sweet Player — React 19</h2>
      <div className="player-box">
        <SweetPlayer
          ref={playerRef}
          src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          title="Big Buck Bunny — React"
          volume={80}
          onPrev={() => console.log('[react] prev')}
          onNext={() => console.log('[react] next')}
          onReady={(p) => console.log('[react] ready', p)}
        />
      </div>
      <button onClick={() => playerRef.current?.seekBy(30)}>ref 调用：快进 30s</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
