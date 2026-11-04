import React from 'react';
import { taleSpireDriver, parseModifier } from '../../../shared';

interface AbilityCellProps {
  label: string;
  name: string;
  scoreStr: string;
  characterName: string;
  abilityKey?: string;
  isProficient?: boolean;
  onToggleProficiency?: (abilityKey: string) => void;
  profBonus?: number;
}

export const AbilityCell = ({
  label,
  name,
  scoreStr,
  characterName,
  abilityKey,
  isProficient = false,
  onToggleProficiency,
  profBonus = 2,
}: AbilityCellProps) => {
  const modNum = parseModifier(scoreStr);
  const checkModStr = modNum >= 0 ? `+${modNum}` : `${modNum}`;
  const saveModNum = modNum + (isProficient ? profBonus : 0);
  const saveModStr = saveModNum >= 0 ? `+${saveModNum}` : `${saveModNum}`;

  const handleRollCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    taleSpireDriver.rollDice(`1d20${checkModStr}`, `Проверка: ${name} (${characterName})`);
  };

  const handleRollSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    taleSpireDriver.rollDice(`1d20${saveModStr}`, `Спасбросок: ${name} (${characterName})`);
  };

  return (
    <div
      className={`rounded-lg border p-1.5 flex flex-col items-center justify-between transition-all shadow-xs ${
        isProficient
          ? 'bg-indigo-950/20 border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
          : 'bg-[#10111a] border-[#1f2233] hover:border-slate-700'
      }`}
    >
      {/* Top: Label & Save Proficiency Toggle */}
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-300">
          {label}
        </span>

        {abilityKey && onToggleProficiency && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleProficiency(abilityKey);
            }}
            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isProficient
                ? 'bg-indigo-500 border-indigo-400 text-white text-[9px] font-bold shadow-[0_0_6px_rgba(99,102,241,0.5)]'
                : 'border-slate-600 hover:border-slate-400 bg-transparent'
            }`}
            title={
              isProficient
                ? `Владение спасброском (${name}) активно (+${profBonus}). Клик — снять`
                : `Отметить владение спасброском (${name})`
            }
          >
            {isProficient && '✓'}
          </button>
        )}
      </div>

      {/* Middle: Ability Score */}
      <span className="text-base sm:text-lg font-bold text-slate-100 font-mono my-0.5">
        {(scoreStr || '10').split(' ')[0]}
      </span>

      {/* Bottom: 1-Click Roll Buttons for Check and Save */}
      <div className="flex flex-col gap-1 w-full">
        {/* Check Button */}
        <button
          type="button"
          onClick={handleRollCheck}
          className="w-full py-0.5 px-1 rounded bg-[#161826] hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 text-[10px] font-mono font-bold cursor-pointer transition-colors flex items-center justify-between"
          title={`Бросить проверку характеристики ${name} (1d20${checkModStr})`}
        >
          <span className="text-[9px] text-slate-400 font-normal">Чек</span>
          <span>{checkModStr}</span>
        </button>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleRollSave}
          className={`w-full py-0.5 px-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors flex items-center justify-between border ${
            isProficient
              ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/50 shadow-xs'
              : 'bg-[#161826] hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border-slate-700/50'
          }`}
          title={`Бросить спасбросок ${name} (1d20${saveModStr})${
            isProficient ? ` (бонус мастерства: +${profBonus})` : ''
          }`}
        >
          <span className="text-[9px] text-slate-400 font-normal">Спас</span>
          <span className={isProficient ? 'text-indigo-200 font-black' : ''}>{saveModStr}</span>
        </button>
      </div>
    </div>
  );
};
