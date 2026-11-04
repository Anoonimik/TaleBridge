import React from 'react';
import { CombatSide } from '../../types';
import { useCombatStore } from '../../store/useCombatStore';

interface Props {
  combatantId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export const CombatSideMenu = ({ combatantId, position, onClose }: Props) => {
  const { setCategory } = useCombatStore();

  const handleSelect = (side: CombatSide) => {
    setCategory(combatantId, side);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed z-50 bg-[#191c2b] border border-[#30374e] rounded-lg shadow-2xl p-1.5 flex flex-col gap-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-100"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-white/5">
          Сменить сторону:
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-semibold text-red-300 hover:bg-red-950/50 hover:text-red-200 transition text-left cursor-pointer"
          onClick={() => handleSelect('Враги')}
        >
          <span>🔴</span> <span>Враг</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/50 hover:text-emerald-200 transition text-left cursor-pointer"
          onClick={() => handleSelect('Союзники')}
        >
          <span>🟢</span> <span>Союзник</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-semibold text-amber-300 hover:bg-amber-950/50 hover:text-amber-200 transition text-left cursor-pointer"
          onClick={() => handleSelect('Нейтрал')}
        >
          <span>🟡</span> <span>Нейтрал</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-semibold text-indigo-300 hover:bg-indigo-950/50 hover:text-indigo-200 transition text-left cursor-pointer"
          onClick={() => handleSelect('Игроки')}
        >
          <span>🔵</span> <span>Игрок</span>
        </button>
      </div>
    </>
  );
};
