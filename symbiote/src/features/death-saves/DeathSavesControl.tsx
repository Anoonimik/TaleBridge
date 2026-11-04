import React, { useState } from 'react';
import { DeathSaves } from '../../shared';

interface DeathSavesControlProps {
  hp: number;
  deathSaves: DeathSaves;
  onRollDeathSave: () => void;
  onUpdateDeathSaves: (successes: number, failures: number) => void;
  onResetDeathSaves: () => void;
}

export const DeathSavesControl = ({
  hp,
  deathSaves,
  onRollDeathSave,
  onUpdateDeathSaves,
  onResetDeathSaves,
}: DeathSavesControlProps) => {
  const [isManualExpanded, setIsManualExpanded] = useState(false);

  const isDying = hp <= 0;
  const successes = deathSaves?.successes || 0;
  const failures = deathSaves?.failures || 0;

  const isStable = successes >= 3;
  const isDead = failures >= 3;

  // Toggle individual success bubble
  const handleToggleSuccess = (idx: number) => {
    // idx is 1, 2, or 3
    if (successes === idx) {
      onUpdateDeathSaves(idx - 1, failures);
    } else {
      onUpdateDeathSaves(idx, failures);
    }
  };

  // Toggle individual failure bubble
  const handleToggleFailure = (idx: number) => {
    // idx is 1, 2, or 3
    if (failures === idx) {
      onUpdateDeathSaves(successes, idx - 1);
    } else {
      onUpdateDeathSaves(successes, idx);
    }
  };

  // If not dying and not expanded, show compact summary
  if (!isDying && !isManualExpanded && successes === 0 && failures === 0) {
    return (
      <button
        type="button"
        onClick={() => setIsManualExpanded(true)}
        className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer self-start transition-colors"
      >
        ▾ Спасброски от смерти
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 flex flex-col gap-2.5 transition-all shadow-md ${
        isDead
          ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
          : isStable
          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
          : isDying
          ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-in fade-in'
          : 'bg-[#141622] border-[#262a3d]'
      }`}
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isDead
                ? 'bg-rose-500'
                : isStable
                ? 'bg-emerald-400'
                : isDying
                ? 'bg-rose-500 animate-ping'
                : 'bg-slate-400'
            }`}
          />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            {isDead
              ? 'Персонаж погиб (3 провала)'
              : isStable
              ? 'Персонаж стабилизирован'
              : isDying
              ? 'Персонаж при смерти (0 ХП) — Спасброски'
              : 'Спасброски от смерти'}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {(successes > 0 || failures > 0) && (
            <button
              type="button"
              className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              onClick={onResetDeathSaves}
            >
              Сброс
            </button>
          )}
          {!isDying && (
            <button
              type="button"
              className="text-slate-500 hover:text-slate-300 text-xs cursor-pointer ml-1"
              onClick={() => setIsManualExpanded(false)}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Interactive Bubbles */}
      <div className="grid grid-cols-2 gap-3 bg-[#10111a] p-2.5 rounded border border-[#1f2233]">
        {/* Successes */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase font-bold text-emerald-400">
            Успехи ({successes}/3)
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => {
              const active = successes >= num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleToggleSuccess(num)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                    active
                      ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                      : 'border-[#33394f] text-slate-600 hover:border-emerald-500/40'
                  }`}
                  title={`Отметить ${num}-й успех`}
                >
                  {active ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Failures */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase font-bold text-rose-400">
            Провалы ({failures}/3)
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => {
              const active = failures >= num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleToggleFailure(num)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                    active
                      ? 'bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : 'border-[#33394f] text-slate-600 hover:border-rose-500/40'
                  }`}
                  title={`Отметить ${num}-й провал`}
                >
                  {active ? '✕' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roll Action Button */}
      {!isDead && !isStable && (
        <button
          type="button"
          onClick={onRollDeathSave}
          className="w-full py-2 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs rounded border border-rose-500/40 shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <span>Бросить спасбросок от смерти (1d20)</span>
        </button>
      )}

      {/* Rule tip */}
      <div className="text-[10px] text-slate-400 leading-tight">
        Правило 5e: 10+ успех, 1-9 провал, 20 восстанавливает 1 ХП, 1 дает сразу 2 провала.
      </div>
    </div>
  );
};
