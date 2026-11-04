import React from 'react';
import { AbilityScores, parseModifier, formatModifier } from '../../../shared';

interface NoteAbilityGridProps {
  stats: AbilityScores;
  onRollStat: (label: string, name: string, score: string) => void;
}

const ABILITY_KEYS = [
  { key: 'str', label: 'СИЛ', name: 'Сила' },
  { key: 'dex', label: 'ЛОВ', name: 'Ловкость' },
  { key: 'con', label: 'ТЕЛ', name: 'Телосложение' },
  { key: 'int', label: 'ИНТ', name: 'Интеллект' },
  { key: 'wis', label: 'МУД', name: 'Мудрость' },
  { key: 'cha', label: 'ХАР', name: 'Харизма' },
] as const;

export const NoteAbilityGrid: React.FC<NoteAbilityGridProps> = ({ stats, onRollStat }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
        Характеристики:
      </h4>
      <div className="grid grid-cols-6 gap-1.5">
        {ABILITY_KEYS.map(({ key, label, name }) => {
          const val = stats[key] || '10';
          const mod = parseModifier(val);
          const modStr = formatModifier(mod);

          return (
            <button
              type="button"
              key={key}
              onClick={() => onRollStat(label, name, val)}
              className="bg-[#10111a] hover:bg-[#181b29] border border-[#1f2233] hover:border-amber-500/40 p-2 rounded flex flex-col items-center justify-center cursor-pointer transition-all group"
              title={`Бросок проверки ${name} (1d20${modStr})`}
            >
              <span className="text-xs uppercase font-bold text-slate-400 group-hover:text-amber-300">
                {label}
              </span>
              <span className="text-base font-bold text-slate-100 my-0.5">
                {val.split(' ')[0]}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1 rounded">
                {modStr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
