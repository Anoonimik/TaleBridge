import React from 'react';
import { Combatant, CombatSide, COMBAT_SIDES } from '../../shared';
import { useCombatStore } from '../../shared';

interface CombatSideMenuProps {
  combatant: Combatant;
  position: { top: number; left: number };
  onClose: () => void;
}

export const CombatSideMenu = ({
  combatant,
  position,
  onClose,
}: CombatSideMenuProps) => {
  const { changeSide } = useCombatStore();

  const handleSelectSide = (side: CombatSide) => {
    changeSide(combatant.id, side);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-[#141622] border border-[#2d324a] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 w-36 animate-in fade-in duration-100"
        style={{ top: position.top, left: position.left }}
      >
        <span className="text-xs uppercase font-bold text-slate-400 px-2 py-0.5 block">
          Сменить сторону:
        </span>
        {COMBAT_SIDES.map((side) => {
          const isSelected = combatant.side === side.id;
          return (
            <button
              key={side.id}
              type="button"
              className={`px-2 py-1 text-left text-xs rounded transition-colors cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-200 hover:bg-[#1a1d2d]'
              }`}
              onClick={() => handleSelectSide(side.id)}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: side.color }}
                />
                <span>{side.label}</span>
              </div>
              {isSelected && <span className="text-amber-400">✓</span>}
            </button>
          );
        })}
      </div>
    </>
  );
};
