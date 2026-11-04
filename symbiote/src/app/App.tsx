import React, { useEffect } from 'react';
import { useAppStore, useRosterStore } from '../shared';
import { AppHeader, TokenHud, CinemaOverlay, NoteViewer } from '../widgets';
import { GmScreen, PlayerScreen } from '../pages';

export const App = () => {
  const { role, scale } = useAppStore();
  const { selectedCharacter, setSelectedCharacter } = useRosterStore();

  const isGm = role === 'gm';

  useEffect(() => {
    let zoomVal = '1';
    switch (scale) {
      case '115%':
        zoomVal = '1.15';
        break;
      case '125%':
        zoomVal = '1.25';
        break;
      case '150%':
        zoomVal = '1.5';
        break;
      case '85%':
        zoomVal = '0.85';
        break;
      case '100%':
      default:
        zoomVal = '1';
        break;
    }
    (document.documentElement.style as any).zoom = zoomVal;
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

      <main className="flex-1 overflow-hidden relative">
        {isGm ? <GmScreen /> : <PlayerScreen />}
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
