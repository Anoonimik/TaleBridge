import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStoryStore, useRosterStore, wsBridge } from '../../shared';
import {
  SceneNavigationBar,
  SceneCatalogModal,
  SceneModeFilterBar,
  StoryMode,
  SceneContextHeader,
  ReadAloudSection,
  RoleplaySection,
  MechanicsSection,
  BranchesSection,
} from './ui';

export const StoryTracker = () => {
  const { scenes, activeScene, sceneHistory, goToScene, goBack } = useStoryStore();
  const { setSelectedCharacter, roster } = useRosterStore();
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [mode, setMode] = useState<StoryMode>('all');
  const [isRotating, setIsRotating] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') setMode('all');
      else if (e.key === '2') setMode('readAloud');
      else if (e.key === '3') setMode('roleplay');
      else if (e.key === '4') setMode('mechanics');
      else if (e.key === '5') setMode('branches');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return scenes;
    const q = catalogSearch.toLowerCase();
    return scenes.filter((s) => {
      return (
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        (s.goal && s.goal.toLowerCase().includes(q))
      );
    });
  }, [scenes, catalogSearch]);

  const handleRefreshScenes = useCallback(() => {
    setIsRotating(true);
    wsBridge.send('GET_SCENES', {});
    setTimeout(() => setIsRotating(false), 700);
  }, []);

  const handleFocusCharacter = useCallback(
    (name: string) => {
      const found = roster.find((r) => r.name.toLowerCase() === name.toLowerCase());
      if (found) {
        setSelectedCharacter(found);
        if (found.path) {
          wsBridge.send('GET_NOTE', { path: found.path, name: found.name });
        }
      }
    },
    [roster, setSelectedCharacter]
  );

  const readAloudItems = useMemo((): string[] => {
    if (!activeScene?.readAloud) return [];
    if (Array.isArray(activeScene.readAloud)) return activeScene.readAloud.filter(Boolean);
    if (typeof activeScene.readAloud === 'string') {
      const clean = activeScene.readAloud.trim();
      return clean ? [clean] : [];
    }
    return [];
  }, [activeScene?.readAloud]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#0c0d14]">
      {/* Top Scene Navigation Bar */}
      <SceneNavigationBar
        activeScene={activeScene}
        canGoBack={sceneHistory.length > 0}
        isRotating={isRotating}
        onGoBack={goBack}
        onToggleCatalog={() => setShowCatalog(!showCatalog)}
        onRefreshScenes={handleRefreshScenes}
      />

      {/* Directory Modal / Drawer */}
      {showCatalog && (
        <SceneCatalogModal
          scenesCount={scenes.length}
          filteredCatalog={filteredCatalog}
          activeSceneId={activeScene?.id}
          catalogSearch={catalogSearch}
          onSearchChange={setCatalogSearch}
          onSelectScene={(id) => {
            goToScene(id);
            setShowCatalog(false);
          }}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Mode Filters Bar */}
      <SceneModeFilterBar mode={mode} onSetMode={setMode} />

      {/* Scene Body / Blocks */}
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3.5 scrollbar-thin text-sm text-slate-200">
        {!activeScene ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Выберите сцену из каталога для просмотра описания и проверок
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {/* Context Header: Location, Goal, Cast, Nudge Button */}
            <SceneContextHeader
              scene={activeScene}
              showNudge={showNudge}
              onToggleNudge={() => setShowNudge(!showNudge)}
              onFocusCharacter={handleFocusCharacter}
            />

            {/* Read Aloud Section */}
            {(mode === 'all' || mode === 'readAloud') && (
              <ReadAloudSection
                sceneTitle={activeScene.title}
                readAloudItems={readAloudItems}
              />
            )}

            {/* Roleplay Tips / Personas / Dialogues Section */}
            {(mode === 'all' || mode === 'roleplay') && (
              <RoleplaySection
                personas={activeScene.personas}
                dialogues={activeScene.dialogues}
              />
            )}

            {/* Mechanics, Checks & Clues Section */}
            {(mode === 'all' || mode === 'mechanics') && (
              <MechanicsSection
                clues={activeScene.clues}
                mechanics={activeScene.mechanics}
              />
            )}

            {/* Plot Branches Section */}
            {(mode === 'all' || mode === 'branches') && (
              <BranchesSection
                branches={activeScene.branches}
                scenes={scenes}
                onGoToScene={goToScene}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
