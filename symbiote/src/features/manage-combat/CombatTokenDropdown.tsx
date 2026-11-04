import React, { useState } from 'react';
import { TaleSpireCreature, CombatSide, COMBAT_SIDES } from '../../shared';
import { useCombatStore, useRosterStore } from '../../shared';

interface CombatTokenDropdownProps {
  token: TaleSpireCreature;
  onClose: () => void;
}

export const CombatTokenDropdown = ({ token, onClose }: CombatTokenDropdownProps) => {
  const { addCombatant } = useCombatStore();
  const { roster } = useRosterStore();
  const [selectedSide, setSelectedSide] = useState<CombatSide>('enemy');

  const matchInRoster = roster.find(
    (r) =>
      (token.name && r.name.toLowerCase() === token.name.toLowerCase()) ||
      (token.id && r.talespire_id === token.id)
  );

  const handleAdd = () => {
    addCombatant({
      name: token.name,
      side: selectedSide,
      category:
        selectedSide === 'player'
          ? 'Игроки'
          : selectedSide === 'ally'
          ? 'Союзники'
          : selectedSide === 'neutral'
          ? 'Нейтралы'
          : 'Враги',
      hp: token.hp || matchInRoster?.hp || 10,
      maxHp: token.hpMax || matchInRoster?.hp_max || token.hp || 10,
      ac: matchInRoster?.ac || 10,
      speed: matchInRoster?.speed || '30 фт.',
      path: matchInRoster?.path || null,
      talespireId: token.id,
      isPlayer: selectedSide === 'player',
      stats: matchInRoster?.stats,
      dexMod: matchInRoster?.dexMod,
      attacks: matchInRoster?.attacks || [],
    });
    onClose();
  };

  return (
    <div className="absolute top-full left-0 mt-1 z-30 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl p-3 w-64 flex flex-col gap-2.5 animate-in fade-in duration-100 text-xs">
      <div className="flex items-center justify-between pb-1 border-b border-[#262a3d]">
        <span className="font-semibold text-slate-100 truncate">
          Добавить: <strong className="text-amber-400">{token.name}</strong>
        </span>
        <button
          type="button"
          className="text-slate-400 hover:text-white text-xs cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
          Выберите сторону:
        </label>
        <div className="grid grid-cols-2 gap-1">
          {COMBAT_SIDES.map((side) => {
            const isSelected = selectedSide === side.id;
            return (
              <button
                key={side.id}
                type="button"
                className={`px-2 py-1.5 rounded text-xs font-medium cursor-pointer transition-colors border flex items-center gap-1.5 ${
                  isSelected
                    ? `${side.bg} ${side.text} ${side.border} font-bold ring-1 ring-current`
                    : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d] hover:text-white'
                }`}
                onClick={() => setSelectedSide(side.id)}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: side.color }} />
                <span>{side.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#262a3d]">
        <button
          type="button"
          className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs cursor-pointer"
          onClick={onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer"
          onClick={handleAdd}
        >
          В бой
        </button>
      </div>
    </div>
  );
};
