import React from 'react';
import { SpellSlot } from '../../../shared';

interface SpellSlotsMatrixProps {
  spellSlots: SpellSlot[];
  onUseSpellSlot: (level: number) => void;
  onRegainSpellSlot: (level: number) => void;
  onAdjustMaxSlots: (level: number, delta: number) => void;
}

export const SpellSlotsMatrix: React.FC<SpellSlotsMatrixProps> = ({
  spellSlots,
  onUseSpellSlot,
  onRegainSpellSlot,
  onAdjustMaxSlots,
}) => {
  return (
    <div className="bg-[#141622] p-3 rounded-lg border border-[#262a3d] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          Ячейки заклинаний
        </h4>
        <span className="text-[10px] text-slate-400">
          Клик по ячейке — потратить / вернуть
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {spellSlots
          .filter((s) => s.max > 0 || s.level <= 5)
          .map((slot) => {
            const bubbles = Array.from({ length: slot.max });
            return (
              <div
                key={slot.level}
                className="bg-[#10111a] px-2.5 py-1.5 rounded border border-[#262a3d] flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-indigo-300 font-mono w-4">
                    {slot.level}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">круг</span>
                </div>

                {/* Bubbles */}
                <div className="flex items-center gap-1 flex-wrap flex-1 justify-center">
                  {slot.max === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">нет ячеек</span>
                  ) : (
                    bubbles.map((_, bIdx) => {
                      const isAvailable = bIdx < slot.current;
                      return (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            if (isAvailable) {
                              onUseSpellSlot(slot.level);
                            } else {
                              onRegainSpellSlot(slot.level);
                            }
                          }}
                          className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                            isAvailable
                              ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)] hover:bg-indigo-400'
                              : 'bg-transparent border-slate-600 hover:border-slate-400'
                          }`}
                          title={isAvailable ? 'Потратить ячейку' : 'Восстановить ячейку'}
                        />
                      );
                    })
                  )}
                </div>

                {/* Max controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAdjustMaxSlots(slot.level, -1)}
                    disabled={slot.max <= 0}
                    className="w-4 h-4 rounded flex items-center justify-center bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-mono cursor-pointer"
                    title="Уменьшить макс. ячеек"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 w-3 text-center">
                    {slot.max}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustMaxSlots(slot.level, 1)}
                    className="w-4 h-4 rounded flex items-center justify-center bg-[#1a1d2d] hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-mono cursor-pointer"
                    title="Увеличить макс. ячеек"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
