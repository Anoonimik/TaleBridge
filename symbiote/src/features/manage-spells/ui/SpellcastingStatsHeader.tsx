import React from 'react';
import { formatModifier } from '../../../shared/lib/text-utils';

interface SpellcastingStatsHeaderProps {
  ability: 'int' | 'wis' | 'cha';
  spellSaveDC: number;
  spellAttackBonus: number;
  abilityMod: number;
  onSetSpellcastingAbility: (ability: 'int' | 'wis' | 'cha') => void;
  onResetAllSpellSlots: () => void;
}

export const SpellcastingStatsHeader: React.FC<SpellcastingStatsHeaderProps> = ({
  ability,
  spellSaveDC,
  spellAttackBonus,
  abilityMod,
  onSetSpellcastingAbility,
  onResetAllSpellSlots,
}) => {
  return (
    <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Базовая характеристика:
          </span>
          <div className="flex items-center gap-1">
            {(['int', 'wis', 'cha'] as const).map((ab) => {
              const label = ab === 'int' ? 'ИНТ' : ab === 'wis' ? 'МУД' : 'ХАР';
              const isSelected = ability === ab;
              return (
                <button
                  key={ab}
                  type="button"
                  onClick={() => onSetSpellcastingAbility(ab)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[#10111a] text-slate-400 hover:text-slate-200 border border-[#262a3d]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onResetAllSpellSlots}
          className="px-2.5 py-1 rounded bg-[#10111a] hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-colors"
          title="Восстановить все потраченные ячейки заклинаний"
        >
          Восстановить ячейки
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Сл спасброска</span>
          <span className="text-base font-bold text-amber-300 font-mono mt-0.5">{spellSaveDC}</span>
          <span className="text-[9px] text-slate-500">8 + БМ + мод</span>
        </div>

        <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Бонус атаки</span>
          <span className="text-base font-bold text-indigo-300 font-mono mt-0.5">
            {formatModifier(spellAttackBonus)}
          </span>
          <span className="text-[9px] text-slate-500">БМ + мод</span>
        </div>

        <div className="bg-[#10111a] p-2 rounded border border-[#262a3d] text-center flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Модификатор</span>
          <span className="text-base font-bold text-slate-200 font-mono mt-0.5">
            {formatModifier(abilityMod)}
          </span>
          <span className="text-[9px] text-slate-500 uppercase">{ability}</span>
        </div>
      </div>
    </div>
  );
};
