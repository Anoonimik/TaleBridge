import React, { useState } from 'react';

interface ApplyDamageControlProps {
  currentHp: number;
  maxHp: number;
  onApplyHpDelta: (delta: number) => void;
}

export const ApplyDamageControl = ({
  currentHp,
  maxHp,
  onApplyHpDelta,
}: ApplyDamageControlProps) => {
  const [customVal, setCustomVal] = useState('');

  const hpPercent = Math.min(100, Math.max(0, Math.round((currentHp / (maxHp || 1)) * 100)));

  let barColor = 'bg-emerald-500';
  if (hpPercent <= 25) barColor = 'bg-rose-500';
  else if (hpPercent <= 50) barColor = 'bg-amber-500';

  const handleApply = (isDamage: boolean) => {
    const val = parseInt(customVal, 10);
    if (!isNaN(val) && val > 0) {
      onApplyHpDelta(isDamage ? -val : val);
      setCustomVal('');
    }
  };

  return (
    <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Здоровье (ХП)
        </span>
        <span className="font-mono text-sm font-bold text-slate-100">
          <span className="text-emerald-400">{currentHp}</span> / {maxHp}
        </span>
      </div>

      <div className="w-full h-2.5 bg-[#10111a] rounded-full overflow-hidden border border-[#1f2233]">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-1 pt-1 flex-wrap gap-y-1.5">
        <div className="flex items-center gap-1">
          {[-5, -1].map((val) => (
            <button
              key={val}
              type="button"
              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded text-xs font-mono font-bold cursor-pointer transition-colors"
              onClick={() => onApplyHpDelta(val)}
            >
              {val}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="ХП"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            className="w-16 px-2 py-1 bg-[#10111a] border border-[#262a3d] rounded text-center text-xs text-slate-200 focus:outline-none"
          />
          <button
            type="button"
            className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded text-xs font-bold cursor-pointer"
            onClick={() => handleApply(true)}
            title="Нанести урон"
          >
            Урон
          </button>
          <button
            type="button"
            className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded text-xs font-bold cursor-pointer"
            onClick={() => handleApply(false)}
            title="Восстановить здоровье"
          >
            Хил
          </button>
        </div>

        <div className="flex items-center gap-1">
          {[1, 5].map((val) => (
            <button
              key={val}
              type="button"
              className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded text-xs font-mono font-bold cursor-pointer transition-colors"
              onClick={() => onApplyHpDelta(val)}
            >
              +{val}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
