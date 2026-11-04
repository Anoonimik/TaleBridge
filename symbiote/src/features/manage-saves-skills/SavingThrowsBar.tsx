import React from 'react';
import { Character, parseModifier, taleSpireDriver } from '../../shared';

interface SavingThrowsBarProps {
  playerData: Character | null;
  onToggleProficiency: (ability: string) => void;
}

export const SavingThrowsBar = ({ playerData, onToggleProficiency }: SavingThrowsBarProps) => {
  if (!playerData) return null;

  const level = playerData.level || 1;
  const profBonus = Math.floor((level - 1) / 4) + 2;

  const savesList = [
    { key: 'str', label: 'СИЛ', name: 'Сила', scoreStr: playerData.stats?.str || '10' },
    { key: 'dex', label: 'ЛОВ', name: 'Ловкость', scoreStr: playerData.stats?.dex || '10' },
    { key: 'con', label: 'ТЕЛ', name: 'Телосложение', scoreStr: playerData.stats?.con || '10' },
    { key: 'int', label: 'ИНТ', name: 'Интеллект', scoreStr: playerData.stats?.int || '10' },
    { key: 'wis', label: 'МУД', name: 'Мудрость', scoreStr: playerData.stats?.wis || '10' },
    { key: 'cha', label: 'ХАР', name: 'Харизма', scoreStr: playerData.stats?.cha || '10' },
  ];

  const proficientList = playerData.savingThrowsProficient || [];

  const handleRollSave = (s: typeof savesList[0], totalMod: number) => {
    const modFormatted = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
    taleSpireDriver.rollDice(`1d20${modFormatted}`, `Спасбросок: ${s.name} (${playerData.name})`);
  };

  return (
    <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
          Спасброски (Бонус мастерства: +{profBonus})
        </span>
        <span className="text-[10px] text-slate-400">
          Клик по значению — бросок d20
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {savesList.map((s) => {
          const isProf = proficientList.includes(s.key);
          const baseMod = parseModifier(s.scoreStr);
          const totalMod = baseMod + (isProf ? profBonus : 0);
          const formatted = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

          return (
            <div
              key={s.key}
              className={`p-1.5 rounded border flex flex-col items-center justify-between gap-1 transition-all ${
                isProf
                  ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-200'
                  : 'bg-[#10111a] border-[#262a3d] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">{s.label}</span>
                <input
                  type="checkbox"
                  checked={isProf}
                  onChange={() => onToggleProficiency(s.key)}
                  className="w-3 h-3 rounded accent-indigo-500 cursor-pointer"
                  title={isProf ? 'Владение спасброском (активно)' : 'Отметить владение спасброском'}
                />
              </div>

              <button
                type="button"
                onClick={() => handleRollSave(s, totalMod)}
                className="w-full py-1 rounded bg-[#1a1d2d] hover:bg-indigo-600/30 text-slate-100 hover:text-indigo-200 font-mono font-bold text-xs cursor-pointer transition-colors text-center border border-transparent hover:border-indigo-500/30"
                title={`Бросить спасбросок ${s.name} (1d20${formatted})`}
              >
                {formatted}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
