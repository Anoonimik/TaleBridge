import React, { useState, useEffect } from 'react';
import { TaleSpireCreature, CombatSide, COMBAT_SIDES } from '../../shared';
import { useCombatStore, useRosterStore } from '../../shared';

interface CombatTokenDropdownProps {
  token: TaleSpireCreature;
  onClose: () => void;
}

export const CombatTokenDropdown = ({ token, onClose }: CombatTokenDropdownProps) => {
  const { addCombatant } = useCombatStore();
  const { roster } = useRosterStore();

  const matchInRoster = roster.find(
    (r) =>
      (token.name && r.name.toLowerCase() === token.name.toLowerCase()) ||
      (token.id && r.talespire_id === token.id)
  );

  const getInitialSide = (): CombatSide => {
    if (!matchInRoster) return 'enemy';
    const cat = (matchInRoster.category || '').toLowerCase();
    if (cat.includes('игрок')) return 'player';
    if (cat.includes('союз')) return 'ally';
    if (cat.includes('нейтр')) return 'neutral';
    return 'enemy';
  };

  const [selectedSide, setSelectedSide] = useState<CombatSide>(getInitialSide);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    <>
      {/* Invisible backdrop for clicking outside to dismiss */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute top-full right-0 mt-1.5 z-50 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl p-3 w-64 flex flex-col gap-2.5 animate-in fade-in duration-100 text-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#262a3d]">
          <span className="font-semibold text-slate-100 truncate pr-2">
            В бой: <strong className="text-amber-400">{matchInRoster?.name || token.name}</strong>
          </span>
          <button
            type="button"
            className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer transition-colors"
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
            Выберите сторону:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {COMBAT_SIDES.map((side) => {
              const isSelected = selectedSide === side.id;
              return (
                <button
                  key={side.id}
                  type="button"
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors border flex items-center justify-start gap-2 ${
                    isSelected
                      ? `${side.bg} ${side.text} ${side.border} ring-1 ring-current font-bold`
                      : 'bg-[#1a1d2d] text-slate-400 border-[#262a3d] hover:text-white hover:bg-[#22263b]'
                  }`}
                  onClick={() => setSelectedSide(side.id)}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: side.color }} />
                  <span className="truncate">{side.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1.5 border-t border-[#262a3d]">
          <button
            type="button"
            className="px-2.5 py-1 rounded bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 text-xs font-medium cursor-pointer border border-[#262a3d] transition-colors"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-colors"
            onClick={handleAdd}
          >
            + В бой
          </button>
        </div>
      </div>
    </>
  );
};
