import React, { useState } from 'react';
import { PlayerCombatHud, PlayerCockpit } from '../../widgets';
import { OfflineBanner, ConnectionModal } from '../../features';

export const PlayerScreen = () => {
  const [showConnModal, setShowConnModal] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <OfflineBanner onOpenSettings={() => setShowConnModal(true)} />
      <PlayerCombatHud />
      <div className="flex-1 overflow-hidden">
        <PlayerCockpit />
      </div>

      <ConnectionModal
        isOpen={showConnModal}
        onClose={() => setShowConnModal(false)}
      />
    </div>
  );
};
