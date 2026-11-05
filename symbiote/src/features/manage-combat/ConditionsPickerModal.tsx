import { useShallow } from 'zustand/react/shallow';
import React from 'react';
import { CONDITIONS } from '../../shared/config/constants';
import { useCombatStore } from '../../entities/combatant/model/store';
import { ModalShell } from '../../shared/ui/ModalShell';

interface ConditionsPickerModalProps {
  combatantId: string;
  onClose: () => void;
}

export const ConditionsPickerModal = ({ combatantId, onClose }: ConditionsPickerModalProps) => {
  const { toggleCondition, setConditions, combatants } = useCombatStore(
    useShallow((s) => ({
      toggleCondition: s.toggleCondition,
      setConditions: s.setConditions,
      combatants: s.combatants,
    })),
  );
  const combatant = combatants.find((c) => c.id === combatantId);

  if (!combatant) return null;

  const conditions = Array.isArray(combatant.conditions) ? combatant.conditions : [];

  return (
    <ModalShell
      isOpen={Boolean(combatant)}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span>Состояния (5e):</span>
          <span className="text-amber-400 font-semibold truncate">{combatant.name}</span>
          {conditions.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold shrink-0">
              {conditions.length} активн.
            </span>
          )}
        </div>
      }
      maxWidthClass="max-w-lg"
      maxHeightClass="max-h-[88vh]"
      headerRight={
        conditions.length > 0 ? (
          <button
            type="button"
            className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer transition-colors mr-1"
            onClick={() => setConditions(combatant.id, [])}
            title="Снять все наложенные состояния"
          >
            Снять все
          </button>
        ) : undefined
      }
    >
      <div className="p-4 flex flex-col gap-3 overflow-hidden">
        {/* Conditions grid */}
        <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[60vh] pr-1 scrollbar-thin">
          {CONDITIONS.map((cond) => {
            const isActive = conditions.includes(cond.name);
            return (
              <button
                key={cond.name}
                type="button"
                onClick={() => toggleCondition(combatant.id, cond.name)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500/60 shadow-sm shadow-amber-500/10'
                    : 'bg-[#10111a] hover:bg-[#181a29] border-[#262a3d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cond.color }}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isActive ? 'text-amber-300' : 'text-slate-200'
                      }`}
                    >
                      {cond.label}
                    </span>
                  </div>
                  {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight m-0 line-clamp-2">
                  {cond.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer / Helper Info */}
        <div className="flex items-center justify-between pt-2 border-t border-[#262a3d] text-[11px] text-slate-500 shrink-0">
          <span>Клик переключает активное состояние существа</span>
          <button
            type="button"
            className="px-3 py-1 rounded bg-[#10111a] hover:bg-[#1a1d2d] border border-[#262a3d] text-slate-300 text-xs cursor-pointer transition-colors"
            onClick={onClose}
          >
            Готово
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
