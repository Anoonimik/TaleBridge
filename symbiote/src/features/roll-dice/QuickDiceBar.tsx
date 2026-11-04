import React, { useState } from 'react';
import { taleSpireDriver, useAppStore } from '../../shared';

export const QuickDiceBar = () => {
  const { diceSecret, setDiceSecret } = useAppStore();
  const [customFormula, setCustomFormula] = useState('');

  const handleRoll = (formula: string, label: string) => {
    taleSpireDriver.rollDice(formula, label);
  };

  const handleCustomRoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFormula.trim()) return;
    taleSpireDriver.rollDice(customFormula.trim(), 'Бросок');
    setCustomFormula('');
  };

  return (
    <div className="bg-[#141622] p-2.5 rounded-lg border border-[#262a3d] flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Быстрые кости (3D Dice)
        </span>
        <button
          type="button"
          className={`px-2.5 py-0.5 rounded text-xs font-bold border cursor-pointer transition-colors ${
            diceSecret
              ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
              : 'bg-[#10111a] text-slate-400 border-[#262a3d] hover:text-white'
          }`}
          onClick={() => setDiceSecret(!diceSecret)}
          title="Скрытый бросок (видит только ГМ)"
        >
          {diceSecret ? 'ГМ (Скрытно)' : 'Публично'}
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {['d20', 'd12', 'd10', 'd8', 'd6', 'd4'].map((d) => (
          <button
            key={d}
            type="button"
            className="py-1.5 rounded bg-[#10111a] hover:bg-[#1f2233] text-amber-300 font-mono text-xs font-bold border border-[#262a3d] hover:border-amber-500/40 cursor-pointer transition-colors text-center"
            onClick={() => handleRoll(`1${d}`, `Бросок 1${d}`)}
          >
            1{d}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex-1 py-1.5 rounded bg-[#10111a] hover:bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold border border-emerald-500/30 cursor-pointer transition-colors"
          onClick={() => handleRoll('2d20kh1', 'Преимущество')}
        >
          Преимущество
        </button>
        <button
          type="button"
          className="flex-1 py-1.5 rounded bg-[#10111a] hover:bg-rose-500/20 text-rose-300 font-mono text-xs font-semibold border border-rose-500/30 cursor-pointer transition-colors"
          onClick={() => handleRoll('2d20kl1', 'Помеха')}
        >
          Помеха
        </button>
      </div>

      <form onSubmit={handleCustomRoll} className="flex items-center gap-1 pt-0.5">
        <input
          type="text"
          placeholder="Формула: 2d6+4, 1d20+7..."
          value={customFormula}
          onChange={(e) => setCustomFormula(e.target.value)}
          className="flex-1 px-2.5 py-1 bg-[#10111a] border border-[#262a3d] rounded text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-medium cursor-pointer"
        >
          Бросить
        </button>
      </form>
    </div>
  );
};
