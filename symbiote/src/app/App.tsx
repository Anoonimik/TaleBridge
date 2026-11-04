import React from 'react';
import { useAppStore } from '../shared';
import { AppHeader, TokenHud, CinemaOverlay } from '../widgets';
import { GmScreen, PlayerScreen } from '../pages';

export const App = () => {
  const { role, scale } = useAppStore();

  const isGm = role === 'gm';
  const scaleStyle: React.CSSProperties =
    scale === '85%'
      ? {
          transform: 'scale(0.85)',
          transformOrigin: 'top left',
          width: '117.64%',
          height: '117.64%',
        }
      : { width: '100%', height: '100%' };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0c0d14]" style={scaleStyle}>
      <AppHeader />
      <TokenHud />

      <main className="flex-1 overflow-hidden relative">
        {isGm ? <GmScreen /> : <PlayerScreen />}
      </main>

      <CinemaOverlay />
    </div>
  );
};

export default App;
