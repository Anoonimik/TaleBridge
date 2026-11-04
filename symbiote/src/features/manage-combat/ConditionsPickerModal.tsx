import React, { useEffect } from 'react';
import { CONDITIONS } from '../../shared';
import { useCombatStore } from '../../shared';

interface ConditionsPickerModalProps {
  combatantId: string;
  onClose: () => void;
}

export const ConditionsPickerModal = ({
  combatantId,
  onClose,
}: ConditionsPickerModalProps) => {
  const { toggleCondition, setConditions, combatants } = useCombatStore();
  const combatant = combatants.find((c) => c.id === combatantId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!combatant) return null;

  const conditions = Array.isArray(combatant.conditions) ? combatant.conditions : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 bg-[#141622] border border-[#2d324a] rounded-xl w-full max-w-lg p-4 shadow-2xl flex flex-col gap-3 max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#262a3d]">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider truncate">
              Состояния (5e): <span className="text-amber-400 font-semibold">{combatant.name}</span>
            </h3>
            {conditions.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold shrink-0">
                {conditions.length} активн.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {conditions.length > 0 && (
              <button
                type="button"
                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer transition-colors"
                onClick={() => setConditions(combatant.id, [])}
                title="Снять все наложенные состояния"
              >
                Снять все
              </button>
            )}
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer transition-colors"
              onClick={onClose}
              title="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid of conditions */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 scrollbar-thin pr-1">
          {CONDITIONS.map((cond) => {
            const isApplied = conditions.includes(cond.name);

            return (
              <button
                key={cond.name}
                type="button"
                className={`p-2.5 rounded-lg text-left transition-all border cursor-pointer flex flex-col gap-1 relative active:scale-[0.99] ${
                  isApplied
                    ? 'shadow-[0_0_12px_rgba(99,102,241,0.25)] ring-1 ring-current'
                    : 'bg-[#10111a] border-[#1f2233] text-slate-300 hover:bg-[#181a28] hover:border-[#383d57]'
                }`}
                style={
                  isApplied
                    ? {
                        backgroundColor: `${cond.color}25`,
                        borderColor: cond.color,
                        color: '#ffffff',
                      }
                    : undefined
                }
                onClick={() => toggleCondition(combatant.id, cond.name)}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cond.color }}
                    />
                    <strong
                      className="text-xs font-bold truncate"
                      style={{ color: isApplied ? '#ffffff' : cond.color }}
                    >
                      {cond.label}
                    </strong>
                  </div>

                  {isApplied ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-black shadow-xs shrink-0 flex items-center gap-0.5">
                      ✓ АКТИВНО
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 uppercase font-mono shrink-0">
                      + выбрать
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 leading-snug m-0">
                  {cond.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-[#262a3d] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {conditions.length === 0
              ? 'Нажмите на состояние, чтобы наложить его'
              : `Выбрано состояний: ${conditions.length}`}
          </span>
          <button
            type="button"
            className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
            onClick={onClose}
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
