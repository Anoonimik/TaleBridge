import React, { useEffect } from 'react';
import { useAppStore, useRosterStore } from '../shared';
import { AppHeader, TokenHud, CinemaOverlay, NoteViewer } from '../widgets';
import { GmScreen, PlayerScreen } from '../pages';

export const App = () => {
  const { role, scale } = useAppStore();
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
    (document.documentElement.style as any).zoom = '1';
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
