import React, { useState } from 'react';
import { PlayerCombatHud } from '../../widgets/player-combat-hud/PlayerCombatHud';
import { PlayerCockpit } from '../../widgets/player-cockpit/PlayerCockpit';
import { OfflineBanner } from '../../features/manage-connection/ui/OfflineBanner';
import { ConnectionModal } from '../../features/manage-connection/ui/ConnectionModal';

export const PlayerScreen = () => {
  const [showConnModal, setShowConnModal] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <OfflineBanner onOpenSettings={() => setShowConnModal(true)} />
      <PlayerCombatHud />
      <div className="flex-1 overflow-hidden">
        <PlayerCockpit />
      </div>

      <ConnectionModal isOpen={showConnModal} onClose={() => setShowConnModal(false)} />
    </div>
  );
};
