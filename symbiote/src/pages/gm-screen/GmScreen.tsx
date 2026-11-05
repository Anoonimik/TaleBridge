import { CluesArchive } from '../../features/archive-clues/CluesArchive';
import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { useAppStore } from '../../shared/lib/useAppStore';
import { StoryTracker } from '../../widgets/story-tracker/StoryTracker';
import { CharacterRoster } from '../../widgets/character-roster/CharacterRoster';
import { CombatTracker } from '../../widgets/combat-tracker/CombatTracker';
import { ToolsPanel } from '../../widgets/tools-panel/ToolsPanel';

export const GmScreen = () => {
  const { activeTab } = useAppStore(useShallow((s) => ({ activeTab: s.activeTab })));

  return (
    <div className="w-full h-full overflow-hidden relative">
      {activeTab === 'story' && <StoryTracker />}
      {activeTab === 'characters' && <CharacterRoster />}
      {activeTab === 'combat' && <CombatTracker />}
      {activeTab === 'clues' && <CluesArchive />}
      {activeTab === 'tools' && <ToolsPanel />}
    </div>
  );
};
