import React from 'react';
import { useAppStore } from '../../shared';
import { StoryTracker, CharacterRoster, CombatTracker, ToolsPanel } from '../../widgets';

export const GmScreen = () => {
  const { activeTab } = useAppStore();

  return (
    <div className="w-full h-full overflow-hidden relative">
      {activeTab === 'story' && <StoryTracker />}
      {activeTab === 'characters' && <CharacterRoster />}
      {activeTab === 'combat' && <CombatTracker />}
      {activeTab === 'tools' && <ToolsPanel />}
    </div>
  );
};
