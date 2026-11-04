import React from 'react';
import { PlayerCombatHud, PlayerCockpit } from '../../widgets';

export const PlayerScreen = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <PlayerCombatHud />
      <div className="flex-1 overflow-hidden">
        <PlayerCockpit />
      </div>
    </div>
  );
};
