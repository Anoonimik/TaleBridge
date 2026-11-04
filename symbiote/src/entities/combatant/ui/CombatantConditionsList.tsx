import React from 'react';
import { CONDITIONS } from '../../../shared';

interface CombatantConditionsListProps {
  combatantId: string;
  conditions: string[];
  onOpenConditions: (id: string) => void;
  onToggleCondition: (id: string, conditionName: string) => void;
}

export const CombatantConditionsList: React.FC<CombatantConditionsListProps> = ({
  combatantId,
  conditions,
  onOpenConditions,
  onToggleCondition,
}) => {
  return (
    <>
      {/* Conditions list and picker button */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        <button
          type="button"
          className="px-2 py-0.5 bg-[#1a1d2d] hover:bg-[#25293d] text-slate-300 border border-[#262a3d] rounded text-xs cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
          onClick={() => onOpenConditions(combatantId)}
          title="Добавить или снять состояния (5e)"
        >
          <span>+ Состояние</span>
          {conditions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
              {conditions.length}
            </span>
          )}
        </button>

        {conditions.map((condName) => {
          const meta = CONDITIONS.find((c) => c.name === condName);
          return (
            <span
              key={condName}
              className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1 border shrink-0"
              style={{
                backgroundColor: `${meta?.color || '#6366f1'}20`,
                borderColor: `${meta?.color || '#6366f1'}50`,
                color: meta?.color || '#e0e7ff',
              }}
              title={meta?.desc}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: meta?.color || '#6366f1' }}
              />
              <span>{meta?.label || condName}</span>
              <button
                type="button"
                className="text-slate-400 hover:text-white cursor-pointer ml-0.5"
                onClick={() => onToggleCondition(combatantId, condName)}
                title="Снять состояние"
              >
                ✕
              </button>
            </span>
          );
        })}
      </div>

      {/* Conditions rules explanations */}
      {conditions.length > 0 && (
        <div className="flex flex-col gap-1.5 bg-[#0e1018] rounded-md border border-[#222638] p-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Эффекты состояний ({conditions.length}):</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {conditions.map((condName) => {
              const meta = CONDITIONS.find((c) => c.name === condName);
              if (!meta) return null;
              return (
                <div
                  key={condName}
                  className="flex items-start gap-2 text-xs bg-[#141622] rounded p-1.5 border border-[#1f2233]"
                >
                  <span
                    className="px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 flex items-center gap-1 border"
                    style={{
                      backgroundColor: `${meta.color}20`,
                      borderColor: `${meta.color}60`,
                      color: meta.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span>{meta.label}</span>
                  </span>
                  <span className="text-slate-300 text-[11px] leading-snug flex-1">
                    {meta.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
