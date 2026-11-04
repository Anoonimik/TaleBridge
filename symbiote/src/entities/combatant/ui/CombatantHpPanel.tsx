import React, { useState } from 'react';
import { getHpColorClass } from '../../../shared';

interface CombatantHpPanelProps {
  combatantId: string;
  hp: number;
  maxHp: number;
  ac?: number;
  onUpdateHp: (id: string, delta: number) => void;
}

export const CombatantHpPanel: React.FC<CombatantHpPanelProps> = ({
  combatantId,
  hp,
  maxHp,
  ac = 10,
  onUpdateHp,
}) => {
  const [customHpVal, setCustomHpVal] = useState('');

  const hpPercent = Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)));
  const hpColor = getHpColorClass(hp, maxHp);

  const handleApplyCustomHp = (isDamage: boolean) => {
    const val = parseInt(customHpVal, 10);
    if (!isNaN(val) && val > 0) {
      onUpdateHp(combatantId, isDamage ? -val : val);
      setCustomHpVal('');
    }
  };

  return (
    <div className="flex flex-col gap-1.5 bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 uppercase font-bold">ХП</span>
          <strong className="text-slate-100 font-mono text-sm">
            {hp} / {maxHp}
          </strong>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 uppercase font-bold">КД</span>
          <strong className="text-slate-200 text-sm font-mono">{ac}</strong>
        </div>
      </div>

      <div className="w-full h-2 bg-[#1a1d2d] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${hpColor}`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
        <div className="flex items-center gap-1">
          {[-5, -1].map((val) => (
            <button
              key={val}
              type="button"
              className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded text-xs font-mono cursor-pointer transition-colors"
              onClick={() => onUpdateHp(combatantId, val)}
            >
              {val}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="Урон"
            value={customHpVal}
            onChange={(e) => setCustomHpVal(e.target.value)}
            className="w-14 px-1.5 py-0.5 bg-[#141622] border border-[#262a3d] rounded text-center text-xs text-slate-200 focus:outline-none"
          />
          <button
            type="button"
            className="px-2 py-0.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded text-xs cursor-pointer font-bold"
            onClick={() => handleApplyCustomHp(true)}
            title="Нанести урон"
          >
            -
          </button>
          <button
            type="button"
            className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded text-xs cursor-pointer font-bold"
            onClick={() => handleApplyCustomHp(false)}
            title="Восстановить здоровье"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[1, 5].map((val) => (
            <button
              key={val}
              type="button"
              className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded text-xs font-mono cursor-pointer transition-colors"
              onClick={() => onUpdateHp(combatantId, val)}
            >
              +{val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
