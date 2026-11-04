import React from 'react';
import { CombatSide } from '../../types';
import { useRosterStore } from '../../store/useRosterStore';
import { useCombatStore } from '../../store/useCombatStore';

interface Props {
  onClose: () => void;
}

export const CombatTokenDropdown: React.FC<Props> = ({ onClose }) => {
  const { activeToken, roster } = useRosterStore();
  const { addCombatant } = useCombatStore();

  const matched = activeToken
    ? roster.find((r) => r.name.toLowerCase() === activeToken.name.toLowerCase())
    : null;

  const handleAdd = (side: CombatSide) => {
    if (!activeToken) return;

    addCombatant({
      name: activeToken.name,
      category: side,
      hp: activeToken.hp || matched?.hp || 14,
      maxHp: activeToken.maxHp || matched?.hp_max || matched?.hp || 14,
      ac: matched?.ac || 12,
      speed: matched?.speed || '30 фт.',
      creatureId: activeToken.id,
      path: matched?.path || null,
      isPlayer: side === 'Игроки',
      stats: matched?.stats,
      dexMod: matched?.dexMod,
      attacks: matched?.attacks || [],
    });
    onClose();
  };

  return (
    <div className="absolute top-[82px] left-3 right-3 z-30 bg-[#161825] border border-[#2e344a] rounded-lg shadow-2xl p-3 flex flex-col gap-2.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <span className="text-xs font-bold text-slate-300">Вступить в бой (Токен на доске):</span>
        <button
          type="button"
          className="text-slate-400 hover:text-white text-xs cursor-pointer"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <div className="bg-[#0f111c] border border-white/5 rounded-md p-2">
        {activeToken ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
              <strong className="text-[13px] text-white font-bold">{activeToken.name}</strong>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400">
              {activeToken.hp || 14}/{activeToken.maxHp || activeToken.hp || 14} HP
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-red-400">
            Миниатюра не выбрана в TaleSpire.
            <br />
            <span className="text-[10px] text-slate-400">Кликните по фигурке на доске, затем выберите сторону.</span>
          </div>
        )}
      </div>

      {activeToken && (
        <>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Выберите сторону в бою:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-red-950/40 border border-red-800/60 text-red-200 hover:bg-red-900/60 hover:border-red-600 text-xs font-bold transition cursor-pointer"
              onClick={() => handleAdd('Враги')}
            >
              <span>🔴</span> <span>Враг</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 hover:bg-emerald-900/60 hover:border-emerald-600 text-xs font-bold transition cursor-pointer"
              onClick={() => handleAdd('Союзники')}
            >
              <span>🟢</span> <span>Союзник</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 hover:bg-amber-900/60 hover:border-amber-600 text-xs font-bold transition cursor-pointer"
              onClick={() => handleAdd('Нейтрал')}
            >
              <span>🟡</span> <span>Нейтрал</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 hover:bg-indigo-900/60 hover:border-indigo-600 text-xs font-bold transition cursor-pointer"
              onClick={() => handleAdd('Игроки')}
            >
              <span>🔵</span> <span>Игрок</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
