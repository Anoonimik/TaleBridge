import React, { lazy, Suspense, useEffect } from 'react';
import { useAppStore, useRosterStore } from '../shared';
import { AppHeader, TokenHud, CinemaOverlay, NoteViewer } from '../widgets';
const GmScreen = lazy(() => import('../pages/gm-screen/GmScreen').then(m => ({default:m.GmScreen})));
const PlayerScreen = lazy(() => import('../pages/player-screen/PlayerScreen').then(m => ({default:m.PlayerScreen})));

export const App = () => {
  const { role, scale } = useAppStore();
  const lastError = useAppStore(s=>s.lastError);
  const dismissError = useAppStore(s=>s.setLastError);
  const { selectedCharacter, setSelectedCharacter } = useRosterStore();

  const isGm = role === 'gm';

  useEffect(() => {
    let px = '16px';
    switch (scale) {
      case '115%':
        px = '18.4px';
        break;
      case '125%':
        px = '20px';
        break;
      case '140%':
        px = '22.4px';
        break;
      case '150%':
        px = '24px';
        break;
      case '175%':
        px = '28px';
        break;
      case '200%':
        px = '32px';
        break;
      case '85%':
      case '90%':
        px = '14px';
        break;
      case '100%':
      default:
        px = '16px';
        break;
    }
    document.documentElement.style.fontSize = px;
    document.documentElement.style.setProperty('zoom', '1');
    window.scrollTo(0, 0);
  }, [scale]);

  useEffect(() => {
    const lockScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', lockScroll, { passive: true });
    return () => window.removeEventListener('scroll', lockScroll);
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#0c0d14]">
      <AppHeader />
      <TokenHud />
      {lastError && <div role="alert" className="px-3 py-2 bg-rose-950 text-rose-100 flex items-center justify-between gap-3"><span>{lastError}</span><button type="button" aria-label="Закрыть уведомление" onClick={()=>dismissError('')}>✕</button></div>}

      <main className="flex-1 overflow-hidden relative">
        <Suspense fallback={<p role="status">Загрузка…</p>}>{isGm ? <GmScreen /> : <PlayerScreen />}</Suspense>
      </main>

      <CinemaOverlay />
      <NoteViewer
        character={selectedCharacter}
        onClose={() => setSelectedCharacter(null)}
      />
    </div>
  );
};

export default App;
