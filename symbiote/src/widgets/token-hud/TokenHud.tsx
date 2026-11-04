import React, { useState } from 'react';
import { useRosterStore, wsBridge } from '../../shared';
import { CombatTokenDropdown } from '../../features';

export const TokenHud = () => {
  const { selectedToken, setSelectedCharacter, roster } = useRosterStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!selectedToken) return null;

  const matchInRoster = roster.find(
    (r) =>
      (selectedToken.name && r.name.toLowerCase() === selectedToken.name.toLowerCase()) ||
      (selectedToken.id && r.talespire_id === selectedToken.id)
  );

  const handleOpenNote = () => {
    if (matchInRoster) {
      setSelectedCharacter(matchInRoster);
      if (matchInRoster.path) {
        wsBridge.send('GET_NOTE', { path: matchInRoster.path, name: matchInRoster.name });
      }
    }
  };

  const handleOpenObsidian = () => {
    if (matchInRoster?.path) {
      wsBridge.send('OPEN_NOTE', { path: matchInRoster.path });
    }
  };

  return (
    <div className="bg-[#10111a] border-b border-[#262a3d] px-3 py-1.5 flex items-center justify-between text-xs select-none shrink-0 relative z-20">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
        <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Выбрано:</span>
        <strong className="text-slate-100 truncate max-w-[150px]" title={selectedToken.name}>
          {selectedToken.name}
        </strong>

        {(selectedToken.hp !== undefined || matchInRoster?.hp !== undefined) && (
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
            ХП: {selectedToken.hp ?? matchInRoster?.hp} / {selectedToken.hpMax ?? matchInRoster?.hp_max ?? selectedToken.hp ?? 10}
          </span>
        )}

        {matchInRoster?.ac && (
          <span className="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20 shrink-0">
            КД: {matchInRoster.ac}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 relative">
        {matchInRoster && (
          <>
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] text-[11px] cursor-pointer"
              onClick={handleOpenNote}
              title="Открыть заметку в TaleBridge"
            >
              Заметка
            </button>
            <button
              type="button"
              className="px-2 py-0.5 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-purple-300 border border-purple-500/30 text-[11px] cursor-pointer"
              onClick={handleOpenObsidian}
              title="Открыть в десктопном приложении Obsidian"
            >
              Obsidian
            </button>
          </>
        )}

        <div className="relative">
          <button
            type="button"
            className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-medium cursor-pointer flex items-center gap-1"
            onClick={() => setShowAddMenu(!showAddMenu)}
            title="Добавить токен в трекер боя с выбором стороны"
          >
            <span>В бой</span>
            <span className="text-[9px]">▾</span>
          </button>

          {showAddMenu && (
            <CombatTokenDropdown token={selectedToken} onClose={() => setShowAddMenu(false)} />
          )}
        </div>
      </div>
    </div>
  );
};
