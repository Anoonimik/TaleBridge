import React from 'react';
import { Combatant, CONDITIONS } from '../../shared';
import { useCombatStore } from '../../shared';

interface ConditionsPickerModalProps {
  combatant: Combatant;
  onClose: () => void;
}

export const ConditionsPickerModal = ({
  combatant,
  onClose,
}: ConditionsPickerModalProps) => {
  const { toggleCondition } = useCombatStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#141622] border border-[#262a3d] rounded-xl w-full max-w-md p-4 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-[#262a3d]">
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Состояния (5e): <span className="text-amber-400">{combatant.name}</span>
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1.5 scrollbar-thin pr-1">
          {CONDITIONS.map((cond) => {
            const isApplied = combatant.conditions.includes(cond.name);
            return (
              <button
                key={cond.name}
                type="button"
                className={`p-2 rounded text-left transition-all border cursor-pointer flex flex-col gap-0.5 ${
                  isApplied
                    ? 'border-indigo-500 bg-indigo-500/20 text-white font-semibold ring-1 ring-indigo-500/40'
                    : 'bg-[#10111a] border-[#1f2233] text-slate-300 hover:bg-[#181a29]'
                }`}
                onClick={() => toggleCondition(combatant.id, cond.name)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: cond.color }}>{cond.label}</span>
                  {isApplied && <span className="text-emerald-400 font-bold">✓</span>}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight m-0">{cond.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#262a3d] flex justify-end">
          <button
            type="button"
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
            onClick={onClose}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
