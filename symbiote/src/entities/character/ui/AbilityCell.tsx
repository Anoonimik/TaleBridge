import React from 'react';
import { taleSpireDriver, parseModifier } from '../../../shared';

interface AbilityCellProps {
  label: string;
  name: string;
  scoreStr: string;
  characterName: string;
}

export const AbilityCell = ({
  label,
  name,
  scoreStr,
  characterName,
}: AbilityCellProps) => {
  const modNum = parseModifier(scoreStr);
  const modFormatted = modNum >= 0 ? `+${modNum}` : `${modNum}`;

  const handleRoll = () => {
    taleSpireDriver.rollDice(`1d20${modFormatted}`, `${label} (${characterName})`);
  };

  return (
    <div
      onClick={handleRoll}
      className="bg-[#10111a] hover:bg-[#191c2b] border border-[#1f2233] hover:border-indigo-500/50 p-2 rounded flex flex-col items-center justify-center cursor-pointer transition-all shadow-xs group"
      title={`Бросок проверки ${name} (1d20${modFormatted})`}
    >
      <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-indigo-300">
        {label}
      </span>
      <span className="text-sm font-bold text-slate-100 my-0.5">{scoreStr || '10'}</span>
      <span className="text-[10px] font-mono text-emerald-400 group-hover:text-emerald-300 bg-emerald-500/10 px-1 rounded">
        {modFormatted}
      </span>
    </div>
  );
};
