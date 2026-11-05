import { useShallow } from 'zustand/react/shallow';
import React, { useState } from 'react';
import { taleSpireDriver } from '../../shared/api/talespire';
import { useAppStore } from '../../shared/lib/useAppStore';

export const QuickDiceBar = () => {
  const { diceSecret, setDiceSecret } = useAppStore(
    useShallow((s) => ({ diceSecret: s.diceSecret, setDiceSecret: s.setDiceSecret })),
  );
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
          className={`px-2.5 py-0.5 rounded text-xs font-semibold border cursor-pointer transition-colors flex items-center gap-1 ${
            diceSecret
              ? 'bg-purple-600/25 text-purple-200 border-purple-500/50 hover:bg-purple-600/35 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
              : 'bg-amber-500/20 text-amber-200 border-amber-500/50 hover:bg-amber-500/30'
          }`}
          onClick={() => setDiceSecret(!diceSecret)}
          title={
            diceSecret
              ? 'Броски Мастера: Скрытые (GM-лоток). Нажмите для переключения в открытые'
              : 'Броски Мастера: Открытые (общий лоток). Нажмите для переключения в скрытые'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              diceSecret ? 'bg-purple-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{diceSecret ? 'Скрытно' : 'В открытую'}</span>
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
