import React from 'react';
import { useAppStore } from '../shared';
import { AppHeader, TokenHud, CinemaOverlay } from '../widgets';
import { GmScreen, PlayerScreen } from '../pages';

export const App = () => {
  const { role, scale } = useAppStore();

  const isGm = role === 'gm';

  const getScaleStyle = (): React.CSSProperties => {
    switch (scale) {
      case '115%':
        return {
          transform: 'scale(1.15)',
          transformOrigin: 'top left',
          width: '86.95%',
          height: '86.95%',
        };
      case '125%':
        return {
          transform: 'scale(1.25)',
          transformOrigin: 'top left',
          width: '80%',
          height: '80%',
        };
      case '150%':
        return {
          transform: 'scale(1.5)',
          transformOrigin: 'top left',
          width: '66.66%',
          height: '66.66%',
        };
      case '85%':
        return {
          transform: 'scale(0.85)',
          transformOrigin: 'top left',
          width: '117.64%',
          height: '117.64%',
        };
      case '100%':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[#0c0d14]" style={getScaleStyle()}>
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
