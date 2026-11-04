import React from 'react';
import { CONDITIONS_DND5E } from '../../constants';
import { useCombatStore } from '../../store/useCombatStore';

interface Props {
  combatantId: string;
  onClose: () => void;
}

export const ConditionsPickerModal = ({ combatantId, onClose }: Props) => {
  const { combatants, toggleCondition } = useCombatStore();
  const combatant = combatants.find((c) => c.id === combatantId);

  if (!combatant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] max-h-[85vh] bg-[#161826] border border-[#2d3348] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#121420]">
          <span className="text-sm font-bold text-white tracking-wide">
            Состояния и дебаффы: <strong className="text-indigo-400">{combatant.name}</strong>
          </span>
          <button
            type="button"
            className="text-slate-400 hover:text-white text-base leading-none cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-3 flex flex-col gap-2">
          {CONDITIONS_DND5E.map((cond) => {
            const isActive = combatant.conditions.includes(cond.id);
            return (
              <div
                key={cond.id}
                className={`p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-xs'
                    : 'bg-[#10121d] border-white/5 hover:border-white/15'
                }`}
                onClick={() => toggleCondition(combatantId, cond.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cond.color }} />
                    <span className="text-xs font-bold text-white tracking-wide">{cond.name}</span>
                    <span className="text-[10px] text-slate-400">({cond.en})</span>
                  </div>
                  {isActive && (
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                      АКТИВНО ✓
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 leading-snug pl-4.5">{cond.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
