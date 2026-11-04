import React from 'react';
import { useAppStore } from './store/useAppStore';
import { AppHeader } from './components/header/AppHeader';
import { TokenHud } from './components/token-hud/TokenHud';
import { StoryTracker } from './components/story/StoryTracker';
import { CharacterRoster } from './components/roster/CharacterRoster';
import { CombatTracker } from './components/combat/CombatTracker';
import { ToolsPanel } from './components/tools/ToolsPanel';
import { PlayerCockpit } from './components/player/PlayerCockpit';
import { PlayerCombatHud } from './components/combat/PlayerCombatHud';

export const App = () => {
  const { role, activeTab, scale, cinemaMedia, setCinemaMedia } = useAppStore();

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
        {isGm ? (
          <>
            {activeTab === 'story' && <StoryTracker />}
            {activeTab === 'characters' && <CharacterRoster />}
            {activeTab === 'combat' && <CombatTracker />}
            {activeTab === 'tools' && <ToolsPanel />}
          </>
        ) : (
          <div className="flex flex-col h-full overflow-hidden relative">
            <PlayerCombatHud />
            <div className="flex-1 overflow-hidden">
              <PlayerCockpit />
            </div>
          </div>
        )}
      </main>

      {/* Broadcast Media Overlay */}
      {cinemaMedia?.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setCinemaMedia(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold cursor-pointer"
          >
            ✕
          </button>
          {cinemaMedia.type === 'image' && cinemaMedia.url && (
            <img
              src={cinemaMedia.url}
              alt="Трансляция"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          )}
          {cinemaMedia.type === 'audio' && cinemaMedia.url && (
            <audio src={cinemaMedia.url} controls autoPlay className="w-80" />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
